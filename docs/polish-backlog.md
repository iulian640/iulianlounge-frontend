# Backlog de pulido del lounge — "que parezca Iulian's"

> Estado a 2026-07-14 (tras la saga de rendimiento y la sesión de vestir la
> barra). Toda pieza nueva cumple docs/leyes-de-rendimiento.md.

## Hecho (referencia rápida)

- Bloom selectivo, parquet con laca, arquitectura (cornisa/pilastras/zócalo),
  puerta con ventanilla, letrero Limelight con marquesina, humo de puros,
  ceniceros, lámparas de pie, varal de focos, cortinas de teatro, expositor
  de fedoras, frente de barra panelado con latón y tira de luz oculta,
  botellas de marca reales en la trasbarra (mejorables), tests 97% y carga
  57s→~11s en frío / ~5s repetida.

## Pendiente — por impacto

- [ ] **Músicos de espaldas al público**: girarlos (rotationY en furnish).
      Barato y muy visible bajo los focos del varal.
- [ ] **El jazz**: el gramófono sigue mudo. Pista CC0 decente (la del
      workflow quedó vetada: sonaba fatal) + `THREE.PositionalAudio` desde
      el gramófono + crédito en CREDITS.md.
- [ ] **Parroquianos sentados**: 2-3 NPCs en mesas. OJO veto vivo: los
      Quaternius "no pegan nada" — o pose sentada discreta o el proyecto
      grande de personajes propios.
- [ ] **Blackjack vestido**: cartas y fichas sobre el fieltro (Poker Chips
      de Jarlan Perez, en el stash). Conecta con el juego del Sprint 3.
- [ ] **Fotos de época enmarcadas**: los cuadros procedurales fueron
      VETADOS; alternativa fotos sepia (texturas reales, material
      compartido = un solo programa).
- [ ] **Detalles menores**: reloj de pared (asset en stash), teléfono de
      candelabro (sin asset CC0 — procedural).
- [ ] **Gato saxofonista** (IUL-53, recortable): low-poly propio en el
      escenario.

## Deudas de afinado

- [ ] **Pasada de brillos** (2026-07-14): tras el override de la captura de
      entorno "algunas cosas se ven muy brillantes" (Iulian). Sospecha:
      cubemap plano refleja más parejo en latón/laca — probar mando
      'reflejos' ~0.5 y matizar el color del override.
- [ ] **Trasbarra mejorable** (2026-07-14, veredicto de Iulian sobre las
      botellas: "medio bien"): siluetas más fieles, mejor reparto, quizá
      vidrio con más presencia.

## Recortado / vetado (no reabrir sin Iulian)

- Espejo tras la barra (vetado 2026-07-13, sigue en el stash).
- Cuadros procedurales (vetados 2026-07-13, en el stash).
- Sofá y rincón doméstico, plantas de interior (2026-07-12).
- Neón atómico: jamás — marquesina cálida (CONCEPT.md).
- RectAreaLight y sombras nuevas: ver docs/leyes-de-rendimiento.md.
