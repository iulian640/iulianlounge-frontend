<script setup>
 import { onMounted, ref } from 'vue';
 import { createLounge } from '@/lounge/createLounge';

const canvas = ref(null);

onMounted(() => {
  createLounge(canvas.value);
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
