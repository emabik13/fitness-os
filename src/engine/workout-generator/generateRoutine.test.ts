import { CATALOG_EXERCISES, type MuscleId } from '@/catalog';
import { EQUIPMENT } from '@/domain/profile';

import { MAX_WEEKLY_SETS } from '../volume-calculator/volume';

import { generateRoutine, type GeneratorInput } from './generateRoutine';

const base: GeneratorInput = {
  goal: 'recomposition',
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: [...EQUIPMENT],
  priorityMuscles: [],
  limitations: [],
  liftExperience: { squat: 'confident', bench: 'confident', hinge: 'learning' },
  preferMachines: false,
  includeCore: true,
};
const bySlug = new Map(CATALOG_EXERCISES.map((e) => [e.slug, e]));
const agonists = (slug: string) => bySlug.get(slug)!.muscles.filter((m) => m.role === 'agonist').map((m) => m.id);

describe('routine generator', () => {
  it.each([
    [1, 'full_body'], [2, 'full_body'], [3, 'full_body'], [4, 'upper_lower'], [5, 'specialized'], [6, 'push_pull_legs'],
  ])('%i days → %s', (days, split) => {
    const r = generateRoutine({ ...base, daysPerWeek: days }, CATALOG_EXERCISES);
    expect(r.splitType).toBe(split);
    expect(r.days).toHaveLength(days);
    expect(r.rationale.length).toBeGreaterThanOrEqual(5);
  });

  it('is deterministic (no random routines)', () => {
    expect(generateRoutine(base, CATALOG_EXERCISES)).toEqual(generateRoutine(base, CATALOG_EXERCISES));
  });

  it('respects session time, weekly volume cap and plausible ranges', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const minutes of [45, 60, 90]) {
        const r = generateRoutine({ ...base, daysPerWeek: days, sessionMinutes: minutes, experience: 'advanced' }, CATALOG_EXERCISES);
        for (const d of r.days) {
          expect(d.estimatedMinutes).toBeLessThanOrEqual(minutes);
          expect(d.exercises.length).toBeGreaterThanOrEqual(3);
          for (const e of d.exercises) {
            expect(e.sets).toBeGreaterThanOrEqual(2);
            expect(e.repMax).toBeGreaterThan(e.repMin);
          }
        }
        const direct: Record<string, number> = {};
        for (const d of r.days) for (const e of d.exercises) for (const m of agonists(e.slug)) direct[m] = (direct[m] ?? 0) + e.sets;
        for (const v of Object.values(direct)) expect(v).toBeLessThanOrEqual(MAX_WEEKLY_SETS);
      }
    }
  });

  it('reaches a meaningful chest/back volume for an intermediate 4-day plan', () => {
    const r = generateRoutine(base, CATALOG_EXERCISES);
    expect(r.weeklyVolume.pectorals!).toBeGreaterThanOrEqual(8);
    expect(r.weeklyVolume.lats!).toBeGreaterThanOrEqual(9);
    // With 90 min the chest target is reached and no shortfall warning remains for it.
    const long = generateRoutine({ ...base, sessionMinutes: 90 }, CATALOG_EXERCISES);
    expect(long.weeklyVolume.pectorals!).toBeGreaterThanOrEqual(10);
    expect(long.warnings.join(' ')).not.toMatch(/pecho/);
  });

  it('gives every major muscle direct work at least twice a week from 2 days on', () => {
    const r = generateRoutine({ ...base, daysPerWeek: 4 }, CATALOG_EXERCISES);
    for (const m of ['pectorals', 'lats', 'quadriceps', 'hamstrings'] as MuscleId[]) {
      const daysHit = r.days.filter((d) => d.exercises.some((e) => agonists(e.slug).includes(m))).length;
      expect({ m, daysHit: daysHit >= 2 }).toEqual({ m, daysHit: true });
    }
  });

  it('never trains the same main muscle hard on consecutive suggested days', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      const r = generateRoutine({ ...base, daysPerWeek: days, experience: 'advanced' }, CATALOG_EXERCISES);
      const load = (d: (typeof r.days)[number]) => {
        const sets: Record<string, number> = {};
        for (const e of d.exercises) for (const m of agonists(e.slug)) sets[m] = (sets[m] ?? 0) + e.sets;
        return sets;
      };
      for (let i = 1; i < r.days.length; i++) {
        if (r.days[i]!.suggestedWeekday - r.days[i - 1]!.suggestedWeekday !== 1) continue;
        const a = load(r.days[i - 1]!);
        const b = load(r.days[i]!);
        for (const m of ['pectorals', 'lats', 'quadriceps', 'hamstrings', 'glutes']) {
          expect({ days, m, both: (a[m] ?? 0) >= 3 && (b[m] ?? 0) >= 3 }).toEqual({ days, m, both: false });
        }
      }
    }
  });

  it('respects equipment, limitations and beginner caps', () => {
    const r = generateRoutine(
      { ...base, experience: 'beginner', daysPerWeek: 6, equipment: ['dumbbell', 'bench', 'cable', 'machine'], limitations: ['lower_back'] },
      CATALOG_EXERCISES,
    );
    expect(r.days).toHaveLength(4);
    expect(r.warnings.join(' ')).toMatch(/4 sesiones/);
    for (const d of r.days)
      for (const e of d.exercises) {
        const ex = bySlug.get(e.slug)!;
        expect(['dumbbell', 'bench', 'cable', 'machine', 'bodyweight']).toContain(ex.equipment);
        expect(ex.tags).not.toContain('carga_lumbar');
        expect(ex.difficulty).toBe('beginner');
      }
  });

  it('gives priority muscles more volume and strength goal heavier main lifts', () => {
    const normal = generateRoutine({ ...base, sessionMinutes: 90 }, CATALOG_EXERCISES);
    for (const m of ['calves', 'biceps'] as MuscleId[]) {
      const prio = generateRoutine({ ...base, sessionMinutes: 90, priorityMuscles: [m] }, CATALOG_EXERCISES);
      expect(prio.weeklyVolume[m]!).toBeGreaterThan(normal.weeklyVolume[m]!);
    }
    const str = generateRoutine({ ...base, goal: 'strength' }, CATALOG_EXERCISES);
    expect(str.days[0]!.exercises[0]).toMatchObject({ role: 'main', repMin: 4, repMax: 6, restSeconds: 180 });
  });
});
