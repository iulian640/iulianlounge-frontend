# IulianLounge: frontend

[Versión en español](README.md)

Iulian's is a 1920s speakeasy in the browser. You enter as a newcomer, order drinks at the bar, talk to the barman and play blackjack.

[App](https://iulianlounge.com) · [Presentation](https://iulianlounge.com/presentacion/) · [Backend](https://github.com/iulian640/iulianlounge-backend) · [Figma](https://www.figma.com/design/ns6uohIpSej1vuw90QWlpX)

<p align="center">
  <img src="docs/responsive/bar-390.webp" alt="The bar on a 390 px phone" width="240">
  &nbsp;
  <img src="docs/responsive/table-390.webp" alt="The blackjack table on a 390 px phone" width="240">
</p>

## What it is

This repository is the IulianLounge frontend: a Vue 3 SPA that talks to the [backend](https://github.com/iulian640/iulianlounge-backend) API. The house currency is coins ("monedas" in the Spanish UI). New accounts start with 100.

Spending raises your rank: Recién llegado, Cliente, Habitual, Socio (newcomer, customer, regular, member). If your balance hits zero, the house gives you 50 coins once a day.

## Two experiences

On 3 July 2026 I decided the lounge could not be the same on every device. The choice is made when the page loads.

- Desktop: a 3D lounge you walk through with WASD and the mouse. Approach the barman or the blackjack table and press E. It uses Three.js with WebGPU and a WebGL2 fallback.
- **Phones and touch tablets** (coarse pointer or width under 768 px): a 2D experience with no canvas. Two full-screen rooms side by side, La barra (the bar) and La mesa (the table). You switch rooms with horizontal scroll-snap, the edge handles or the room tabs. In the bar, a bottom sheet with the tabs La carta (the menu) and Charlar (chat). At the top, the HUD plate with balance, name, rank and sign out, plus an account book.

The logic is shared between both modes (Pinia stores and composables). Each mode has its own presentation.

## Features

- Sign up, sign in and sign out.
- The bar menu: Bathtub Gin (5 coins), Bee's Knees (10), Gin Rickey (15), Sidecar (25) and French 75 (40).
- Barman chat: quick questions get fixed answers. Free text goes to Claude Haiku only when the server has an API key. Without one, the barman answers with fixed lines.
- Blackjack with bets of 10, 20 or 50, hit and stand. The dealer stands on 17 and blackjack pays 3:2.
- Balance in the HUD with the change (−N or +N) after each move.
- Account book with the movement history.
- Ranks based on spending, and the daily house credit at zero balance.
- UI text in Spanish, with the English translation already in place; the language switcher comes in phase 2.

## Stack

| Area | Technology |
| --- | --- |
| Framework | Vue 3.5 (Composition API, `<script setup>`, JavaScript) |
| Build | Vite 8 |
| State and routing | Pinia 3, Vue Router 5 |
| i18n | vue-i18n 11 (ES main, EN) |
| 3D | Three.js 0.185 (WebGPU build) |
| Tests | Vitest 4, Vue Test Utils, jsdom, Playwright 1.61.1 |
| Quality | ESLint 10 and oxlint |
| Fonts | Limelight, Cormorant, Jost, IBM Plex Mono (@fontsource) |

## Frontend architecture

```text
src/
  views/        AccessView, LoungeView, SalonMovil, PrivacyView
  components/
    hud/        balance, name and rank, account book
    bar/        menu, barman, chat
    blackjack/  table, hands, cards, bets
    salon/      mobile rooms, bottom sheet, room tabs
  composables/  shared logic (rooms, talk, blackjack round...)
  stores/       Pinia: auth, wallet, bar, blackjack
  lounge/       the 3D lounge (scene, lights, camera, controls, table)
  i18n/         es.json, en.json
  api/          HTTP client
  router/
```

Unit tests live in `__tests__` folders next to the code they cover. E2E tests are in `e2e/`.

## Getting started

Requirements: Node `^22.18.0` or `>=24.12.0` (CI uses 24) and the backend running on port 8080. Backend instructions are in its [README](https://github.com/iulian640/iulianlounge-backend).

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. In development, Vite proxies `/api` to `http://localhost:8080`. That keeps the refresh cookie on the same origin, so CORS is not needed.

The 3D lounge needs a browser with WebGPU or WebGL2 and a secure context. `localhost` works, a LAN IP does not.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serves the build locally |
| `npm run test:unit` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with a coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run lint` | oxlint and ESLint, with auto-fix |
| `npm run format` | Formats `src/` with oxfmt |

## Tests

- 976 unit and component tests in 52 files.
- Line coverage of 97.88% (statements and branches around 93%, functions around 95.9%). `vitest.config.js` fails below 70% lines.
- 9 Playwright E2E tests. Four on desktop: access flow, wrong password, HUD and account book. Five on mobile: the 2D lounge, a drink down to zero balance with the house credit, the rank chip, a full blackjack hand and sign out.

```bash
npm run test:coverage
npm run test:e2e
```

E2E tests run against the production build (`vite build` and `vite preview` on port 5179, with `/api` proxied to `localhost:8080`). The backend must be running locally.

GitHub Actions CI runs `npm ci`, `npm run lint` and `npm run test:coverage` on every push.

## Responsive

The mobile redesign used the impeccable design method. It produced three structures and I picked "Dos salas" (two rooms). Screenshots of the app on a phone:

| Width | View |
| --- | --- |
| 390 px | The bar, the table, chat and account book |
| 320 px | The bar, with no horizontal scroll |
| 667 px (landscape) | The same rooms side by side, with the menu next to the bar |

<p>
  <img src="docs/responsive/bar-390.webp" alt="The bar at 390 px" width="190">
  <img src="docs/responsive/talk-390.webp" alt="The chat tab at 390 px" width="190">
  <img src="docs/responsive/account-book-390.webp" alt="The account book at 390 px" width="190">
  <img src="docs/responsive/table-bets-390.webp" alt="Choosing a bet at the table at 390 px" width="190">
  <img src="docs/responsive/table-390.webp" alt="A finished blackjack hand at 390 px" width="190">
  <img src="docs/responsive/bar-320.webp" alt="The bar at 320 px" width="190">
</p>

<p>
  <img src="docs/responsive/bar-landscape-667.webp" alt="The bar in landscape at 667 px" width="400">
  <img src="docs/responsive/table-landscape-667.webp" alt="The table in landscape at 667 px" width="400">
</p>

## Accessibility

- 44 px touch targets and 16 px inputs.
- No horizontal scroll at 320 px, in portrait and landscape.
- Respects `prefers-reduced-motion`.
- The rooms are a `tablist` and switch with the arrow keys.
- Live regions for the balance and for blackjack.

## Design

- [PRODUCT.md](PRODUCT.md): product record.
- [DESIGN.md](DESIGN.md): design system. Palette of midnight, felt, baize, brass, gold, ivory, smoke and burgundy. Limelight only for the sign, Cormorant, Jost and IBM Plex Mono for the rest. Gold is reserved for money and the sign.
- [Figma](https://www.figma.com/design/ns6uohIpSej1vuw90QWlpX): sketches and mockups.

## Deployment

Production runs at [iulianlounge.com](https://iulianlounge.com) on Oracle Cloud ARM (Madrid). Docker Compose runs Caddy, which serves this SPA and proxies `/api` to the backend. The compose file is in `deploy/` of the [backend repo](https://github.com/iulian640/iulianlounge-backend).

## Process

I worked from a Jira board with sprints: 50 tasks in 15 epics. Commits follow the conventional commits format and include the Jira key (`IUL-NN`).

| Sprint | Content | Dates |
| --- | --- | --- |
| Sprint 1 | Auth and wallet | 3 to 17 Jul |
| Summer | 3D lounge and its performance lab | Jul–Sep |
| Sprint 8 | Full auth | 16 to 22 Sep |
| Sprint 9 | Wallet, HUD and mobile | 25 Sep to 1 Oct |
| Sprint 10 | Bar and blackjack | 7 to 9 Oct |
| Sprint 11 | Mobile and delivery | 10 to 13 Oct |

## Author

Iulian Timofei. [GitHub](https://github.com/iulian640).
