<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

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
  dealerTotalText,
  playerTotalText,
  playerBust,
  dealerBust,
  announcement,
  canAfford,
  chipsText,
  focusPrimary,
  perform,
  deal,
  again,
} = useBlackjackRound()

onMounted(focusPrimary)
</script>

<template>
  <section class="bar" :aria-label="t('blackjack.title')" :aria-busy="blackjack.busy">
    <div class="row">
      <template v-if="isBetting">
        <div class="datum">
          <span class="label">{{ t('blackjack.chooseBet') }}</span>
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
        </div>
        <span class="divider" aria-hidden="true"></span>
        <button
          ref="focusTarget"
          type="button"
          class="action primary"
          :disabled="blackjack.busy || !canAfford(activeBet)"
          @click="deal"
        >
          {{ blackjack.busy ? t('blackjack.dealing') : t('blackjack.deal', { chips: activeBet.chips }) }}
        </button>
      </template>

      <template v-else>
        <div class="datum">
          <span class="label">{{ t('blackjack.dealer') }}</span>
          <span class="value" :class="{ bust: dealerBust }">{{ dealerTotalText }}</span>
        </div>
        <div class="datum">
          <span class="label">{{ t('blackjack.you') }}</span>
          <span class="value" :class="{ bust: playerBust }">{{ playerTotalText }}</span>
        </div>
        <div class="datum">
          <span class="label">{{ t('blackjack.bet') }}</span>
          <span class="value gold">{{ chipsText(hand.bet) }}</span>
        </div>
        <span class="divider" aria-hidden="true"></span>

        <template v-if="blackjack.playing">
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
        </template>
        <template v-else>
          <div class="datum">
            <span class="result" :class="outcomeClass">{{ outcomeText }}</span>
            <span v-if="payoutText" class="value gold">{{ payoutText }}</span>
          </div>
          <button
            ref="focusTarget"
            type="button"
            class="action primary"
            :disabled="blackjack.busy"
            @click="again"
          >
            {{ t('blackjack.again') }}
          </button>
        </template>
      </template>
    </div>

    <p v-if="blackjack.error" class="failure" role="alert">{{ message(blackjack.error) }}</p>
    <p class="hint">{{ t('blackjack.standUpHint') }}</p>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.bar {
  position: fixed;
  left: 50%;
  bottom: clamp(16px, 4vh, 40px);
  z-index: 5;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: max-content;
  max-width: calc(100vw - 32px);
  box-sizing: border-box;
  padding: 14px 18px 10px 26px;
  background: rgba(11, 21, 20, 0.88);
  border: 1px solid rgba(201, 164, 92, 0.45);
  border-radius: 2px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
  animation: rise var(--duracion-media) ease-out;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px 26px;
}

.datum {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.label {
  font-family: var(--f-ui);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--laton);
}

.value {
  font-family: var(--f-mono);
  font-size: 18px;
  font-weight: 500;
  color: var(--marfil);
}

.value.gold {
  color: var(--oro);
}

.value.bust,
.result.lost {
  color: #d9776f;
}

.result {
  font-family: var(--f-titulo);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
}

.result.won {
  color: var(--oro);
}

.result.tied {
  color: var(--marfil);
}

.divider {
  width: 1px;
  height: 40px;
  background: var(--linea);
}

.bet-chips {
  display: flex;
  gap: 10px;
}

.bet-chip {
  width: 48px;
  height: 48px;
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

.action {
  min-width: 44px;
  min-height: 50px;
  padding: 0 22px;
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

.bet-chip:focus-visible,
.action:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 2px;
}

.failure {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 13px;
  color: #d9776f;
}

.hint {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--humo);
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

@keyframes rise {
  from {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    animation: none;
  }

  .bet-chip {
    transition: none;
  }
}
</style>
