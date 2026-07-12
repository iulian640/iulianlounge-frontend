<script setup>
 import { onMounted, ref } from 'vue';
 import { createLounge } from '@/lounge/createLounge';

const canvas = ref(null);

onMounted(() => {
  // async: el renderer WebGPU se inicializa de forma asíncrona
  createLounge(canvas.value).catch((error) => console.error('[lounge]', error));
})
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>

<style scoped>
canvas {
  position: fixed;
  inset: 0;
}
</style>
