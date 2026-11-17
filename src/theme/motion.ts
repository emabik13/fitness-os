/** Shared animation timings (ms) and spring configs for Reanimated. */
export const durations = {
  fast: 120,
  normal: 220,
  slow: 360,
} as const;

export const springs = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  gentle: { damping: 20, stiffness: 180, mass: 1 },
} as const;
