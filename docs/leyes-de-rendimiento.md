# Leyes de rendimiento del lounge

Reglas permanentes del proyecto (decisión de Iulian, última revisión
2026-07-15), destiladas de tres sagas medidas: la de las sombras (2026-07-13,
240→75fps), la de la carga (2026-07-14, 57s→16s) y el laboratorio de
clustered lighting + barrida bidireccional + vidrio de botellas (2026-07-15).
Toda pieza nueva —decor, luces, materiales— las cumple. Si una pieza necesita
saltarse una ley, se mide antes y se decide con datos. Las leyes 15-17 son
las más recientes; están al final para no correr la numeración de las que ya
se citan por número en el código (ley 5, 6, 9, 12).

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
   motor de agrupación. **Desde 2026-07-15, `ClusteredLighting` (tiles +
   z-slices) es la opción por defecto en WebGPU**, asignada a
   `renderer.lighting` ANTES de `renderer.init()` en `createLounge.js`
   (usando `navigator.gpu` como proxy porque el backend real todavía no
   existe a esa altura) — medido +78% de FPS en régimen estable con las 35
   luces de la escena (31.8→56.7fps, umbral de beneficio de laboratorio
   ~20 luces en adelante), a cambio de ~7 programas y ~3s más de
   compilación en frío (se paga una vez en el arranque, se cobra cada
   frame). El fallback WebGL2 se queda en `DynamicLighting` (arrays de
   uniforms): ahí el salto no compensa, el arranque en frío casi se
   triplica. El efecto "la mesa bloquea la luz" se sigue consiguiendo
   gratis acortando el alcance (la luz muere antes de llegar al suelo).
4. **RectAreaLight prohibida.** Es la única luz no batcheable: su evaluación
   LTC (2 tablas de textura + mates gordas) se desenrolla en cada fragment
   shader de cada programa. La trasbarra ya pasó por esto: fila de puntuales.
5. Si sube el número de PointLight por encima del tope, subir
   `maxPointLights` de DynamicLighting en `createLounge.js` — OJO
   (corregido 2026-07-14 contra el código): las luces que pasan del tope
   se DESCARTAN con un warning en consola, dejan de iluminar; no van
   desenrolladas como creíamos. Esta ley es del motor `DynamicLighting`
   (fallback WebGL2 desde 2026-07-15, ver ley 3); `ClusteredLighting` no
   tiene este tope de uniforms — su límite es otro (tiles/z-slices), sin
   medir todavía.

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
   era invisible y costaba un programa entero de los gordos). La
   transmisión real (`transmission: 1`) NO es prohibitiva de por sí: medida
   en las 90 botellas de la trasbarra (2026-07-15) cuesta +2 programas y el
   FPS queda dentro del ruido de la máquina — la prohibición general que
   pesaba sobre la transmisión queda levantada, SIEMPRE que el material se
   comparta por rol/color y nunca se instancie uno por botella (ver ley 6 y
   ley 16). Sigue siendo obligatorio medir caso por caso antes de
   generalizar a otra pieza.
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
    Bisección rápida: `?sin=cortinas,focos,lamparas,ceniceros,humo`.
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
