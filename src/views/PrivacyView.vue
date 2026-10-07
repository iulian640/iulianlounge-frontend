<script setup>
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const ISSUES_URL = 'https://github.com/iulian640/iulianlounge-frontend/issues'
const SECTIONS = ['controller', 'contact', 'data', 'purpose', 'processor', 'storage', 'rights']
const DATA_ITEMS = ['account', 'chips', 'barman']

const { t } = useI18n()
</script>

<template>
  <main class="privacy">
    <article class="sheet" aria-labelledby="privacy-title">
      <RouterLink class="back" to="/">{{ t('privacy.back') }}</RouterLink>
      <h1 id="privacy-title" class="title">{{ t('privacy.title') }}</h1>
      <p class="intro">{{ t('privacy.intro') }}</p>

      <section v-for="section in SECTIONS" :key="section" class="block" :aria-labelledby="`privacy-${section}`">
        <h2 :id="`privacy-${section}`" class="heading">{{ t(`privacy.sections.${section}.title`) }}</h2>
        <ul v-if="section === 'data'" class="items">
          <li v-for="item in DATA_ITEMS" :key="item">{{ t(`privacy.sections.data.items.${item}`) }}</li>
        </ul>
        <p v-else class="text">{{ t(`privacy.sections.${section}.body`) }}</p>
        <a
          v-if="section === 'contact'"
          class="issues"
          :href="ISSUES_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('privacy.sections.contact.link') }}
        </a>
      </section>
    </article>
  </main>
</template>

<style scoped>
.privacy {
  height: 100dvh;
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  padding: 24px 16px 48px;
  background: radial-gradient(ellipse at 50% 20%, var(--tapete) 0%, var(--medianoche) 65%);
}

.sheet {
  width: min(100%, 640px);
  height: fit-content;
  box-sizing: border-box;
  padding: 32px 28px 36px;
  background: var(--fieltro);
  border: 1px solid var(--linea);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

.back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-family: var(--f-ui);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--humo);
  text-decoration: none;
}

.back:hover {
  color: var(--marfil);
}

.title {
  margin: 8px 0 0;
  font-family: var(--f-titulo);
  font-size: 2.2rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--marfil);
}

.intro {
  margin: 8px 0 28px;
  font-family: var(--f-titulo);
  font-size: 1.2rem;
  font-style: italic;
  color: var(--humo);
}

.block {
  padding-top: 20px;
  border-top: 1px solid var(--linea-suave);
}

.block + .block {
  margin-top: 20px;
}

.heading {
  margin: 0 0 8px;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--laton);
}

.text,
.items {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--marfil);
}

.items {
  padding-left: 20px;
}

.issues {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 6px;
  color: var(--oro);
  font-family: var(--f-ui);
}

.back:focus-visible,
.issues:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 2px;
}
</style>
