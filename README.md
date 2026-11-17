# FITNESS OS

Aplicación móvil (Android e iOS) de entrenamiento de fuerza, biomecánica 3D y recomposición corporal. Expo + React Native + TypeScript, offline-first con SQLite.

- Estado del proyecto: [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- Arquitectura y decisiones: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Usarla en el iPhone (gratis): app web instalable (PWA)

FITNESS OS se publica como **app web progresiva** en GitHub Pages. No necesita App Store ni cuenta de Apple:

1. Abre en **Safari** del iPhone: `https://emabik13.github.io/fitness-os/`
2. Pulsa **Compartir** → **Añadir a pantalla de inicio**.
3. Ábrela desde el icono: pantalla completa, sin barra del navegador, funciona **sin conexión**.

Tus datos se guardan en una base SQLite **dentro del propio iPhone** (IndexedDB). Úsala siempre desde el icono de inicio: si borras ese icono, iOS borra también sus datos (la copia de seguridad llega en una fase posterior).

Cada `git push` a `main` ejecuta tests y vuelve a publicar la app automáticamente (`.github/workflows/deploy-web.yml`).

Compilar la versión web en local:

```bash
npm run build:web:pages
```

## Requisitos

- Node.js 20+ (probado con 22) y npm.
- Cuenta de Expo para builds en la nube (`npx eas-cli@latest login`).
- Para compilar en local (opcional): Android Studio (SDK + emulador) y/o Xcode 16+ en macOS.

## Instalación

```bash
npm install
```

```bash
cp .env.example .env
```

(El `.env` solo será necesario a partir de la Fase 10 — Supabase.)

## Alternativa: probar con Expo Go

Mientras la app solo use módulos incluidos en Expo Go (válido hasta la Fase 3), puedes probarla así:

1. Instala **Expo Go** desde la App Store en el iPhone.
2. En tu ordenador (misma red Wi-Fi que el iPhone), dentro del proyecto:

```bash
npm install
```

```bash
npm run start:go
```

3. Escanea el código QR con la **cámara** del iPhone y ábrelo en Expo Go.

Si la red Wi-Fi bloquea la conexión entre dispositivos, usa `npx expo start --go --tunnel`.

## Ejecutar la app (development build)

FITNESS OS usa dependencias nativas, así que se ejecuta con un **development build**, no con Expo Go.

Opción A — build en la nube (no requiere Android Studio/Xcode):

```bash
npx eas-cli@latest build --profile development --platform android
```

```bash
npx eas-cli@latest build --profile development --platform ios
```

Instala el resultado en el dispositivo y luego arranca el servidor:

```bash
npm start
```

Opción B — build local:

```bash
npm run android
```

```bash
npm run ios
```

## Calidad

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npx expo-doctor
```

## Funcionalidades

Onboarding y perfil · motor de rutinas con justificación · editor de rutinas · modo entrenamiento con autoguardado, descansos y sugerencias de progresión · biblioteca de 44 ejercicios con biomecánica · fichas de músculo · peso, medidas y % graso con método · nutrición y recuperación · estadísticas con filtros · copia de seguridad JSON. Estado detallado en `PROJECT_STATUS.md`.

## Añadir modelos 3D

Ver `assets/models-3d/README.md` y `src/services/media/manifest.ts`: cada recurso necesita URL, tamaño, SHA-256, fuente y licencia.

## Supabase (Fase 10, pendiente de credenciales)

El esquema con RLS está en `supabase/migrations/0001_init.sql`. Para activarlo hará falta un proyecto de Supabase y rellenar `.env` (ver `.env.example`).

## Estructura

Ver `ARCHITECTURE.md §3`. Las rutas viven en `src/app/`; la lógica en `src/features`, `src/database` y `src/engine`.
