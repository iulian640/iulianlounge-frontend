# IulianLounge: frontend

Un speakeasy de los años 20 que se recorre en 3D. Vue 3, Three.js (WebGPU, con
WebGL2 de respaldo) y Vite.

**En marcha en [iulianlounge.com](https://iulianlounge.com).** Hoy tiene registro
y sesión, la cartera de fichas en el HUD y, en el móvil, un salón en 2D sin
escena 3D. El barman llega en octubre de 2026.

El concepto y la arquitectura viven en el repo
[iulianlounge-backend](https://github.com/iulian640/iulianlounge-backend)
(`CONCEPT.md` y `docs/architecture.md`).

## Arranque

```bash
npm install
npm run dev         # http://localhost:5173, con el backend en :8080 (Vite le pasa /api)
npm run test:unit
```

El 3D necesita un navegador con WebGPU (Chrome o Edge) y un contexto seguro:
`localhost` vale, una IP de la red local no.

---

A 1920s speakeasy you walk through in 3D, live at
[iulianlounge.com](https://iulianlounge.com). Vue 3, Three.js (WebGPU with a
WebGL2 fallback) and Vite; the concept and architecture are documented in the
backend repo.
