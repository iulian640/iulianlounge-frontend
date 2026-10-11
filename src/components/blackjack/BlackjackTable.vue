<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import BlackjackHand from './BlackjackHand.vue'
import { useBlackjackRound } from '@/composables/useBlackjackRound'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useBlackjackStore } from '@/stores/blackjack'

const { t } = useI18n()
const { message } = useErrorMessage()
const blackjack = useBlackjackStore()
const {
  selectedCode,
  focusTarget,
  hand,
  options,
  activeBet,
  isBetting,
  outcomeClass,
  outcomeText,
  payoutText,
  announcement,
  canAfford,
  chipsText,
  perform,
  deal,
  again,
} = useBlackjackRound()

const hasHiddenCard = computed(() => blackjack.playing)

onMounted(() => {
  blackjack.load()
})
</script>

<template>
  <section class="table" :aria-label="t('blackjack.title')" :aria-busy="blackjack.busy">
    <template v-if="isBetting">
      <p class="prompt">{{ t('blackjack.chooseBet') }}</p>
      <div class="bet-chips" role="group" :aria-label="t('blackjack.chooseBet')">
        <button
          v-for="bet in options"
          :key="bet.code"
          type="button"
          class="bet-chip"
          :class="{ chosen: bet.code === activeBet.code }"
          :aria-pressed="bet.code === activeBet.code"
          :aria-label="`${t('blackjack.bet')} ${chipsText(bet.chips)}`"
          :disabled="blackjack.busy || !canAfford(bet)"
          @click="selectedCode = bet.code"
        >
          {{ bet.chips }}
        </button>
      </div>
      <button
        ref="focusTarget"
        type="button"
        class="action primary"
        :disabled="blackjack.busy || !canAfford(activeBet)"
        @click="deal"
      >
        {{ blackjack.busy ? t('blackjack.dealing') : t('blackjack.deal', { chips: activeBet.chips }) }}
      </button>
      <p class="rules">{{ t('blackjack.rules') }}</p>
    </template>

    <template v-else>
      <BlackjackHand
        :label="t('blackjack.dealer')"
        :cards="hand.dealerCards"
        :total="hand.dealerTotal"
        :has-hidden-card="hasHiddenCard"
      />

      <div v-if="blackjack.finished" class="result-line">
        <span class="result" :class="outcomeClass">{{ outcomeText }}</span>
        <span v-if="payoutText" class="payout">{{ payoutText }}</span>
      </div>
      <div v-else class="result-line">
        <span class="stake-label">{{ t('blackjack.bet') }}</span>
        <span class="payout">{{ chipsText(hand.bet) }}</span>
      </div>

      <BlackjackHand
        :label="t('blackjack.you')"
        :cards="hand.playerCards"
        :total="hand.playerTotal"
      />

      <div v-if="blackjack.playing" class="actions">
        <button
          ref="focusTarget"
          type="button"
          class="action primary"
          :disabled="blackjack.busy"
          @click="perform(blackjack.hit)"
        >
          {{ t('blackjack.hit') }}
        </button>
        <button
          type="button"
          class="action"
          :disabled="blackjack.busy"
          @click="perform(blackjack.stand)"
        >
          {{ t('blackjack.stand') }}
        </button>
      </div>
      <button
        v-else
        ref="focusTarget"
        type="button"
        class="action primary"
        :disabled="blackjack.busy"
        @click="again"
      >
        {{ t('blackjack.again') }}
      </button>
    </template>

    <p v-if="blackjack.error" class="failure" role="alert">{{ message(blackjack.error) }}</p>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.table {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  background: radial-gradient(ellipse at 50% 40%, #1f4034 0%, #132a22 70%, #0e1f1a 100%);
  border: 1px solid rgba(201, 164, 92, 0.35);
  border-radius: 2px;
}

.prompt,
.rules {
  margin: 0;
  text-align: center;
  font-family: var(--f-ui);
  color: var(--humo);
}

.prompt {
  font-size: 16px;
}

.rules {
  font-size: 12px;
}

.bet-chips {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.bet-chip {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 2.5px dashed var(--laton);
  border-radius: 50%;
  background: var(--fieltro);
  font-family: var(--f-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--oro);
  cursor: pointer;
  transition:
    background var(--duracion-corta),
    color var(--duracion-corta);
}

.bet-chip.chosen {
  border-style: solid;
  background: var(--laton);
  color: var(--medianoche);
}

.bet-chip:disabled {
  cursor: default;
  opacity: 0.35;
}

.bet-chip:focus-visible,
.action:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 2px;
}

.result-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--linea-suave);
  border-bottom: 1px solid var(--linea-suave);
}

.result {
  font-family: var(--f-titulo);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
}

.result.won {
  color: var(--oro);
}

.result.lost {
  color: #d9776f;
}

.result.tied {
  color: var(--marfil);
}

.stake-label {
  font-family: var(--f-ui);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--laton);
}

.payout {
  font-family: var(--f-mono);
  font-size: 20px;
  color: var(--oro);
}

.actions {
  display: flex;
  gap: 12px;
}

.action {
  flex: 1;
  min-height: 50px;
  padding: 0 18px;
  border: 1px solid rgba(201, 164, 92, 0.6);
  border-radius: 2px;
  background: transparent;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--oro);
  cursor: pointer;
}

.action.primary {
  border: 0;
  background: linear-gradient(180deg, #ecd497, #c9a45c);
  color: var(--medianoche);
}

.action:hover:not(:disabled) {
  filter: brightness(1.1);
}

.action:disabled {
  cursor: default;
  opacity: 0.45;
}

.failure {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 13px;
  color: #d9776f;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .bet-chip {
    transition: none;
  }
}
</style>
