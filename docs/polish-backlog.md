# Backlog de pulido del lounge — "que parezca Iulian's"

> Estado a 2026-07-12. El blockout (IUL-27) pedía escala y atmósfera
> aproximadas; esto es la lista de lo que separa el estado actual de un
> speakeasy creíble. Priorizada por impacto visual / esfuerzo.

## P1 — máximo impacto

- [x] **Bloom** (letrero, velas, apliques con halo) — hecho 2026-07-12
- [ ] **Suelo con tablones**: el color plano mata el lujo. Textura de madera
      CC0 (ambientCG/Poly Haven) con repeat, o tablones procedurales.
- [ ] **Arquitectura de la caja**: cornisa perimetral, pilastras entre los
      cuadros, arco/moldura en la puerta de entrada. La caja desnuda parece
      local de ensayo.
- [ ] **Puerta de entrada de verdad** (con mirilla — el santo y seña se pide
      por ahí).

## P2 — identidad

- [ ] **Letrero con Limelight**: convertir la fuente a typeface.json
      (facetype.js) y sustituir la helvetiker; añadir bombillas alrededor
      del marco como en el mockup de Figma.
- [ ] **Espejo tras la barra** (clásico de bar: duplica luz y profundidad —
      en Three.js, `Reflector` con opacidad baja).
- [ ] **Cuadros con contenido**: retratos/carteles art déco en los marcos
      (texturas generadas, estilo de la biblia).
- [ ] **Humo**: planos con textura de humo animada o partículas suaves bajo
      las lámparas. El aire del club se tiene que ver.
- [ ] **El jazz**: pista CC0 (freepd.com u otra), `THREE.PositionalAudio`
      saliendo del gramófono + crédito.

## P3 — vida

- [ ] **Parroquianos**: 2-3 NPCs sentados (clip Sit_Chair de Quaternius) en
      mesas y barra.
- [ ] **Banda completa**: trompeta y batería de jazz (candidatos ya cazados:
      Trumpet de jeremy, Drumkit de J-Toastie — ver informe del workflow).
- [ ] **Vestir NPCs**: Ultimate Modular Men/Women Packs de Quaternius
      (chaleco, sombrero, barman con pajarita) — requiere exportar a glTF.
- [ ] **Blackjack vestido**: cartas y fichas sobre el fieltro (Poker Chips
      de Jarlan Perez, cazado en el workflow).
- [ ] **Detalles de época**: reloj de pared (Clock de jeremy), teléfono de
      candelabro, cenicero.

## Recortado / descartado

- Sofá y rincón doméstico (vetado 2026-07-12: "salón de casa").
- Plantas de interior (vetadas 2026-07-12).
- Neón atómico: jamás — marquesina cálida (CONCEPT.md).
