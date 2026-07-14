# Leyes de rendimiento del lounge

Reglas permanentes del proyecto (decisión de Iulian, 2026-07-14), destiladas de
dos sagas medidas: la de las sombras (2026-07-13, 240→75fps) y la de la carga
(2026-07-14, 57s→16s). Toda pieza nueva —decor, luces, materiales— las cumple.
Si una pieza necesita saltarse una ley, se mide antes y se decide con datos.

## Luces

1. **Las sombras se proyectan con SpotLight; las PointLight solo iluminan.**
   Una PointLight con sombra renderiza un cubo de 6 mapas y muestrearlo por
   píxel cuesta ~6× más (medido: 8 cubos = 240→75fps).
2. **Presupuesto de sombras: 3 luces con sombra en toda la escena** (2 lámparas
   + foco del escenario). Cada sombra nueva mete su muestreo PCF en TODOS los
   programas de shader y consume una textura del presupuesto WebGL (16/shader).
   Ampliarlo es decisión de dirección, no de pieza.
3. **Luz nueva = PointLight o SpotLight SIN sombra, alcance corto, decay 2.**
   Van batcheadas por `DynamicLighting` (arrays de uniforms): coste CERO en el
   código de los shaders. El efecto "la mesa bloquea la luz" se consigue gratis
   acortando el alcance (la luz muere antes de llegar al suelo).
4. **RectAreaLight prohibida.** Es la única luz no batcheable: su evaluación
   LTC (2 tablas de textura + mates gordas) se desenrolla en cada fragment
   shader de cada programa. La trasbarra ya pasó por esto: fila de puntuales.
5. Si sube el número de PointLight por encima de 24, subir `maxPointLights`
   de DynamicLighting en `createLounge.js` (si no, las extra van desenrolladas).

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
   era invisible y costaba un programa entero de los gordos).
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
