# Leyes de rendimiento del lounge

Reglas permanentes del proyecto (decisión de Iulian, última revisión
2026-07-15 noche), destiladas de cuatro sagas medidas: la de las sombras
(2026-07-13, 240→75fps), la de la carga (2026-07-14, 57s→16s), el
laboratorio de clustered lighting + barrida bidireccional + vidrio de
botellas (2026-07-15 tarde, banco headless) y su corrección en pantalla a
clocks interactivos esa misma noche (240Hz, misma máquina — ver ley 18: el
banco headless corría con el iGPU sin boost de clocks, ~3.5x más lento que
la lectura interactiva, y la dirección de dos A/B se invirtió: clustered
lighting y la transmisión de las botellas volvieron a su estado anterior,
leyes 3 y 8). Toda pieza nueva —decor, luces, materiales— las cumple. Si
una pieza necesita saltarse una ley, se mide antes (en pantalla, a clocks
interactivos) y se decide con datos. Las leyes 15-19 son las más recientes;
están al final para no correr la numeración de las que ya se citan por
número en el código (ley 5, 6, 9, 12).

## Luces

1. **Las sombras se proyectan con SpotLight; las PointLight solo iluminan.**
   Una PointLight con sombra renderiza un cubo de 6 mapas y muestrearlo por
   píxel cuesta ~6× más (medido: 8 cubos = 240→75fps).
2. **Presupuesto de sombras: 3 luces con sombra en toda la escena** (2 lámparas
   + foco del escenario). Cada sombra nueva mete su muestreo PCF en TODOS los
   programas de shader y consume una textura del presupuesto WebGL (16/shader).
   Ampliarlo es decisión de dirección, no de pieza.
3. **Luz nueva = PointLight o SpotLight SIN sombra, alcance corto, decay 2.**
   Van batcheadas: coste CERO en el código de los shaders, sea cual sea el
   motor de agrupación. **`DynamicLighting` (arrays de uniforms) es el motor
   por defecto**, asignado a `renderer.lighting` en `createLounge.js`, tanto
   en WebGPU como en el fallback WebGL2. `ClusteredLighting` (tiles +
   z-slices) quedó revertida el 2026-07-15 (commit `ddfe598`) tras medir EN
   PANTALLA a clocks interactivos: 110-120fps (clustered) vs 115-124fps
   (dynamic) — neutro a ligeramente peor, a
   cambio de ~7 programas y +3.5s de compilación en frío que se paga SIEMPRE
   en el arranque. El 2.11x que dio el banco headless
   solo existe en el régimen saturado por el iGPU sin boost de clocks (ver
   ley 18) — sigue siendo un proxy válido para hardware genuinamente débil,
   no para la máquina de referencia. Queda documentada como opción
   re-evaluable, SOLO si llegan quejas reales de FPS de visitantes con
   hardware bajo; si se retoma, medir de nuevo en pantalla antes de
   asignarla por defecto. El efecto "la mesa bloquea la luz" se sigue
   consiguiendo gratis acortando el alcance (la luz muere antes de llegar
   al suelo).
4. **RectAreaLight prohibida.** Es la única luz no batcheable: su evaluación
   LTC (2 tablas de textura + mates gordas) se desenrolla en cada fragment
   shader de cada programa. La trasbarra ya pasó por esto: fila de puntuales.
5. Si sube el número de PointLight por encima del tope, subir
   `maxPointLights` de DynamicLighting en `createLounge.js` — OJO
   (corregido 2026-07-14 contra el código): las luces que pasan del tope
   se DESCARTAN con un warning en consola, dejan de iluminar; no van
   desenrolladas como creíamos. Esta ley es del motor `DynamicLighting`
   (por defecto en toda la escena desde el revert del 2026-07-15, ver ley
   3); si algún día vuelve `ClusteredLighting`, esta ley no aplica — su
   límite es otro (tiles/z-slices), sin medir todavía.

## Materiales (lo que de verdad crea programas de shader)

6. **Cero programas nuevos en decor.** Los programas se deduplican por el
   código WGSL generado: color, roughness, metalness, envMapIntensity y las
   intensidades son *uniforms* — NO crean programa. Lo que SÍ forkea programa:
   presencia de mapas (map/normalMap/alphaMap...), `side`, clearcoat/aniso
   (Physical), skinning, InstancedMesh (uuid propio) y `receiveShadow`.
7. **¿Solo cambia el tinte? `material.clone()`** — comparte texturas y
   programa. ¿Misma pinta sin mapas? Reutilizar los materiales de `salon.js`
   (woodDark, woodTrim, woodPanel, brass, velvet, leather...).
8. **MeshPhysicalMaterial solo donde se paga**: la laca de barra/suelo y el
   cristal. Todo lo mate es MeshStandardMaterial (la aniso 0.3 del escenario
   era invisible y costaba un programa entero de los gordos). **La
   transmisión real (`transmission: 1`) vuelve a estar prohibida por
   defecto**, con matiz: el banco headless la dio "dentro del ruido" a
   ~32fps, pero medida EN
   PANTALLA a clocks interactivos (2026-07-15 noche) cuesta ~2ms/frame fijos
   — invisibles en un frame de 30ms, pero ~20-25% de un frame de 9ms a
   110-120fps (80-105fps con botellas vs 110-120 sin ellas). Revertido
   (commit `249639c`). Solo es adoptable si una medición EN PANTALLA a
   clocks interactivos (no el banco headless) absuelve la pieza concreta —
   régimen saturado no vale como excusa aquí porque el coste es
   proporcional al framerate, no al régimen (ver ley 18). Si se mide
   limpio en pantalla, sigue aplicando compartir material por rol/color y
   nunca instanciar uno por botella (ver ley 6 y ley 16).
9. **`userData.hideFromEnv = true`** en emissives cercanos, pantallas de
   lámpara y piezas menudas: cada material visible en la captura de entorno
   compila una segunda variante de pipeline y los brillos salen como manchas
   en la laca.
10. **Translúcidos grandes (conos de haz, velos) con cuentagotas**: castigan
    por overdraw. Etiquetarlos (`userData.haz`) para que la dieta del fallback
    WebGL2 pueda apagarlos.

## Arranque

11. **Nada de trabajo síncrono pesado antes del telón.** La compilación va por
    `scenePass.compileAsync()` DESPUÉS de la captura de reflejos (compilar sin
    envMap y recompilar eran dos tandas; la primera se tiraba entera). No
    añadir renders síncronos nuevos al arranque.
12. **Toda pieza nueva de decor se estrena midiendo**: la consola imprime
    `[lounge] arranque (ms)` con los tramos (assets/reflejos/compilacion/
    barrida) y queda en `window.__loungeTiming`. Si `compilacion` crece al
    añadir una pieza, esa pieza está creando programas — volver a la ley 6.
    Bisección rápida: `?sin=cortinas,focos,lamparas,ceniceros,humo,cocteleria,repisa`.
13. La primera visita paga la compilación entera; las siguientes van con la
    caché de disco de Dawn (~5s, verificado −91%). Incógnito y datos borrados
    pagan completo: el objetivo sigue siendo bajar el coste en frío.

## Fallback WebGL2 (Firefox sin WebGPU, visitas http por LAN)

14. El fallback va a dieta automática (sin sombras, sin conos de niebla,
    resolución nativa) — no romper ese camino en `createLounge.js` y etiquetar
    lo que deba apagarse allí.

## Añadidas 2026-07-15 (laboratorio de rendimiento)

15. **La barrida de calentamiento cubre SIEMPRE ambos sentidos de giro**
    (ida con yaw creciente Y vuelta con yaw decreciente), no solo uno. Un
    barrido unidireccional deja sin precompilar las orientaciones del
    sentido contrario: el primer giro del jugador en ese sentido dispara un
    hipo de ~410ms. Doblar los pasos de la barrida (ida+vuelta) NO dobla su
    coste: la vuelta reutiliza orientaciones ya tocadas por la ida, así que
    su trabajo de bind-group/uniforms es mucho más barato (medido: +18%,
    no +100%, al pasar de 8 a 16 pasos). Ver ley 12: sigue midiéndose por
    `__loungeTiming.barrida`.
16. **No instanciar Groups multi-malla con materiales por-uuid.** Un Group
    con submallas que se fabrican su propio material (en vez de compartir
    instancias de `materials`/`V.*`) dispara un programa de shader nuevo por
    cada combinación material×malla — medido 69→431 programas con el
    patrón ingenuo. Compartir SIEMPRE materiales por rol/color, nunca por
    instancia (extiende la ley 6 a piezas compuestas de varias mallas, no
    solo a InstancedMesh).
17. **Nada de hot-swap de material con `.needsUpdate = true` en runtime**
    (cambiar de variante en caliente, p.ej. al accionar un mando). Congela
    el frame ~0.7s en frío mientras compila la variante nueva sobre la
    marcha. Las variantes que haga falta usar en producción se precompilan
    durante la barrida (ley 11/12/15), nunca se generan bajo demanda.
18. **Las decisiones de adopción se confirman EN PANTALLA, a clocks
    interactivos — nunca solo con el banco headless.** Descubierto
    2026-07-15 noche: la misma escena, el mismo iGPU, midió ~33fps en el
    banco headless a calidad 'alta' donde la lectura interactiva en
    pantalla daba 115-124fps — sin ventana visible el driver no sube el
    reloj del iGPU (DVFS de fondo), así que el banco entero corre en un
    régimen ~3.5x más lento. Dentro de ESE régimen el banco sigue siendo
    válido para comparar A/B (leyes 3 y 16 se apoyan en él sin problema),
    pero un coste fijo por frame pesa proporciones muy distintas según el
    framerate real (2ms son 6% de un frame de 30ms e invisibles en el
    ruido, y ~20-25% de un frame de 9ms a 110fps) — la DIRECCIÓN de un A/B
    puede invertirse entre regímenes, como pasó con la transmisión (ley 8)
    y con `ClusteredLighting` (ley 3). Regla: el banco decide DENTRO de su
    régimen (bueno para detectar programas nuevos, hipos de compilación,
    censos); la ADOPCIÓN de una pieza en producción se confirma con una
    lectura en pantalla a clocks interactivos antes de fijarla por
    defecto. El régimen saturado del banco sigue siendo un proxy legítimo
    para hardware genuinamente débil (visitantes con iGPU real de gama
    baja) — la lección es de alcance, no está muerta.

## Calidad / upscaling

19. **El tier `baja` (FSR) se queda, con el alcance recortado a lo que
    realmente compra**: en la máquina de referencia (sin saturar) solo
    suma ~10fps y el suavizado se nota a ojo en un panel 240Hz — el +74%
    que dio el laboratorio pertenece al régimen saturado, que es
    justamente el proxy de las máquinas débiles que elegirían 'baja'. Se
    mantiene como tier opcional porque no cuesta nada si no se activa (la
    ruta 'alta' queda intacta, FSR se construye perezosamente solo al
    seleccionar 'baja' desde el panel de afinado) — no se hace default, ni
    se toca el camino 'alta'.
