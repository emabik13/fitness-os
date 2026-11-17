# FITNESS OS — Arquitectura

Documento vivo. Última revisión: Fases 2–9 (17-nov-2026).

## 1. Stack verificado (Fase 0)

| Pieza | Versión instalada | Notas |
|---|---|---|
| Expo SDK | 58 (`expo ~58.0.26`) | Continuous Native Generation: `android/` e `ios/` se generan, nunca se editan a mano. |
| React Native / React | 0.88.1 / 19.3.0 | Nueva arquitectura (Fabric/TurboModules), Hermes. |
| TypeScript | 6.0 | `strict` + `noUncheckedIndexedAccess`. |
| Expo Router | 58.0.x | Rutas en `src/app/`. Tabs JS (estilo propio, idéntico en Android/iOS). |
| expo-sqlite | 58.0.x | Fuente de verdad local. Migraciones con `PRAGMA user_version`. |
| Reanimated / Worklets | 4.7 / 0.13 | Plugin de Babel configurado automáticamente por `babel-preset-expo`. |
| react-native-svg | 15.16 | Gráficos propios (ver §6). |
| Zustand / Zod | 5.1 / 4.6 | Estado efímero de UI / validación en fronteras (formularios, sync, manifiestos 3D). |
| Supabase JS | 2.119 (pendiente de instalar, Fase 10) | Auth, respaldo y sincronización. |
| three / @react-three/fiber | 0.187 / 9.8 (pendiente, Fase 4) | R3F native requiere `expo-gl`, `expo-asset`, `expo-file-system`; peer `react <19.4` ✔. |
| Jest + jest-expo + RNTL | 30 / 58 / 14 | Dos proyectos: `logic` (node) y `app` (UI/navegación). |

**Development builds:** el proyecto incluye `expo-dev-client` y `eas.json` con perfiles `development`, `development-simulator`, `preview` y `production`. Expo Go no es el objetivo (R3F/expo-gl y futuras dependencias nativas lo exigen).

## 1.1 Plataformas de distribución

| Plataforma | Cómo | Base de datos |
|---|---|---|
| **Web / PWA (principal hoy)** | `scripts/build-web.js` → GitHub Pages (Actions). Instalable en iOS/Android desde el navegador, offline con service worker (`public/sw.js`). | **sql.js** (SQLite→WebAssembly, binario embebido) persistido en IndexedDB tras cada escritura confirmada (`src/database/sqlite/client.web.ts`). |
| Android / iOS nativo | Development build con EAS (iOS en dispositivo físico requiere Apple Developer Program). | expo-sqlite (`client.ts`). |

Misma base de código, mismo esquema, migraciones y repositorios: la diferencia está aislada detrás de `SqlExecutor`. Se descartó `expo-sqlite` en web porque exige `SharedArrayBuffer` (cabeceras COOP/COEP) que GitHub Pages no permite configurar y que en Safari iOS es frágil.

Limitaciones de la PWA en iOS: los datos viven en el almacenamiento de la app instalada (se solicita `navigator.storage.persist()`); sin haptics; el 3D se hará con three.js sobre WebGL (soportado en Safari).

## 2. Principios

1. **Offline-first.** Toda escritura va a SQLite. La red solo sirve para respaldo/sync.
2. **Sin datos simulados.** Las pantallas leen de la base local; si no hay datos se muestra un estado vacío explícito. Ningún botón sin función: los módulos no construidos se muestran con `PhaseNotice` (no interactivo).
3. **Lógica fuera de la UI.** Componentes → hooks → repositorios/motor. El motor de entrenamiento es TypeScript puro sin React ni SQLite, testeable de forma aislada.
4. **No inventar contenido anatómico.** Los recursos 3D se cargan desde un manifiesto con fuente y licencia; la base de datos impide marcar un recurso como disponible sin `uri`, `source` y `license`.
5. **Unidades fijas:** kg, cm, minutos (sufijos `_kg`, `_cm`, `_seconds`/`_minutes` en columnas).

## 3. Estructura

```
src/
  app/                    Rutas Expo Router (solo pantallas delgadas que importan features)
    _layout.tsx           Raíz: fuentes, splash, SQLite (DatabaseProvider), Stack
    (tabs)/_layout.tsx    5 pestañas: Inicio · Entrenar · Anatomía · Progreso · Perfil
    (tabs)/index|entrenar|anatomia|progreso|perfil.tsx
  features/<módulo>/      Pantallas y loaders por dominio (dashboard, workouts, anatomy, progress, profile…)
  components/ui/          Sistema de diseño (AppText, Button, Card, Screen, SegmentedControl, StatTile…)
  components/charts/      Gráficos SVG + geometría pura (geometry.ts)
  database/
    types.ts              Interfaz SqlExecutor (subconjunto de expo-sqlite)
    migrations/           Migraciones versionadas (append-only)
    sqlite/               Apertura de BD y bootstrap (usuario local)
    repositories/         Consultas por agregado
    DatabaseProvider.tsx  Contexto { db, userId, schemaVersion }
  catalog/                Contenido de la biblioteca (ejercicios, músculos) versionado (CATALOG_VERSION)
  domain/                 Tipos y esquemas Zod del dominio (perfil, etiquetas)
  engine/                 Lógica pura y testeada, sin React ni SQLite:
    workout-generator/      generateRoutine (división, selección, volumen, tiempo, justificación)
    progression/            doble progresión, tendencias, récords
    strength/               1RM estimado
    volume-calculator/      series efectivas por músculo
    body/                   media móvil y tendencia de peso
    nutrition/              objetivos (Mifflin-St Jeor, proteína, agua)
    statistics/             agregaciones por ejercicio, buckets, rachas
  services/
    backup/                 exportar/importar/borrar datos (+ E/S de ficheros por plataforma)
    media/                  manifiesto de recursos 3D (Zod, fuente/licencia obligatorias)
    pwa/                    registro del service worker (solo web)
  sync/                   regla de conflictos compartida (backup y futura sincronización)
  stores/                 Zustand: sesión (onboarding) y temporizador de descanso
  features/viewer3d/      visor GLB (three.js en web, alternativa ligera en nativo)
  hooks/                  useDbQuery (lectura con refresco al enfocar)
  theme/                  Tokens: colores, tipografía, espaciado, movimiento
  constants/ utils/ test/ __tests__/
assets/
  models-3d/ exercise-animations/ anatomy/ icons/   (vacíos hasta contar con recursos con licencia)
```

Los tests no pueden vivir en `src/app/` (Expo Router los registraría como rutas); los de navegación están en `src/__tests__/`.

## 4. Sistema visual

- Tema oscuro por defecto (`userInterfaceStyle: dark`), fondo `#0A0B0D`, acento verde lima `#C8F135`.
- Tipografía Inter (400–800) con cifras tabulares para pesos/repeticiones.
- Objetivos táctiles ≥ 48 pt (56 pt en botones principales) para uso con manos sudadas/magnesio.
- Feedback: escala con resorte (Reanimated) + háptica en pulsaciones.
- Colores de rol muscular reservados: agonista `#FF6B4A`, sinergista `#FFB547`, estabilizador `#5AC8FA`.
- Accesibilidad: etiquetas en todos los controles icónicos, roles (`tab`, `button`, `header`), `maxFontSizeMultiplier` 1.6.

## 5. Modelo de datos (migración 001)

Convenciones:
- PK **UUID v4 TEXT** generada en el dispositivo → filas creadas offline sin colisiones ni duplicados al sincronizar (el upsert es por `id`).
- Fechas ISO-8601 UTC (`TEXT`); registros diarios (nutrición, recuperación) usan fecha local `YYYY-MM-DD`.
- Tablas sincronizables: `created_at`, `updated_at`, `deleted_at` (lápida), `version` (+1 en cada escritura local), `sync_status` (`pending|synced`).
- `CHECK` de rangos fisiológicos y de dominio en todas las métricas; `FOREIGN KEY` activadas.

Entidades: `users`, `user_profiles` (1:1), `user_equipment`, `muscle_groups` (12 grupos sembrados, descripciones vacías hasta tener contenido verificado), `exercises`, `exercise_muscles` (rol agonista/sinergista/estabilizador), `exercise_relations` (variantes/sustituciones), `exercise_media` (modelo, animación, miniatura; fuente, licencia, checksum), `routines` → `routine_days` → `routine_exercises`, `workouts` → `workout_exercises` → `workout_sets`, `personal_records`, `body_weight_entries`, `body_measurements` (con método y margen de error del % graso), `nutrition_entries`, `recovery_entries`, más `local_meta` y `sync_state`.

Restricciones destacadas:
- Un único entrenamiento `in_progress` por usuario (índice parcial) → base de la recuperación tras cierre inesperado.
- `exercise_media.status = 'available'` exige `uri`, `source` y `license`.
- `body_fat_pct` exige `body_fat_method` (no se presentan estimaciones como mediciones).
- Índices por `(user_id, fecha)` en todas las series temporales.

## 6. Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Tabs JS de Expo Router (no native tabs) | Control total del estilo (marca), mismo aspecto en Android/iOS. |
| `SqlExecutor` como interfaz | Los repositorios funcionan con expo-sqlite en el dispositivo y con `node:sqlite` en tests: se prueba el SQL real, no mocks. |
| Gráficos con `react-native-svg` propios | `victory-native@43` exige Skia ≥ 2.15.5 y la última publicada es 2.14.0 (incompatible hoy). SVG ya es dependencia y basta para líneas/barras. Se reevaluará en Fase 9. |
| Zustand solo para estado efímero | La sesión activa de entrenamiento (Fase 6) vivirá en Zustand **y** se escribirá en SQLite en cada cambio; nunca solo en memoria. |
| Usuario local antes de login | La app es usable sin cuenta; en Fase 10 `users.remote_id` vincula con `auth.users`. |

## 7. Plan 3D (Fase 4)

- Visor: `@react-three/fiber/native` + `expo-gl` + `GLTFLoader` de three. Carga perezosa del GLB solo al abrir la ficha; liberación de geometrías/texturas al desmontar.
- Manifiesto de recursos (`exercise_media`): `kind`, `uri`, `format`, `size_bytes`, `checksum_sha256`, `source`, `license`, `attribution`. Validado con Zod antes de insertar.
- Resaltado muscular: mallas nombradas por `muscle_group_id` en el GLB anatómico; material por rol.
- Sin recurso con licencia → estado "pendiente de contenido" + instrucciones técnicas en texto. Nunca imágenes estáticas presentadas como animaciones.
- Fallback ligero para dispositivos sin GL adecuado: vista 2D con lista de músculos por rol.
- Requisito externo: modelos anatómicos y animaciones GLB con licencia compatible (a proveer o adquirir).

## 8. Sincronización (Fase 10, diseño)

- Push: filas `sync_status = 'pending'` → RPC/upsert en Supabase por `id`. El servidor acepta si `version` entrante > almacenada (o igual con `updated_at` posterior); si no, devuelve la fila del servidor.
- Pull: filas con `updated_at > sync_state.last_pulled_at` por tabla; se aplican si ganan la misma regla. Lápidas (`deleted_at`) se propagan.
- Las tablas hijas en Postgres llevarán `user_id` desnormalizado para que las políticas **RLS** sean `user_id = auth.uid()` sin joins. Catálogo de ejercicios: lectura pública, escritura solo para `is_custom` del propietario.
- Fotos de progreso: solo locales salvo consentimiento explícito; bucket privado con RLS.

## 8.1 Motor de entrenamiento (resumen)

1. División por días/experiencia (principiantes ≤ 4 días; máx. 6 días).
2. Plantillas por tipo de sesión con huecos por patrón de movimiento y prioridad.
3. Selección determinista de ejercicios: equipamiento (incl. requisitos como banco/rack), dificultad, limitaciones (etiquetas de carga articular), experiencia con básicos, preferencia por máquinas; rotación entre sesiones repetidas.
4. Prescripción por objetivo/rol (principal, compuesto, aislamiento): rangos, descansos, RIR.
5. Ajuste al tiempo de sesión (estimación: 5 min calentamiento + series × (40 s + descanso) + 1 min/ejercicio).
6. Volumen: tope de 20 series directas/semana por músculo; prioridades +1 serie directa; subida hacia objetivos semanales liberando tiempo de accesorios ya cubiertos; aviso si el tiempo impide llegar al objetivo.
7. Justificación textual y avisos guardados con la rutina.

## 9. Pruebas

- `npm test` → proyecto `logic` (migraciones, repositorios, utilidades, geometría) y `app` (navegación real de las 5 pestañas con `expo-router/testing-library` sobre SQLite en memoria).
- `npm run typecheck` (app + tests), `npm run lint`, `npx expo-doctor`, `npx expo export -p android -p ios` (compila los bundles Hermes).
