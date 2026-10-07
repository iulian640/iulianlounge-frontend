<script setup>
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { createLounge } from '@/lounge/createLounge'
import BarmanPrompt from '@/components/bar/BarmanPrompt.vue'
import BarWindow from '@/components/bar/BarWindow.vue'
import HudLounge from '@/components/hud/HudLounge.vue'
import { useBarmanTalk } from '@/composables/useBarmanTalk'
import { prefersFlatLounge } from '@/lounge/deviceMode'
import SalonMovil from './SalonMovil.vue'

const flat = prefersFlatLounge()

const canvas = ref(null)
const entering = ref(!flat)
const progress = ref(0)
const ajustando = ref(false)
let lounge = null
const loading = new AbortController()
const hud = useTemplateRef('hud')
const { near, open, setNear, closeWindow } = useBarmanTalk({
  onOpen: () => {
    hud.value?.dismissBook?.()
    lounge?.releasePointer()
  },
})

onMounted(async () => {
  if (flat) return
  try {
    lounge = await createLounge(
      canvas.value,
      (value) => {
        progress.value = Math.max(progress.value, value)
      },
      (busy) => {
        ajustando.value = busy
      },
      loading.signal,
      setNear,
    )
  } catch (error) {
    console.error('[lounge]', error)
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 700))
    entering.value = false
  }
})

onUnmounted(() => {
  loading.abort()
  lounge?.dispose()
  lounge = null
})
</script>

<template>
  <SalonMovil v-if="flat">
    <template #hud><HudLounge inline /></template>
  </SalonMovil>
  <canvas v-else ref="canvas"></canvas>
  <HudLounge v-if="!flat && !entering" ref="hud" />
  <BarmanPrompt v-if="!flat && !entering && near && !open" />
  <BarWindow v-if="!flat && open" @close="closeWindow" />
  <Transition name="telon">
    <div v-if="entering" class="telon" aria-live="polite">
      <p class="letrero">IULIAN'S</p>
      <p class="aviso">La casa está encendiendo las luces.</p>
      <div class="progreso" role="progressbar" :aria-valuenow="Math.round(progress * 100)">
        <div class="progreso-lleno" :style="{ transform: `scaleX(${progress})` }"></div>
      </div>
    </div>
  </Transition>
  <Transition name="visillo">
    <div v-if="ajustando" class="visillo" aria-live="polite">
      <p class="letrero">IULIAN'S</p>
      <p class="aviso">La casa ajusta las luces.</p>
    </div>
  </Transition>
</template>

<style scoped>
canvas {
  position: fixed;
  inset: 0;
}

.telon {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  background: #0b1514;
}

.letrero {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2rem, 6vw, 3.5rem);
  letter-spacing: 0.35em;
  text-indent: 0.35em;
  color: #e8cd8f;
  text-shadow: 0 0 26px rgba(201, 164, 92, 0.35);
  animation: parpadeo 2.4s ease-in-out infinite;
}

.aviso {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  color: rgba(239, 229, 204, 0.55);
}

.progreso {
  position: relative;
  width: min(320px, 60vw);
  height: 2px;
  margin: 0.9rem auto 0;
  background: rgba(201, 164, 92, 0.16);
  overflow: hidden;
}

.progreso-lleno {
  height: 100%;
  background: linear-gradient(90deg, #c9a45c, #e8cd8f);
  box-shadow: 0 0 10px rgba(232, 205, 143, 0.45);
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 1.1s cubic-bezier(0.25, 1, 0.5, 1);
}

.progreso::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 38%;
  background: linear-gradient(90deg, transparent, rgba(232, 205, 143, 0.4), transparent);
  animation: destello 2s ease-in-out infinite;
}

@keyframes destello {
  from {
    transform: translateX(-110%);
  }
  to {
    transform: translateX(380%);
  }
}

@keyframes parpadeo {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.telon-leave-active {
  transition: opacity 0.9s ease;
}

.telon-leave-to {
  opacity: 0;
}

.visillo {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  background: rgba(11, 21, 20, 0.94);
}

.visillo-enter-active {
  transition: opacity 0.15s ease-out;
}

.visillo-leave-active {
  transition: opacity 0.6s ease;
}

.visillo-enter-from,
.visillo-leave-to {
  opacity: 0;
}
</style>
