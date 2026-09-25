<script setup>
import { useI18n } from 'vue-i18n'

// El Salón en 2D para móvil: la misma sala que el lounge 3D (barra, mesa de cartas, escenario de jazz),
// dibujada con CSS y sin canvas. El HUD lo pone LoungeView por encima, igual que en 3D
const { t } = useI18n()

// Los tres rincones de El Salón (docs/ficcion.md). Aún sin contenido: el barman llega en el sprint 10
const RINCONES = ['barra', 'cartas', 'escenario']
</script>

<template>
  <main class="salon">
    <p class="letrero" aria-hidden="true">IULIAN'S</p>
    <h1 class="sala">{{ t('salon.name') }}</h1>

    <!-- La pared del fondo: estantes con botellas, la lámpara y la barra. Solo decorado -->
    <div class="escena" aria-hidden="true">
      <span class="lampara"></span>
      <div class="estante">
        <span v-for="n in 7" :key="`a${n}`" class="botella" :class="`b${n % 4}`"></span>
      </div>
      <div class="estante">
        <span v-for="n in 6" :key="`b${n}`" class="botella" :class="`b${(n + 2) % 4}`"></span>
      </div>
      <div class="barra">
        <span class="pasamanos"></span>
      </div>
    </div>

    <ul class="rincones">
      <li v-for="rincon in RINCONES" :key="rincon">
        <span class="nombre">{{ t(`salon.corners.${rincon}`) }}</span>
        <span class="pronto">{{ t('salon.soon') }}</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.salon {
  /* El body tiene overflow: hidden por el lounge 3D: aquí el scroll lo lleva la sala */
  height: 100dvh;
  overflow-y: auto;
  box-sizing: border-box;
  /* Hueco arriba para el HUD, que va fijo en la esquina */
  padding: 76px 16px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background:
    radial-gradient(ellipse 70% 35% at 50% 30%, rgba(232, 205, 143, 0.12), transparent 70%),
    var(--medianoche);
}

.letrero {
  margin: 0;
  font-family: var(--f-letrero);
  font-size: 2.4rem;
  color: var(--oro);
  letter-spacing: 0.06em;
  /* Neón: el mismo letrero que cuelga en el lounge */
  text-shadow:
    0 0 6px rgba(232, 205, 143, 0.6),
    0 0 22px rgba(232, 205, 143, 0.35);
}

.sala {
  margin: 4px 0 20px;
  font-family: var(--f-titulo);
  font-weight: 600;
  font-style: italic;
  font-size: 1.35rem;
  color: var(--marfil);
}

.escena {
  position: relative;
  width: min(100%, 420px);
  padding: 34px 18px 0;
  box-sizing: border-box;
  /* Pared de madera oscura con paneles */
  background:
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0 2px, transparent 2px 70px),
    linear-gradient(180deg, #1c1510 0%, #140f0b 100%);
  border: 1px solid var(--linea);
}

.lampara {
  position: absolute;
  top: 0;
  left: 50%;
  width: 60px;
  height: 14px;
  transform: translateX(-50%);
  background: var(--laton);
  border-radius: 0 0 30px 30px;
  box-shadow: 0 10px 50px 18px rgba(232, 205, 143, 0.22);
}

.estante {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
  height: 58px;
  margin-bottom: 14px;
  border-bottom: 4px solid #3b2a1c;
}

/* Botellas: siluetas de vidrio con reflejo, en cuatro formas y tonos */
.botella {
  width: 14px;
  border-radius: 5px 5px 2px 2px;
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.12);
}

.b0 {
  height: 46px;
  background: linear-gradient(180deg, #2f4a2c, #1b2c1a);
}

.b1 {
  height: 38px;
  width: 18px;
  background: linear-gradient(180deg, #6b4a1e, #3f2b10);
}

.b2 {
  height: 50px;
  width: 11px;
  background: linear-gradient(180deg, #4a1f1c, #2b1110);
}

.b3 {
  height: 32px;
  background: linear-gradient(180deg, #8a6a2f, #54401c);
}

.barra {
  position: relative;
  height: 64px;
  margin: 18px -18px 0;
  background: linear-gradient(180deg, #3a2618 0%, #24170e 100%);
  box-shadow: 0 -8px 16px rgba(0, 0, 0, 0.5);
}

.pasamanos {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--laton);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.rincones {
  width: min(100%, 420px);
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.rincones li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px 4px;
  border-bottom: 1px solid var(--linea-suave);
}

.nombre {
  font-family: var(--f-titulo);
  font-size: 1.15rem;
  color: var(--marfil);
}

.pronto {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--humo);
}
</style>
