<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import BarRoom from '@/components/salon/BarRoom.vue'
import CardsRoom from '@/components/salon/CardsRoom.vue'
import RoomTabs from '@/components/salon/RoomTabs.vue'
import { useRooms } from '@/composables/useRooms'
import { useBarStore } from '@/stores/bar'

const ROOM_IDS = ['bar', 'cards']

const { t } = useI18n()
const bar = useBarStore()
const { active, scroller, goTo, onScroll, onKeydown } = useRooms(ROOM_IDS)
const cardsVisited = ref(false)

const rooms = computed(() => ROOM_IDS.map((id) => ({ id, label: t(`salon.rooms.${id}`) })))

function inertUnless(id) {
  return active.value === id ? null : ''
}

watch(active, (id) => {
  if (id === 'cards') cardsVisited.value = true
})

onMounted(() => {
  bar.load()
})
</script>

<template>
  <main class="salon">
    <div class="top">
      <slot name="hud" />
      <header class="rooms-bar">
        <h1 class="sign">IULIAN'S</h1>
        <RoomTabs :rooms="rooms" :active="active" :label="t('salon.rooms.label')" @select="goTo" @step="onKeydown" />
      </header>
    </div>
    <div ref="scroller" class="rooms" @scroll.passive="onScroll">
      <section id="room-bar" class="room" role="tabpanel" aria-labelledby="room-tab-bar" :inert="inertUnless('bar')">
        <BarRoom @next="goTo('cards')" />
      </section>
      <section id="room-cards" class="room" role="tabpanel" aria-labelledby="room-tab-cards" :inert="inertUnless('cards')">
        <CardsRoom :live="cardsVisited" @back="goTo('bar')" />
      </section>
    </div>
  </main>
</template>

<style scoped>
.salon {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  background: var(--medianoche);
}

.top {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 12px 12px 0;
}

.rooms-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1 1 100%;
  min-width: 0;
}

.sign {
  margin: 0;
  font-family: var(--f-letrero);
  font-size: 1.6rem;
  font-weight: 400;
  color: var(--oro);
  letter-spacing: 0.06em;
  text-shadow:
    0 0 6px rgba(232, 205, 143, 0.55),
    0 0 18px rgba(232, 205, 143, 0.3);
}

.rooms {
  flex: 1;
  min-height: 0;
  display: flex;
  margin-top: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.rooms::-webkit-scrollbar {
  display: none;
}

.room {
  flex: 0 0 100%;
  height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

@media (orientation: landscape) and (max-height: 520px) {
  .top {
    flex-wrap: nowrap;
    padding-top: 8px;
  }

  .top :slotted(.hud) {
    width: auto;
    order: 2;
  }

  .rooms-bar {
    flex: 1 1 auto;
    order: 1;
  }

  .sign {
    font-size: 1.3rem;
  }
}
</style>
