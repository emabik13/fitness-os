# FITNESS OS

Aplicación móvil (Android e iOS) de entrenamiento de fuerza, biomecánica 3D y recomposición corporal. Expo + React Native + TypeScript, offline-first con SQLite.

- Estado del proyecto: [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- Arquitectura y decisiones: [ARCHITECTURE.md](./ARCHITECTURE.md)

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

## Estructura

Ver `ARCHITECTURE.md §3`. Las rutas viven en `src/app/`; la lógica en `src/features`, `src/database` y `src/engine`.
