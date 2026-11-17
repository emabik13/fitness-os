import { ARM_LEG_CORE_EXERCISES } from './exercises.lower';
import { UPPER_EXERCISES } from './exercises.upper';
import { CATALOG_MUSCLES } from './muscles';
import type { CatalogExercise } from './types';

export * from './types';
export { CATALOG_MUSCLES };

export const CATALOG_EXERCISES: CatalogExercise[] = [...UPPER_EXERCISES, ...ARM_LEG_CORE_EXERCISES];

/** Bump when catalog content changes so devices re-sync it. */
export const CATALOG_VERSION = 1;

/** Stable, deterministic id for built-in exercises (same on every device). */
export const catalogId = (slug: string) => `cat-${slug}`;

/** Text provenance stored with each built-in exercise. */
export const CATALOG_SOURCE =
  'FITNESS OS — descripción técnica basada en principios estándar de entrenamiento de fuerza y anatomía funcional. Revisión profesional pendiente.';
