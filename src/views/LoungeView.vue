<script setup>
import { onMounted, ref } from 'vue';
import { createLounge } from '@/lounge/createLounge';

const canvas = ref(null);
const entering = ref(true); // el telón: tapa la compilación de shaders y la carga

onMounted(async () => {
  try {
    // async: el renderer WebGPU se inicializa de forma asíncrona; la promesa
    // resuelve con la sala amueblada, los pipelines compilados y un primer
    // frame ya renderizado — solo entonces se levanta el telón
    await createLounge(canvas.value);
  } catch (error) {
    console.error('[lounge]', error);
  } finally {
    entering.value = false;
  }
});
</script>

<template>
  <canvas ref="canvas"></canvas>
  <Transition name="telon">
    <div v-if="entering" class="telon" aria-live="polite">
      <p class="letrero">IULIAN'S</p>
      <p class="aviso">La casa está encendiendo las luces.</p>
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
</style>
