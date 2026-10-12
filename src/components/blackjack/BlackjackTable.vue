<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import BlackjackHand from './BlackjackHand.vue'
import BarmanFigure from '@/components/bar/BarmanFigure.vue'
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
    <div class="croupier">
      <BarmanFigure croupier class="figure" />
      <div class="bubble">
        <p v-if="isBetting" class="prompt">{{ t('blackjack.chooseBet') }}</p>
        <div v-else-if="blackjack.finished" class="result-line">
          <span class="result" :class="outcomeClass">{{ outcomeText }}</span>
          <span v-if="payoutText" class="payout">{{ payoutText }}</span>
        </div>
        <p v-else class="turn">{{ t('blackjack.turn', { total: hand.playerTotal }) }}</p>
      </div>
    </div>

    <div class="felt">
      <template v-if="isBetting">
        <div class="spots" aria-hidden="true"><span class="spot"></span><span class="spot"></span></div>
        <p class="felt-mark" aria-hidden="true">IULIAN'S</p>
        <div class="spots" aria-hidden="true"><span class="spot"></span><span class="spot"></span></div>
      </template>
      <template v-else>
        <BlackjackHand
          :label="t('blackjack.dealer')"
          :cards="hand.dealerCards"
          :total="hand.dealerTotal"
          :has-hidden-card="hasHiddenCard"
        />
        <div v-if="blackjack.playing" class="result-line stake">
          <span class="stake-label">{{ t('blackjack.bet') }}</span>
          <span class="payout">{{ chipsText(hand.bet) }}</span>
        </div>
        <BlackjackHand
          :label="t('blackjack.you')"
          :cards="hand.playerCards"
          :total="hand.playerTotal"
        />
      </template>
    </div>

    <div class="tray">
      <template v-if="isBetting">
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
      </template>
      <div v-else-if="blackjack.playing" class="actions">
        <p class="tray-stake" aria-hidden="true">
          <span>{{ t('blackjack.bet') }}</span>
          <span class="tray-stake-value">{{ chipsText(hand.bet) }}</span>
        </p>
        <button
          ref="focusTarget"
          type="button"
          class="action primary"
          :disabled="blackjack.busy"
          @click="perform(blackjack.hit)"
        >
          {{ t('blackjack.hit') }}
        </button>
        <button type="button" class="action" :disabled="blackjack.busy" @click="perform(blackjack.stand)">
          {{ t('blackjack.stand') }}
        </button>
      </div>
      <button v-else ref="focusTarget" type="button" class="action primary" :disabled="blackjack.busy" @click="again">
        {{ t('blackjack.again') }}
      </button>
      <p v-if="blackjack.error" class="failure" role="alert">{{ message(blackjack.error) }}</p>
    </div>

    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.table {
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 4px 0 0;
}

.croupier {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 136px;
  padding: 0 16px 0 calc(16px + var(--croupier-inset, 0px));
}

.figure {
  flex: none;
  width: 104px;
  height: 130px;
  margin-bottom: -18px;
}

.bubble {
  position: relative;
  flex: 1;
  align-self: center;
  min-height: 52px;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: var(--marfil);
  color: var(--medianoche);
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
}

.bubble::after {
  content: '';
  position: absolute;
  left: -12px;
  bottom: 10px;
  width: 14px;
  height: 12px;
  background: var(--marfil);
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}

.prompt,
.turn {
  margin: 0;
  font-family: var(--f-titulo);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.2;
}

.result-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  width: 100%;
}

.result {
  font-family: var(--f-titulo);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
}

.result.won {
  color: #7a5a14;
}

.result.lost {
  color: #8f2e28;
}

.result.tied {
  color: var(--medianoche);
}

.bubble .payout {
  font-family: var(--f-mono);
  font-size: 18px;
  color: #7a5a14;
}

.felt {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 14px;
  min-height: 300px;
  margin: 0 10px;
  padding: 22px 18px;
  background:
    radial-gradient(ellipse 80% 60% at 50% 45%, #2b5a46 0%, #1d4033 60%, #163428 100%);
  border: 6px solid #3a2618;
  border-radius: 28px;
  box-shadow:
    inset 0 0 0 2px var(--laton),
    inset 0 10px 30px rgba(0, 0, 0, 0.45),
    0 16px 30px rgba(0, 0, 0, 0.5);
}

.spots {
  display: flex;
  justify-content: center;
  gap: 14px;
}

.spot {
  width: 58px;
  height: 82px;
  border: 1.5px dashed rgba(232, 205, 143, 0.35);
  border-radius: 7px;
}

.felt-mark {
  margin: 0;
  text-align: center;
  font-family: var(--f-letrero);
  font-size: 1.6rem;
  letter-spacing: 0.08em;
  color: rgba(232, 205, 143, 0.22);
}

.stake {
  align-self: center;
  width: auto;
  justify-content: center;
  padding: 6px 14px;
  border: 1px solid rgba(232, 205, 143, 0.3);
  border-radius: 999px;
}

.stake-label {
  font-family: var(--f-ui);
  font-size: 0.85rem;
  color: var(--humo);
}

.stake .payout {
  font-family: var(--f-mono);
  font-size: 16px;
  color: var(--oro);
}

.tray {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: auto;
  padding: 18px 16px max(16px, env(safe-area-inset-bottom));
}

.bet-chips {
  display: flex;
  justify-content: center;
  gap: 18px;
}

.bet-chip {
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle, #f3ead6 0 17px, transparent 18px),
    repeating-conic-gradient(#8f2e28 0 22.5deg, #f3ead6 22.5deg 45deg);
  box-shadow:
    inset 0 0 0 4px #8f2e28,
    0 4px 10px rgba(0, 0, 0, 0.45);
  font-family: var(--f-mono);
  font-size: 15px;
  font-weight: 500;
  color: #1c1a17;
  cursor: pointer;
  transition:
    transform var(--duracion-corta) ease-out,
    box-shadow var(--duracion-corta) ease-out;
}

.bet-chip:nth-child(2) {
  background:
    radial-gradient(circle, #f3ead6 0 17px, transparent 18px),
    repeating-conic-gradient(#1d4033 0 22.5deg, #f3ead6 22.5deg 45deg);
  box-shadow:
    inset 0 0 0 4px #1d4033,
    0 4px 10px rgba(0, 0, 0, 0.45);
}

.bet-chip:nth-child(3) {
  background:
    radial-gradient(circle, #f3ead6 0 17px, transparent 18px),
    repeating-conic-gradient(#1c1a17 0 22.5deg, #c9a45c 22.5deg 45deg);
  box-shadow:
    inset 0 0 0 4px #1c1a17,
    0 4px 10px rgba(0, 0, 0, 0.45);
}

.bet-chip.chosen {
  transform: translateY(-8px);
  outline: 2px solid var(--oro);
  outline-offset: 4px;
}

.bet-chip:disabled {
  cursor: default;
  opacity: 0.35;
}

.bet-chip:focus-visible,
.action:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 4px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tray-stake {
  display: none;
}

.tray > .action {
  flex: none;
}

.action {
  flex: 1;
  min-height: 52px;
  padding: 0 18px;
  border: 1px solid rgba(201, 164, 92, 0.6);
  border-radius: 2px;
  background: rgba(17, 31, 29, 0.9);
  font-family: var(--f-ui);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--oro);
  cursor: pointer;
  transition: filter var(--duracion-corta) ease-out;
}

.action.primary {
  border: 0;
  background: var(--marfil);
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
  font-size: 14px;
  color: var(--burdeos-claro);
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

@media (orientation: landscape) and (max-height: 520px) {
  .table {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 42%);
    grid-template-rows: auto 1fr;
    column-gap: 10px;
  }

  .croupier {
    height: 96px;
  }

  .figure {
    width: 74px;
    height: 92px;
  }

  .felt {
    grid-row: 2;
    flex-direction: row;
    align-items: center;
    min-height: 0;
    padding: 12px;
  }

  .stake {
    flex-direction: column;
    border-radius: 14px;
  }

  .felt {
    min-width: 0;
    gap: 8px;
    justify-content: space-evenly;
  }

  .felt .stake {
    display: none;
  }

  .felt :deep(.hand li + li) {
    margin-left: -30px;
  }

  .tray-stake {
    display: flex;
    justify-content: space-between;
    flex: 1 1 100%;
    margin: 0;
    font-size: 0.85rem;
    color: var(--humo);
  }

  .tray-stake-value {
    font-family: var(--f-mono);
    color: var(--oro);
  }

  .spot {
    width: 44px;
    height: 62px;
  }

  .spots {
    gap: 8px;
  }

  .felt-mark {
    display: none;
  }

  .tray {
    margin-top: 0;
    padding-bottom: 12px;
  }

  .tray {
    grid-column: 2;
    grid-row: 1 / span 2;
    justify-content: center;
    margin-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bet-chip,
  .action {
    transition: none;
  }
}
</style>
