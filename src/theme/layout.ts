/** Spacing scale on a 4pt grid. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/**
 * Minimum touch target. Larger than the 44/48pt platform minimum because the
 * app is used mid-set with sweaty hands and chalk.
 */
export const touch = {
  min: 48,
  large: 56,
} as const;

/** Horizontal gutter for screens. */
export const gutter = spacing.lg;
