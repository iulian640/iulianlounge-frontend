# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Reclutadores y gente que mira el porfolio.** Abren el enlace desde el CV, muchas veces en el móvil, y en unos segundos deciden si el proyecto merece más atención.
- **La clase del bootcamp y el profesor.** Iulian lo presenta en directo delante de la clase, en Firefox: la versión de escritorio (lounge 3D) y la móvil (Firefox en modo diseño adaptable). Puntúan el producto, el proceso y el frontend (componentes, hooks, tests, responsive).

## Product Purpose

IulianLounge es un speakeasy de los años 20 en el navegador: el club Iulian's. Entras como recién llegado, pides copas, hablas con el barman, juegas al blackjack y, según lo que gastas, el club te reconoce y subes de rango. Tiene dos propósitos a la vez: ser una experiencia que se recuerde y demostrar un stack profesional (Java 21 / Spring Boot 4 / PostgreSQL detrás, Vue 3 delante).

En el móvil, el éxito en el primer minuto es: **entender qué es el club**, **charlar con el barman** y **jugar una mano de blackjack**.

## Positioning

No es una web con un 3D decorativo: es un juego pequeño con un backend serio (cartera con libro de movimientos, idempotencia, rangos derivados del gasto, rate limit, barman con LLM opcional). En escritorio se recorre en 3D; en el móvil es una experiencia 2D propia, pensada para el dedo, no el escritorio encogido.

## Operating Context

- Escritorio: lounge 3D navegable (WebGPU con caída a WebGL2), te acercas al barman o a la mesa y pulsas E.
- Móvil y tablets táctiles: salón dibujado en 2D, sin canvas. La decisión se toma al cargar (puntero táctil o menos de 768 px de ancho).
- Demo en directo en Firefox. En producción en https://iulianlounge.com.

## Capabilities and Constraints

- Funciones que existen y se conservan: acceso (entrar / hacerse socio), saldo y libro de cuentas, La Barra (carta fija de 5 copas: Bathtub Gin 5, Bee's Knees 10, Gin Rickey 15, Sidecar 25, French 75 40), rangos derivados de lo gastado (Recién llegado · Cliente · Habitual · Socio), invitación de la casa (+50 una vez al día al llegar a 0), barman con frases del catálogo y preguntas rápidas (texto libre con LLM solo si hay clave; ahora en producción está apagado), blackjack (apuestas 10/20/50, pedir / plantarse, la banca se planta en 17, blackjack paga 3:2), página de privacidad.
- Moneda de la casa: «monedas» (ES) / «coins» (EN).
- La lógica (stores de Pinia, composables) y sus tests se conservan; lo que cambia en un rediseño es la presentación.
- Bilingüe ES/EN con vue-i18n; el castellano es el idioma principal.
- Entrega: martes 13-oct a las 8:00.

## Brand Commitments

- Nombre del club en la ficción: **Iulian's**; el proyecto se llama IulianLounge.
- El letrero «IULIAN'S» es la pieza de marca.
- El barman habla en bocadillo de diálogo, como un camarero normal con gracia. Nunca en estilo telegrama, nunca sobreactuado (fuera «pejilgero», «la casa no olvida», «santo y seña»).
- La identidad visual actual (paleta, tipografías, letrero, barman dibujado) es compartida con el lounge 3D y se conserva.

## Evidence on Hand

- Código y tests reales: 636 tests en el backend (cobertura ~99 %), 958 tests unitarios y 8 E2E (Playwright) en el frontend.
- Documentación en el repo del backend: README y diagramas.
- No hay usuarios reales, testimonios ni métricas de uso: no inventarlos.

## Product Principles

1. La ficción se entiende sin leer: el club se explica por lo que ves y lo que te dice el barman.
2. Cada acción tiene respuesta visible: pedir, apostar o cobrar mueve el saldo y el barman lo nota.
3. El móvil es una experiencia propia, no una versión recortada del escritorio.
4. El dinero nunca pasa por el LLM: pedir y cobrar son deterministas.

## Accessibility & Inclusion

Objetivos táctiles de 44 px, inputs de 16 px, sin scroll horizontal a 320 px, vertical y apaisado, `prefers-reduced-motion` respetado, lector de pantalla con regiones `status` para los cambios de saldo y de mano.
