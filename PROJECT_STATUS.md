# PROJECT_STATUS — FITNESS OS

**Fase actual:** Fases 0–9 completadas, Fase 4 con el visor listo pero **sin modelos 3D** (falta contenido con licencia). Fase 10 preparada (esquema Supabase + RLS validados), **pendiente de credenciales**. Fase 11 en curso.
**App publicada:** https://emabik13.github.io/fitness-os/ (PWA instalable en iPhone; despliegue automático en cada push a `main`).
**Última actualización:** 17-nov-2026 (recomendador)

## Estado por fase

| Fase | Estado | Contenido |
|---|---|---|
| 0 Auditoría y arquitectura | ✅ | Expo SDK 58, RN 0.88, TS 6. Ver `ARCHITECTURE.md`. |
| 1 Diseño | ✅ | Tema oscuro, sistema de componentes, 5 pestañas. |
| 2 Perfil | ✅ | Onboarding en 4 pasos con Zod, edición, equipamiento, limitaciones, básicos, RIR/RPE. |
| 3 Biblioteca | ✅ | 44 ejercicios con técnica, biomecánica (7 apartados), errores, consejos, músculos por rol, variantes/sustituciones; filtros por músculo, equipamiento, dificultad y patrón; ficha de músculo con volumen semanal y evolución. |
| 4 Anatomía 3D | 🟡 | Visor WebGL (three.js) con rotación, zoom, vistas frontal/posterior/lateral, animación (reproducir, pausar, reiniciar, velocidad), resaltado por rol, carga diferida y liberación de memoria; alternativa ligera sin WebGL/nativo; manifiesto Zod que exige fuente+licencia+checksum. **Sin modelos**: todas las fichas muestran "pendiente de contenido". |
| 5 Rutinas | ✅ | Motor determinista (Full Body, Torso/Pierna, híbrido, PPL), justificación, tope 20 series directas/sem, ajuste a tiempo, recuperación, prioridades, limitaciones; editor completo. |
| 6 Entrenamiento | ✅ | Autoguardado por serie, anterior/kg/reps/RIR-RPE, tipos de serie, añadir/eliminar series, reordenar, sustituir, observaciones, descanso automático configurable, pantalla encendida, resumen con récords y comparación. Sobrevive a recargas/cierres. |
| 7 Progresión | ✅ | Doble progresión (sugerencias, nunca automáticas), progreso/variación normal/estancamiento/retroceso, 1RM estimado (Epley), récords. |
| 8 Recomposición | ✅ | Peso con media móvil y tendencia, medidas, % graso con método y margen de error, nutrición con objetivos explicados, recuperación. Fotos de progreso: pendiente (ver abajo). |
| 9 Estadísticas | ✅ | Filtros 7D–Todo; por ejercicio, músculo, entrenamiento y composición corporal. |
| 10 Sincronización | 🟡 | `supabase/migrations/0001_init.sql` (tablas, índices, RLS por usuario, trigger de conflictos) validado con PGlite. Regla de conflictos compartida (`src/sync/conflict.ts`). Copia de seguridad JSON exportar/importar sin duplicados. **Falta**: proyecto Supabase, credenciales, cliente de auth y motor push/pull. |
| 11 Validación | 🟡 | 100+ tests, E2E en navegador (iPhone emulado). Builds nativos no generados (requieren cuenta Expo; iOS en dispositivo requiere Apple Developer Program). |

## Recomendador y análisis (ampliación) ✅
- Biblioteca ampliada a **66 ejercicios** (catálogo v2): goblet, sentadilla frontal, hip thrust en máquina, patada en polea, hiperextensiones, curl nórdico, step-up, zancada inversa, press en máquina, elevaciones frontales, press cerrado, extensión con mancuerna, curl Scott, dominadas supinas, remo T, pullover, contractora, Pallof, paseo del granjero, flexiones, remo invertido, gemelos en multipower.
- **9 estilos** (Equilibrado, Fuerza, Powerbuilding, Exprés con superseries, Circuitos, Máquinas, Peso libre, Cuidado articular, Especialización) × **7 divisiones** (Full Body, Full Body alta frecuencia, Torso/Pierna, PPL, Torso/Pierna+PPL, Torso/Pierna+Full, por grupos musculares). Las 153 combinaciones válidas se prueban contra tiempo de sesión, tope de volumen y recuperación entre días.
- **Explorador de rutinas** (`/rutinas/explorar`): genera todas las combinaciones para tus días ±1, las puntúa con 8 criterios ponderados y explicados (objetivo, volumen, frecuencia, disponibilidad, probabilidad de cumplimiento, experiencia, recuperación, limitaciones; pesos adaptativos si hay mala recuperación o limitaciones), elimina duplicados y permite filtrar y ordenar.
- **Probabilidad de cumplimiento real**: modelo Beta-Binomial sobre tus semanas completas desde el primer entrenamiento, con intervalo creíble del 90 %; sin historial suficiente se muestra como suposición.
- **Análisis** (`/analisis`): constancia, curva de probabilidad por nº de sesiones, equilibrio empuje/tracción y cuádriceps/isquios, volumen bajo o excesivo, ejercicios estancados o en retroceso con variantes sugeridas, progresos y recuperación.
- Técnicas (superseries, circuitos por bloques, drop sets) guardadas en la rutina y visibles durante el entrenamiento.

## Verificación
- `npm run verify` → typecheck (app + tests) ✔, lint sin avisos ✔, Jest ✔ (lógica con SQLite real vía `node:sqlite` y `sql.js`; UI/navegación con expo-router testing-library).
- `expo-doctor` ✔ · `expo export -p android -p ios` ✔ (bundles Hermes).
- E2E en Chromium emulando iPhone 13 sobre la build web servida como GitHub Pages: onboarding → generar rutina → entrenar (recarga a mitad: datos conservados) → finalizar → progreso → nutrición → biblioteca → visor 3D (probado SOLO en local con un modelo de muestra de Khronos CC-BY, no publicado) → ficha de músculo.

## Pendiente
1. **Modelos 3D anatómicos y animaciones de ejercicios con licencia** (requisito externo). Al tenerlos: añadir entradas a `MEDIA_MANIFEST` / `ANATOMY_BODY_MODEL` (`src/services/media/manifest.ts`).
2. **Supabase** (Fase 10): crear proyecto, aplicar `supabase/migrations/0001_init.sql`, rellenar `.env`, implementar auth + push/pull usando `incomingWins`.
3. Visor 3D nativo (expo-gl) para los builds Android/iOS.
4. Fotos de progreso opcionales (privadas, solo locales por defecto).
5. Ejercicios personalizados creados por el usuario (el esquema ya lo admite: `is_custom`).
6. Revisión profesional del texto técnico de la biblioteca (marcado como "revisión profesional pendiente" en cada ficha).

## Errores conocidos / limitaciones
- PWA en iOS: si se borra el icono de inicio, iOS borra sus datos → usar la exportación periódica (Perfil → Copia de seguridad).
- En la PWA no hay vibración háptica en iPhone (limitación de Safari).
- No probado aún en Safari real de iPhone ni en dispositivos Android/iOS nativos.
