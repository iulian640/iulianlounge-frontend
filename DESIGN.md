---
name: "Iulian's (IulianLounge)"
description: "Un speakeasy de los años 20 en el navegador: medianoche, latón de 1 px y oro solo para el dinero y el letrero."
colors:
  medianoche: "#0b1514"
  fieltro: "#111f1d"
  tapete: "#172925"
  laton: "#c9a45c"
  oro: "#e8cd8f"
  marfil: "#efe5cc"
  humo: "#93a69e"
  burdeos: "#b0524c"
  burdeos-claro: "#d9857d"
  linea: "rgba(201, 164, 92, 0.28)"
  linea-suave: "rgba(201, 164, 92, 0.14)"
typography:
  sign:
    fontFamily: "Limelight, serif"
    fontSize: "1.6rem"
    fontWeight: 400
    letterSpacing: "0.06em"
  title:
    fontFamily: "Cormorant, Georgia, serif"
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.1
  speech:
    fontFamily: "Cormorant, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Jost, 'Segoe UI', sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Jost, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.2em"
  figure:
    fontFamily: "'IBM Plex Mono', Consolas, monospace"
    fontSize: "1.05rem"
    fontWeight: 400
rounded:
  panel: "2px"
  bubble: "18px"
  tab-edge: "6px"
  sheet: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  target: "44px"
components:
  hud-plate:
    backgroundColor: "rgba(17, 31, 29, 0.94)"
    textColor: "{colors.marfil}"
    rounded: "{rounded.panel}"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.marfil}"
    textColor: "{colors.medianoche}"
    rounded: "{rounded.panel}"
    typography: "{typography.label}"
    height: "52px"
    padding: "0 18px"
  button-secondary:
    backgroundColor: "{colors.fieltro}"
    textColor: "{colors.oro}"
    rounded: "{rounded.panel}"
    typography: "{typography.label}"
    height: "52px"
    padding: "0 18px"
  bubble-barman:
    backgroundColor: "{colors.marfil}"
    textColor: "{colors.medianoche}"
    rounded: "{rounded.bubble}"
    typography: "{typography.speech}"
    padding: "11px 18px"
  bubble-member:
    backgroundColor: "{colors.medianoche}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.bubble}"
    typography: "{typography.body}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.medianoche}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.panel}"
    height: "48px"
    padding: "0 16px"
  chip-quick:
    backgroundColor: "{colors.tapete}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.panel}"
    height: "44px"
  sheet:
    backgroundColor: "{colors.fieltro}"
    textColor: "{colors.marfil}"
    rounded: "{rounded.sheet}"
---

# Design System: Iulian's (IulianLounge)

## Overview

**Creative North Star: "El local a media luz"**

Un club clandestino de los años 20 visto de noche: fondos que casi se pierden en la oscuridad (medianoche, fieltro, tapete), filetes de latón de 1 px que marcan la estructura, y una sola luz cálida, el oro, que solo se enciende para el dinero y para el letrero. Nada brilla gratis: el oro se gana. La misma identidad vive en el lounge 3D de escritorio y en el salón 2D del móvil; el móvil no es el escritorio encogido, son dos salas a pantalla completa (la barra y la mesa de cartas) entre las que se cruza deslizando.

La densidad es de local pequeño: pocas cosas, bien iluminadas, objetivos grandes para el dedo. Las escenas se dibujan en CSS (baldas, botellas, lámpara, mostrador con pasamanos de latón, tapete verde) y el barman habla en bocadillos marfil, como un camarero normal con gracia. No se usa emoji, ni cristal esmerilado, ni iconos de fuente.

**Key Characteristics:**
- Oscuridad de fondo, latón de 1 px como estructura, oro reservado.
- Cuatro voces tipográficas, cada una con un oficio.
- Plano por defecto; la profundidad viene de capas tonales y de sombras suaves de apoyo.
- Radio de 2 px en paneles y placas; los bocadillos son la única forma redondeada generosa.
- Dos momentos de autor: la copa que se posa en el mostrador y el delta de saldo.

## Colors

Paleta de sala a oscuras con una sola luz cálida; el valor hex normativo está en el frontmatter.

### Primary
- **Oro de letrero** (#e8cd8f): dinero (saldo, precios, premios, apuesta), el letrero «IULIAN'S», el anillo de foco, el caret y la selección. Nunca relleno de botón ni de panel.

### Secondary
- **Latón** (#c9a45c): estructura. Filetes de 1 px, bordes de mostrador, etiquetas de rango, iconos de borde, puntos de sala.
- **Burdeos** (#b0524c): pérdida, deuda, error. **Burdeos claro** (#d9857d) cuando va sobre fondo oscuro (delta negativo, fallos).

### Neutral
- **Medianoche** (#0b1514): fondo de la app y texto sobre marfil.
- **Fieltro** (#111f1d): superficie base (hoja de la barra, placas).
- **Tapete** (#172925): superficie elevada, hover y chips.
- **Marfil** (#efe5cc): texto principal, bocadillos, acción primaria.
- **Humo** (#93a69e): texto secundario e iconos inactivos.
- **Línea** (rgba(201,164,92,0.28)): borde de placa y campo. **Línea suave** (rgba(201,164,92,0.14)): separadores de lista.

### Named Rules
**The Oro Se Gana Rule.** El oro es solo dinero y letrero. Ganar = oro, perder = burdeos. Ningún botón lleva losa dorada ni degradado de oro; la acción primaria es marfil plano con texto medianoche.

**The Latón Fino Rule.** La estructura se dibuja con filetes de latón de 1 px (la barra del mostrador es la excepción de 4 px, por ser objeto de la escena).

## Typography

**Sign Font:** Limelight (con serif)
**Title and Speech Font:** Cormorant (con Georgia, serif)
**UI Font:** Jost (con Segoe UI, sans-serif)
**Number Font:** IBM Plex Mono (con Consolas, monospace)

**Character:** Rótulo de neón de los años 20, serif de carta de bar para lo que se lee con calma, geométrica limpia para la interfaz y mono tabular para que las cifras no bailen.

### Hierarchy
- **Sign** (Limelight 400, 1.6rem, tracking 0.06em, 1.3rem en apaisado bajo): solo el letrero «IULIAN'S» y su eco en el tapete. Es el logo, no un estilo de título.
- **Title** (Cormorant 600, 1.25-1.3rem): nombres de copa, pestañas de la hoja, encabezados de panel.
- **Speech** (Cormorant 600, 18-19px, 15px si es largo; 1.15rem en el chat): todo lo que dice el barman o el crupier, en bocadillo marfil.
- **Body** (Jost 400, 0.9rem, 1.4): mensajes del socio, estados, avisos (12-14px).
- **Label** (Jost 500, 11-12px, tracking 0.2em, mayúsculas): texto de botones de acción (Pedir, Pedir carta, Plantarse, Enviar).
- **Figure** (Plex Mono, 14-18px, tabular-nums): saldo, precios, pagos, fichas de apuesta. Oro cuando es dinero; el delta negativo en burdeos claro.

### Named Rules
**The Cuatro Voces Rule.** Limelight solo para el letrero; Cormorant para títulos y palabra hablada; Jost para UI; Plex Mono para cifras. Una voz por oficio.

**The Input 16 Rule.** Todo campo de texto va a 16px para que el móvil no haga zoom.

## Layout

Móvil primero, altura `100dvh` sin scroll de página. Arriba la placa del HUD de 44 px; debajo, el nombre de la sala a la izquierda y los puntos de sala a la derecha; el resto es un carril horizontal con `scroll-snap` obligatorio donde cada sala ocupa el 100 % del ancho. Sin scroll horizontal a 320 px. La barra reserva ~55 % de alto a la escena y deja asomar la hoja inferior (250 px visibles) con pestañas «La carta · Charlar». Ritmo de espacio sobre 4, 8, 12, 16 px; objetivos táctiles de 44 px mínimo (52 px en acciones de la mesa, 48 px en campos y botones de envío). Los tiradores de borde («La mesa ›», «‹ La barra») son pestañas verticales de 44 px de ancho y alto mínimo 124 px pegadas al borde.

En apaisado bajo (`orientation: landscape` y `max-height: 520px`) la hoja pasa a columna fija a la derecha (46 %) con filete de latón a la izquierda, y la mesa se divide en tapete y bandeja de acciones. Respeta `env(safe-area-inset-bottom)`.

## Elevation & Depth

Híbrido: tonal por defecto y sombras suaves de apoyo. La jerarquía sale de la escala medianoche < fieltro < tapete y de los filetes de latón. Las sombras son difusas y negras (paneles flotantes `0 10px 28px rgba(0,0,0,0.5)`, hoja `0 -12px 30px rgba(0,0,0,0.55)`, bocadillo `0 10px 26px rgba(0,0,0,0.45)`, cartas `0 6px 12px rgba(0,0,0,0.45)`); en escena hay un halo cálido de lámpara. Las placas llevan fondo fieltro al 94-96 % de opacidad.

### Named Rules
**The Sin Cristal Rule.** Ningún `backdrop-filter`, sobre todo sobre el canvas 3D. La opacidad alta de la placa resuelve la legibilidad sin desenfoque.

## Shapes

Geometría seca y de mueble: radio de 2 px en placas, paneles, botones, campos y chips; 14 px solo en la esquina superior de la hoja; 6 px en los tiradores de borde; el bocadillo es la forma blanda (18 px con una esquina de 4 px hacia quien habla). Cartas de 58x82 px con 6 px de radio, fichas redondas de 60 px, tapete con borde de madera de 6 px y filete de latón interior. Iconos solo en SVG de trazo (1.5-1.8 px, extremos redondos, `currentColor`).

## Components

### Buttons
- **Shape:** esquina de 2 px, altura mínima 44 px (52 px en la mesa).
- **Primary:** marfil plano (#efe5cc) con texto medianoche, Jost 12px en mayúsculas con tracking 0.2em. Es la acción principal de la mano.
- **Secondary:** fieltro al 90 %, filete latón al 60 %, texto en Jost mayúsculas; hover con tapete o brillo +10 %.
- **Focus:** anillo de 2px en oro, con offset de 2-4px (o -2px dentro de placas).

### Bocadillos
Marfil con texto medianoche en Cormorant 600, radio 18/18/18/4. Barman a la izquierda; el socio contesta con bocadillo sin relleno, filete de latón y Jost. El resultado de la mano se escribe dentro del bocadillo del crupier, con tintas oscuras para contraste sobre marfil (ganar #7a5a14, perder #8f2e28).

### Inputs / Fields
Fondo medianoche, filete `--linea`, radio 2 px, 48 px de alto, 16px. Foco: anillo oro de 2px. Solo lectura: opacidad 0.5.

### Navigation
Puntos de sala: círculo de 8 px con borde latón; el activo se rellena de oro y crece 1.25. Pestañas de la hoja en Cormorant con subrayado de oro de 2 px que escala en X. Hover sube el texto de humo a marfil.

### HUD plate
Placa de 44 px, fieltro al 94 %, filete `--linea`, radio 2 px. Ficha de saldo (canto de ficha dorado, cifra Plex Mono en oro, chevron SVG) + nombre y rango (rango en latón) + salir. El libro de cuentas cuelga debajo con las mismas reglas (340 px máx.). Es el mismo componente en móvil y en el overlay del lounge 3D.

### Escena de la barra
Madera oscura con listones, lámpara de latón con halo, dos baldas con botellas, barman dibujado, mostrador con pasamanos de latón de 4 px. La copa entra al mostrador con `settle` (520 ms, `cubic-bezier(0.16,1,0.3,1)`).

### Mesa de cartas
Tapete verde (#1d4033 a #2b5a46) con borde de madera, cartas marfil cálido (#f3ead6) con tinta #1c1a17 y rojo #9a2f2a, dorso a rayas tapete/medianoche con borde de latón, fichas de apuesta 10/20/50 en Plex Mono y plazas con borde discontinuo oro al 35 %.

### Motion
Duraciones 150 ms (`--duracion-corta`) y 300 ms (`--duracion-media`), curva ease-out o `cubic-bezier(0.22,1,0.36,1)` / ease-out-expo. Solo `transform` y `opacity` para movimiento. Los momentos de autor son dos: la copa que se posa en el mostrador y el delta de saldo que sube y se desvanece (1000 ms). Cada transición y animación tiene su `prefers-reduced-motion: reduce` con alternativa sin movimiento.

## Do's and Don'ts

### Do:
- **Do** reservar el oro (#e8cd8f) para dinero y letrero; el éxito es oro, la pérdida burdeos.
- **Do** dibujar estructura con filetes de latón de 1 px y radio de 2 px en paneles y placas.
- **Do** hacer hablar al barman en bocadillos marfil de Cormorant, en frases de camarero normal, nunca estilo telegrama.
- **Do** usar iconos SVG de trazo; objetivos de 44 px; inputs de 16px.
- **Do** mover entre 150 y 300 ms con ease-out-expo y dar siempre fallback con `prefers-reduced-motion`.
- **Do** mantener la placa del HUD como pieza única compartida con el lounge 3D.

### Don't:
- **Don't** poner losas, degradados o rellenos de oro en botones; la primaria es marfil plano.
- **Don't** usar `backdrop-filter` ni cristal sobre el canvas 3D.
- **Don't** usar emoji, iconos de fuente o glifos como iconos.
- **Don't** añadir momentos animados más allá de la copa y el delta de saldo.
- **Don't** usar Limelight fuera del letrero ni fuentes de sistema para títulos.
- **Don't** escribir en mayúsculas pequeñas con tracking ancho como etiqueta decorativa sobre un título.
