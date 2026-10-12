# IulianLounge: frontend

[English version](README.en.md)

Iulian's es un speakeasy de los años 20 en el navegador. Entras como recién llegado, pides copas en la barra, charlas con el barman y juegas al blackjack.

[App](https://iulianlounge.com) · [Presentación](https://iulianlounge.com/presentacion/) · [Backend](https://github.com/iulian640/iulianlounge-backend) · [Figma](https://www.figma.com/design/ns6uohIpSej1vuw90QWlpX)

<p align="center">
  <img src="docs/responsive/bar-390.webp" alt="La barra en un móvil de 390 px" width="240">
  &nbsp;
  <img src="docs/responsive/table-390.webp" alt="La mesa de blackjack en un móvil de 390 px" width="240">
</p>

## Qué es

Este repositorio es el frontend de IulianLounge: una SPA en Vue 3 que habla con la API del [backend](https://github.com/iulian640/iulianlounge-backend). La moneda de la casa son las monedas. Las cuentas nuevas empiezan con 100.

Gastar sube el rango: Recién llegado, Cliente, Habitual, Socio. Si el saldo llega a cero, la casa regala 50 monedas una vez al día.

## Dos experiencias

El 3 de julio de 2026 decidí que el salón no podía ser el mismo en todos los dispositivos. La elección se hace al cargar la página.

- Escritorio: un salón 3D por el que se camina con WASD y el ratón. Al acercarte al barman o a la mesa de blackjack, pulsas E. Usa Three.js con WebGPU y WebGL2 como respaldo.
- **Móvil y tablet táctil** (puntero grueso o ancho menor de 768 px): una experiencia 2D sin canvas. Dos salas a pantalla completa, La barra y La mesa, una junto a la otra. Se cambia de sala con scroll-snap horizontal, con las asas de los bordes o con las pestañas de sala. En la barra, un bottom sheet con las pestañas La carta y Charlar. Arriba, la placa del HUD con el saldo, el nombre, el rango y el cierre de sesión, y un libro de cuentas.

La lógica es la misma en los dos modos (stores de Pinia y composables). Cada modo tiene su propia presentación.

## Funcionalidades

- Registro, inicio y cierre de sesión.
- La carta del bar: Bathtub Gin (5 monedas), Bee's Knees (10), Gin Rickey (15), Sidecar (25) y French 75 (40).
- Charla con el barman: preguntas rápidas con respuesta fija. El texto libre llega a Claude Haiku solo si el servidor tiene una API key. Sin ella, responde con frases fijas.
- Blackjack con apuestas de 10, 20 o 50, pedir carta y plantarse. La banca se planta en 17 y el blackjack paga 3:2.
- Saldo en el HUD con el cambio (−N o +N) tras cada movimiento.
- Libro de cuentas con el historial de movimientos.
- Rangos según lo gastado y regalo diario de la casa a saldo cero.
- Textos en castellano, con la traducción al inglés ya hecha; el selector de idioma llega en la fase 2.

## Stack

| Área | Tecnología |
| --- | --- |
| Framework | Vue 3.5 (Composition API, `<script setup>`, JavaScript) |
| Build | Vite 8 |
| Estado y rutas | Pinia 3, Vue Router 5 |
| Idiomas | vue-i18n 11 (ES principal, EN) |
| 3D | Three.js 0.185 (build WebGPU) |
| Tests | Vitest 4, Vue Test Utils, jsdom, Playwright 1.61.1 |
| Calidad | ESLint 10 y oxlint |
| Tipografías | Limelight, Cormorant, Jost, IBM Plex Mono (@fontsource) |

## Arquitectura del frontend

```text
src/
  views/        AccessView, LoungeView, SalonMovil, PrivacyView
  components/
    hud/        saldo, nombre y rango, libro de cuentas
    bar/        carta, barman, chat
    blackjack/  mesa, manos, cartas, apuestas
    salon/      salas del móvil, bottom sheet, pestañas de sala
  composables/  lógica compartida (salas, charla, ronda de blackjack...)
  stores/       Pinia: auth, wallet, bar, blackjack
  lounge/       el salón 3D (escena, luces, cámara, controles, mesa)
  i18n/         es.json, en.json
  api/          cliente HTTP
  router/
```

Los tests unitarios viven en carpetas `__tests__` junto al código que prueban. Los E2E están en `e2e/`.

## Puesta en marcha

Requisitos: Node `^22.18.0` o `>=24.12.0` (el CI usa 24) y el backend en marcha en el puerto 8080. Las instrucciones del backend están en su [README](https://github.com/iulian640/iulianlounge-backend).

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. En desarrollo, Vite redirige `/api` a `http://localhost:8080`. Así la cookie de refresco viaja en el mismo origen y no hace falta CORS.

El 3D necesita un navegador con WebGPU o WebGL2 y un contexto seguro. `localhost` vale, una IP de la red local no.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | Build de producción |
| `npm run preview` | Sirve el build en local |
| `npm run test:unit` | Vitest en modo watch |
| `npm run test:coverage` | Vitest con informe de cobertura |
| `npm run test:e2e` | Tests E2E con Playwright |
| `npm run lint` | oxlint y ESLint, con arreglo automático |
| `npm run format` | Formatea `src/` con oxfmt |

## Tests

- 976 tests unitarios y de componente en 52 ficheros.
- Cobertura de líneas del 97,88 % (sentencias cerca del 93 %, ramas cerca del 93 %, funciones cerca del 95,9 %). `vitest.config.js` falla por debajo del 70 % de líneas.
- 9 tests E2E con Playwright. Cuatro de escritorio: flujo de acceso, contraseña incorrecta, HUD y libro de cuentas. Cinco de móvil: el salón 2D, una copa hasta saldo cero con el regalo de la casa, el chip de rango, una mano completa de blackjack y el cierre de sesión.

```bash
npm run test:coverage
npm run test:e2e
```

Los E2E corren contra el build de producción (`vite build` y `vite preview` en el puerto 5179, con `/api` redirigido a `localhost:8080`). Por eso el backend tiene que estar levantado en local.

El CI de GitHub Actions ejecuta `npm ci`, `npm run lint` y `npm run test:coverage` en cada push.

## Responsive

El rediseño móvil se hizo con el método impeccable. Salieron tres estructuras y elegí "Dos salas". Capturas de la app en móvil:

| Ancho | Vista |
| --- | --- |
| 390 px | La barra, La mesa, Charlar y libro de cuentas |
| 320 px | La barra, sin scroll horizontal |
| 667 px (apaisado) | Las mismas salas en horizontal, con la carta al lado de la barra |

<p>
  <img src="docs/responsive/bar-390.webp" alt="La barra a 390 px" width="190">
  <img src="docs/responsive/talk-390.webp" alt="Pestaña Charlar a 390 px" width="190">
  <img src="docs/responsive/account-book-390.webp" alt="Libro de cuentas a 390 px" width="190">
  <img src="docs/responsive/table-bets-390.webp" alt="Elección de apuesta en la mesa a 390 px" width="190">
  <img src="docs/responsive/table-390.webp" alt="Mano de blackjack resuelta a 390 px" width="190">
  <img src="docs/responsive/bar-320.webp" alt="La barra a 320 px" width="190">
</p>

<p>
  <img src="docs/responsive/bar-landscape-667.webp" alt="La barra en apaisado a 667 px" width="400">
  <img src="docs/responsive/table-landscape-667.webp" alt="La mesa en apaisado a 667 px" width="400">
</p>

## Accesibilidad

- Objetivos táctiles de 44 px y campos de 16 px.
- Sin scroll horizontal a 320 px, en vertical y en apaisado.
- Respeta `prefers-reduced-motion`.
- Las salas son un `tablist` y se cambian con las flechas del teclado.
- Regiones live para el saldo y para el blackjack.

## Diseño

- [PRODUCT.md](PRODUCT.md): ficha del producto.
- [DESIGN.md](DESIGN.md): sistema de diseño. Paleta medianoche, fieltro, tapete, latón, oro, marfil, humo y burdeos. Limelight solo para el letrero, Cormorant, Jost e IBM Plex Mono para el resto. El oro se reserva para el dinero y el letrero.
- [Figma](https://www.figma.com/design/ns6uohIpSej1vuw90QWlpX): bocetos y mockups.

## Despliegue

Producción está en [iulianlounge.com](https://iulianlounge.com), en Oracle Cloud ARM (Madrid). Docker Compose levanta Caddy, que sirve esta SPA y reenvía `/api` al backend. El compose está en `deploy/` del [repo del backend](https://github.com/iulian640/iulianlounge-backend).

## Proceso

Trabajé con un tablero de Jira por sprints: 50 tareas en 15 epics. Los commits siguen el formato conventional commits e incluyen la clave de Jira (`IUL-NN`).

| Sprint | Contenido | Fechas |
| --- | --- | --- |
| Sprint 1 | Auth y cartera | 3 a 17 jul |
| Verano | Salón 3D y su laboratorio de rendimiento | jul–sep |
| Sprint 8 | Auth completa | 16 a 22 sep |
| Sprint 9 | Cartera, HUD y móvil | 25 sep a 1 oct |
| Sprint 10 | Barra y blackjack | 7 a 9 oct |
| Sprint 11 | Móvil y entrega | 10 a 13 oct |

## Autor

Iulian Timofei. [GitHub](https://github.com/iulian640).
