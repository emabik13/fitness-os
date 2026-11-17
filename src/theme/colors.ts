/**
 * Design tokens — color.
 * Dark theme is the default (and, for now, the only) theme. Tokens are
 * semantic so a light theme can be added later without touching components.
 */
export const palette = {
  black: '#000000',
  ink950: '#0A0B0D',
  ink900: '#111316',
  ink850: '#16191D',
  ink800: '#1D2025',
  ink700: '#282C33',
  ink600: '#363B44',
  ink400: '#6B7280',
  ink300: '#9AA0AA',
  ink100: '#E6E8EB',
  white: '#F5F6F8',
  lime500: '#C8F135',
  lime600: '#AFD61F',
  lime900: '#2A3410',
  red500: '#FF5A5F',
  red900: '#3A1517',
  amber500: '#FFB547',
  amber900: '#3A2A10',
  blue500: '#5AC8FA',
  blue900: '#10293A',
  violet500: '#A78BFA',
} as const;

export const colors = {
  background: palette.ink950,
  surface: palette.ink900,
  surfaceRaised: palette.ink850,
  surfacePressed: palette.ink800,
  border: palette.ink700,
  borderStrong: palette.ink600,

  textPrimary: palette.white,
  textSecondary: palette.ink300,
  textTertiary: palette.ink400,
  textInverse: palette.ink950,

  accent: palette.lime500,
  accentPressed: palette.lime600,
  accentMuted: palette.lime900,
  onAccent: palette.ink950,

  danger: palette.red500,
  dangerMuted: palette.red900,
  warning: palette.amber500,
  warningMuted: palette.amber900,
  info: palette.blue500,
  infoMuted: palette.blue900,

  /** Muscle role colors used by anatomy views (agonist / synergist / stabilizer). */
  muscleAgonist: '#FF6B4A',
  muscleSynergist: palette.amber500,
  muscleStabilizer: palette.blue500,
  muscleInactive: palette.ink700,

  tabBar: palette.ink900,
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
