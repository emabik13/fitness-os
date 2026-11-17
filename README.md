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

## Probar en iPhone con Expo Go (rápido, gratis)

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

## Estructura

Ver `ARCHITECTURE.md §3`. Las rutas viven en `src/app/`; la lógica en `src/features`, `src/database` y `src/engine`.
