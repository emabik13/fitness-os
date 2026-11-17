# PROJECT_STATUS — FITNESS OS

**Fase actual:** Fase 1 completada → siguiente: **Fase 2 (Perfil y onboarding)**
**Última actualización:** 17-nov-2026

## Fase 0 — Auditoría y arquitectura ✅
- Entorno: directorio vacío (proyecto nuevo). Node 22, npm 10, acceso a npm OK. Sin Android SDK ni Xcode en el contenedor de desarrollo → builds nativos por EAS.
- Proyecto creado con `create-expo-app` (SDK 58, RN 0.88, React 19.3, TS 6). Dependencias instaladas con `npx expo install` (versiones compatibles con el SDK).
- Compatibilidad verificada: `@react-three/fiber@9.8` compatible (peer React <19.4); **`victory-native@43` incompatible** (pide Skia ≥2.15.5, última publicada 2.14.0) → gráficos con `react-native-svg`.
- Arquitectura, modelo de datos, plan 3D y plan de sync documentados en `ARCHITECTURE.md`.
- `eas.json` con perfiles development / development-simulator / preview / production. `expo-dev-client` instalado.

## Fase 1 — Diseño ✅
- Sistema de diseño: tokens (color, tipografía Inter, espaciado, radios, movimiento), tema oscuro.
- Componentes: `AppText`, `Button`, `IconButton`, `Card`, `PressableScale` (resorte + háptica), `Screen` (título grande + pull-to-refresh), `SegmentedControl` animado, `StatTile`, `EmptyState`, `Badge`, `ListGroup/ListRow`, `SectionHeader`, `PhaseNotice`.
- Gráficos SVG: `Sparkline` (área), `WeekStrip` (semana L–D), `HBar`.
- Navegación: 5 pestañas (Inicio, Entrenar, Anatomía, Progreso, Perfil) + pantalla 404.
- Persistencia real desde ya: SQLite con migración 001 (esquema relacional completo, 21 tablas, índices, restricciones), usuario local creado en el primer arranque, pantalla de error de arranque con reintento.
- Pantallas conectadas a la BD (consultas reales, hoy vacías):
  - Inicio: saludo, fecha, objetivo, rutina activa, semana (días entrenados), peso actual/objetivo, evolución del peso, último récord, resumen muscular semanal.
  - Entrenar: rutinas del usuario, recuento de la biblioteca.
  - Anatomía: conmutador frontal/posterior que filtra los 12 grupos musculares; visor 3D en estado "pendiente de contenido"; leyenda agonista/sinergista/estabilizador.
  - Progreso: filtros 7D/30D/3M/6M/12M/Todo sobre sesiones, series, repeticiones, volumen, tiempo y peso.
  - Perfil: unidades, almacenamiento, versión de esquema, versión de la app.
- Pruebas: 25 tests (migraciones sobre SQLite real, repositorios con el ejemplo 40×12/11/10, utilidades, geometría, navegación de las 5 pestañas y filtros).
- Verificado: `typecheck` ✔, `lint` ✔, `jest` 25/25 ✔, `expo-doctor` 20/20 ✔, `expo export` Android + iOS (bundles Hermes) ✔, capturas a tamaño iPhone 13 revisadas.

## Pendiente
- Fase 2: onboarding (Zod), edición de perfil, registro de peso, equipamiento disponible.
- Fase 3: biblioteca de ejercicios con contenido verificado, filtros y fichas.
- Fase 4: visor 3D (R3F + expo-gl), manifiesto GLB, fallback 2D. **Requiere recursos GLB con licencia.**
- Fases 5–11 según plan.

## Errores conocidos / limitaciones
- La app **no se ha ejecutado aún en un dispositivo o emulador real**: este entorno no tiene Android SDK/Xcode. Se validó compilando los bundles nativos y con una vista web de QA. Primer paso recomendado: `eas build --profile development`.
- Los grupos musculares no tienen descripción ni función aún (se dejan vacíos en lugar de inventarlos; se completan en Fases 3/4).
- Identificadores de app provisionales: `com.fitnessos.app` (cámbialos si tienes un dominio propio antes de publicar).
- Se eliminó el `LICENSE` de la plantilla (atribuía el copyright a Expo). La licencia del producto está por decidir.

## Próximos pasos
1. Fase 2: flujo de onboarding multipaso con validación Zod, guardado en `user_profiles`/`user_equipment`/`body_weight_entries`, edición desde Perfil.
2. Generar el primer development build con EAS y probar en un Android y un iPhone reales.
