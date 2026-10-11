---
version: 1
slug: "src-views-salonmovil-vue"
primary_target: "src/views/SalonMovil.vue"
related_targets: ["src/components/salon"]
---

Scope: experiencia móvil 2D (teléfonos y tablets táctiles) del club Iulian's. Visitor mode: Experience.
Audience: reclutadores desde el CV (30 s en el móvil) y la demo en clase en Firefox modo móvil.
Job: entender el club, charlar con el barman y jugar una mano de blackjack en el primer minuto.
Constraints: stores, composables y tests intactos; 44 px, inputs 16 px, sin scroll horizontal a 320, vertical y apaisado, reduced motion. Escenario cerrado fuera. Acceso y /privacidad solo pulido. Muestra primero (sala de la barra) con OK en pantalla.

## Direction contract

THESIS: El móvil está dentro de Iulian's: dos salas a pantalla completa, la barra y la mesa de cartas, una al lado de la otra; cambias de sala como quien cruza el local. Rechaza la columna de rincones/tarjetas bajo una cabecera.

OWN-WORLD: La identidad que ya existe: fondos medianoche/fieltro/tapete, filetes de latón de 1 px, oro solo para dinero y letrero, bocadillos marfil en Cormorant, Jost en la UI y Plex Mono en cifras. Escenas dibujadas en CSS (baldas, botellas, lámpara, mostrador con pasamanos de latón, tapete verde). Iconos en SVG, sin emoji ni cristal.

STORY: Ve la barra y al barman hablándole, entiende que es un club, abre la carta o charla, pide y ve bajar las monedas y aparecer la copa; desliza a la mesa y juega una mano.

FIRST VIEWPORT: Placa del HUD fija arriba (44 px). Debajo, «La barra» a la izquierda y los puntos de sala a la derecha. Escena al ~55 % de alto: lámpara, dos baldas, barman centrado a la izquierda, bocadillo a la derecha, mostrador con la copa. Abajo asoma la hoja con las pestañas «La carta · Charlar» y tres copas con su botón Pedir. Tirador «La mesa ›» en el borde derecho, a media altura. Firma: el cambio de sala con scroll-snap horizontal y la copa que se posa en el mostrador al pedir.

FORM: Dos salas; posición 2 de la lista ordenada; seed key da290389.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
