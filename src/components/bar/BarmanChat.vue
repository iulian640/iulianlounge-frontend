<script setup>
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { useBarLines } from '@/composables/useBarLines'

const MAX_TEXT_LENGTH = 280
const CHIPS = ['recommend', 'rank']

const props = defineProps({
  lines: { type: Array, default: () => [] },
  thinking: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['ask', 'say'])

const { t } = useI18n()
const { lineText } = useBarLines()
const draft = ref('')
const log = useTemplateRef('log')
const field = useTemplateRef('field')

const disabled = computed(() => props.thinking || props.locked)
const canSend = computed(() => !disabled.value && draft.value.trim() !== '')

function submit() {
  if (!canSend.value) return
  emit('say', draft.value.trim())
  draft.value = ''
  field.value?.focus()
}

function scrollToEnd() {
  if (log.value) log.value.scrollTop = log.value.scrollHeight
}

watch(
  () => [props.lines.length, props.thinking],
  async () => {
    await nextTick()
    scrollToEnd()
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="chat" :class="{ compact }">
    <div ref="log" class="log" role="log" :aria-label="t('bar.talk.label')">
      <p
        v-for="line in lines"
        :key="line.id"
        class="bubble"
        :class="line.from === 'member' ? 'member' : 'barman'"
      >
        {{ lineText(line) }}
      </p>
    </div>

    <p v-if="thinking" class="status" role="status">{{ t('bar.talk.thinking') }}</p>
    <p v-else-if="locked" class="status" role="status">{{ t('bar.talk.resting') }}</p>

    <div class="chips">
      <button v-for="chip in CHIPS" :key="chip" type="button" class="chip" @click="emit('ask', chip)">
        {{ t(`bar.talk.chips.${chip}`) }}
      </button>
    </div>

    <form class="composer" @submit.prevent="submit">
      <input
        ref="field"
        v-model="draft"
        class="field"
        type="text"
        autocomplete="off"
        enterkeyhint="send"
        :maxlength="MAX_TEXT_LENGTH"
        :placeholder="t('bar.talk.placeholder')"
        :aria-label="t('bar.talk.placeholder')"
        :readonly="disabled"
        :aria-disabled="disabled"
      />
      <button type="submit" class="send" :disabled="!canSend">{{ t('bar.talk.send') }}</button>
    </form>

    <I18nT keypath="bar.talk.privacy" tag="p" scope="global" class="notice">
      <template #link>
        <RouterLink class="notice-link" to="/privacidad">{{ t('bar.talk.privacyLink') }}</RouterLink>
      </template>
    </I18nT>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
}

.compact {
  position: relative;
}

.compact .log {
  position: absolute;
  width: 1px;
  height: 1px;
  min-height: 0;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.log {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 160px;
  overflow-y: auto;
  padding-right: 4px;
}

.bubble {
  margin: 0;
  overflow-wrap: anywhere;
  box-shadow: none;
}

.bubble.barman {
  align-self: flex-start;
  max-width: 88%;
  padding: 11px 18px;
  border-radius: 18px 18px 18px 4px;
  background: var(--marfil);
  color: var(--medianoche);
  font-family: var(--f-titulo);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.3;
}

.bubble.member {
  align-self: flex-end;
  max-width: 80%;
  padding: 10px 16px;
  border: 1px solid rgba(201, 164, 92, 0.45);
  border-radius: 18px 18px 4px 18px;
  color: var(--marfil);
  font-family: var(--f-ui);
  font-size: 0.9rem;
  line-height: 1.4;
}

.status {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 13px;
  font-style: italic;
  color: var(--humo);
}

.chips {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.chip {
  min-height: 44px;
  padding: 8px 12px;
  text-align: center;
  line-height: 1.25;
  border: 1px solid var(--linea);
  border-radius: 2px;
  background: var(--tapete);
  color: var(--marfil);
  font-family: var(--f-ui);
  font-size: 14px;
  cursor: pointer;
  transition: border-color var(--duracion-corta);
}

.chip:hover {
  border-color: var(--laton);
}

.composer {
  display: flex;
  gap: 12px;
}

.field {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid var(--linea);
  border-radius: 2px;
  background: var(--medianoche);
  color: var(--marfil);
  font-family: var(--f-ui);
  font-size: 16px;
}

.field::placeholder {
  color: rgba(147, 166, 158, 0.55);
}

.field:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 1px;
}

.field[readonly] {
  cursor: not-allowed;
  opacity: 0.5;
}

.send {
  flex: none;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid rgba(201, 164, 92, 0.6);
  border-radius: 2px;
  background: transparent;
  color: var(--oro);
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
}

.send:hover:not(:disabled) {
  background: var(--tapete);
}

.send:disabled {
  cursor: default;
  opacity: 0.4;
}

.chip:focus-visible,
.send:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 2px;
}

.notice {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 12px;
  line-height: 1.45;
  color: var(--humo);
}

.notice-link {
  color: var(--oro);
}
</style>
