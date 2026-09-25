<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { createLounge } from '@/lounge/createLounge'
import HudLounge from '@/components/hud/HudLounge.vue'
import { prefersFlatLounge } from '@/lounge/deviceMode'
import SalonMovil from './SalonMovil.vue'

// Móvil o pantalla estrecha: El Salón en 2D, sin canvas ni WebGPU (IUL-58). Se decide una vez, al montar
const flat = prefersFlatLounge()

const canvas = ref(null)
const entering = ref(!flat) // el telón: tapa la compilación de shaders y la carga (en 2D no hay nada que tapar)
const progress = ref(0) // 0..1, lo reporta createLounge por tramos reales
// el visillo: medio telón que tapa el congelón al cambiar la calidad de
// gráficos (compilación síncrona del grafo nuevo) — lo manda createLounge
const ajustando = ref(false)
let lounge = null // handle con dispose(), para matar el lounge al desmontar

onMounted(async () => {
  if (flat) return
  try {
    // async: el renderer WebGPU se inicializa de forma asíncrona; la promesa
    // resuelve con la sala amueblada, los pipelines compilados y un primer
    // frame ya renderizado — solo entonces se levanta el telón
    lounge = await createLounge(
      canvas.value,
      (value) => {
        // nunca retrocede: las cargas sueltas pueden reportar desordenadas
        progress.value = Math.max(progress.value, value)
      },
      (busy) => {
        ajustando.value = busy
      },
    )
  } catch (error) {
    console.error('[lounge]', error)
  } finally {
    // un respiro para que la barra termine su deslizamiento hasta el fondo
    // antes de levantar el telón — el remate se ve, no se corta
    await new Promise((resolve) => setTimeout(resolve, 700))
    entering.value = false
  }
})

// al desmontar (navegar a otra vista, o remontaje por HMR al guardar un
// fichero) el lounge anterior se apaga de verdad: sin esto se iban apilando
// lounges invisibles y la pestaña se atascaba más con cada guardado
onUnmounted(() => {
  lounge?.dispose()
  lounge = null
})
</script>

<template>
  <SalonMovil v-if="flat" />
  <canvas v-else ref="canvas"></canvas>
  <!-- El HUD aparece cuando se levanta el telón, no antes. El mismo en 3D y en 2D -->
  <HudLounge v-if="!entering" />
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
  text-indent: 0.35em; /* compensa el hueco del último letter-spacing */
  color: #e8cd8f;
  text-shadow: 0 0 26px rgba(201, 164, 92, 0.35);
  /* solo opacity: corre en el compositor y sigue latiendo aunque el hilo
     principal esté congelado compilando shaders */
  animation: parpadeo 2.4s ease-in-out infinite;
}

.aviso {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  color: rgba(239, 229, 204, 0.55); /* marfil apagado */
}

/* barra de carga: un hilo de latón que se va llenando de oro. scaleX en vez
   de width: corre en el compositor, como el parpadeo del letrero */
.progreso {
  position: relative;
  width: min(320px, 60vw);
  height: 2px;
  margin: 0.9rem auto 0;
  background: rgba(201, 164, 92, 0.16); /* latón apagado, casi a oscuras */
  overflow: hidden;
}

.progreso-lleno {
  height: 100%;
  background: linear-gradient(90deg, #c9a45c, #e8cd8f);
  box-shadow: 0 0 10px rgba(232, 205, 143, 0.45);
  transform-origin: left;
  transform: scaleX(0);
  /* deslizamiento largo con frenada suave: los tramos que llegan a saltos
     (tras la compilación de shaders) se ven planear, no teletransportarse */
  transition: transform 1.1s cubic-bezier(0.25, 1, 0.5, 1);
}

/* destello que recorre el hilo: animación de compositor — sigue viva incluso
   con el hilo principal congelado compilando shaders (el momento exacto en
   que la barra no puede avanzar y no queremos que parezca colgada) */
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

/* el visillo: como el telón pero sin barra y sin llegar al negro total — la
   sala queda detrás, en penumbra. Solo opacity: la transición y el parpadeo
   del letrero corren en el compositor y siguen vivos durante el congelón de
   compilación que precisamente vienen a tapar */
.visillo {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  background: rgba(11, 21, 20, 0.94);
}

/* entrada rápida (el congelón viene enseguida), salida con calma de club */
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
