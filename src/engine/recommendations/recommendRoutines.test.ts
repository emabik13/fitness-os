import { CATALOG_EXERCISES } from '@/catalog';
import { EQUIPMENT } from '@/domain/profile';

import type { GeneratorInput } from '../workout-generator/generateRoutine';
import { generateRoutine } from '../workout-generator/generateRoutine';
import { SPLITS, type SplitId } from '../workout-generator/splits';
import { STYLE_IDS } from '../workout-generator/styles';
import { MAX_WEEKLY_SETS } from '../volume-calculator/volume';

import { parseRecommendationId, recommendRoutines } from './recommendRoutines';

const base: GeneratorInput = {
  goal: 'recomposition', experience: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: [...EQUIPMENT],
  priorityMuscles: ['glutes'], limitations: [], liftExperience: { squat: 'confident', bench: 'confident', hinge: 'learning' },
  preferMachines: false, includeCore: true,
};
const noHistory = { weeklyCounts: [], recovery: null };
const bySlug = new Map(CATALOG_EXERCISES.map((e) => [e.slug, e]));
const agonists = (slug: string) => bySlug.get(slug)!.muscles.filter((m) => m.role === 'agonist').map((m) => m.id);

describe('every style × split × days combination', () => {
  const combos: [string, SplitId, number][] = [];
  for (const split of Object.keys(SPLITS) as SplitId[])
    for (const d of Object.keys(SPLITS[split].byDays).map(Number)) for (const style of STYLE_IDS) combos.push([style, split, d]);

  it(`produces sound plans (${combos.length} combinations)`, () => {
    for (const [style, split, days] of combos) {
      const r = generateRoutine({ ...base, experience: 'advanced', daysPerWeek: days }, CATALOG_EXERCISES, { style: style as never, split, days });
      const ctx = `${style}/${split}/${days}`;
      expect({ ctx, days: r.days.length }).toEqual({ ctx, days });
      const direct: Record<string, number> = {};
      for (const d of r.days) {
        expect({ ctx, fits: d.estimatedMinutes <= r.sessionMinutes }).toEqual({ ctx, fits: true });
        expect({ ctx, enough: d.exercises.length >= 3 }).toEqual({ ctx, enough: true });
        for (const e of d.exercises) {
          expect(e.repMax).toBeGreaterThan(e.repMin);
          for (const m of agonists(e.slug)) direct[m] = (direct[m] ?? 0) + e.sets;
        }
      }
      for (const v of Object.values(direct)) expect(v).toBeLessThanOrEqual(MAX_WEEKLY_SETS);
      // No main muscle trained hard (≥3 direct sets) on two consecutive suggested days.
      for (let i = 1; i < r.days.length; i++) {
        if (r.days[i]!.suggestedWeekday - r.days[i - 1]!.suggestedWeekday !== 1) continue;
        const load = (k: number) => {
          const o: Record<string, number> = {};
          for (const e of r.days[k]!.exercises) for (const m of agonists(e.slug)) o[m] = (o[m] ?? 0) + e.sets;
          return o;
        };
        const a = load(i - 1);
        const b = load(i);
        for (const m of ['pectorals', 'lats', 'quadriceps', 'hamstrings', 'glutes'])
          expect({ ctx, m, both: (a[m] ?? 0) >= 3 && (b[m] ?? 0) >= 3 }).toEqual({ ctx, m, both: false });
      }
    }
  });

  it('applies style rules: express caps time and pairs supersets, strength goes heavy, circuits have notes', () => {
    const ex = generateRoutine({ ...base, sessionMinutes: 90 }, CATALOG_EXERCISES, { style: 'express' });
    expect(ex.sessionMinutes).toBe(45);
    expect(ex.days.flatMap((d) => d.exercises).some((e) => e.note?.startsWith('Superserie'))).toBe(true);
    const st = generateRoutine(base, CATALOG_EXERCISES, { style: 'strength' });
    expect(st.days[0]!.exercises[0]).toMatchObject({ role: 'main', repMin: 3, repMax: 5 });
    const ci = generateRoutine(base, CATALOG_EXERCISES, { style: 'density' });
    expect(ci.days[0]!.exercises[0]!.note).toMatch(/Circuito A/);
    expect(Math.max(...ci.days[0]!.exercises.map((e) => Number(e.note!.match(/\((\d+) ejercicios/)?.[1] ?? 0)))).toBeLessThanOrEqual(5);
    const ma = generateRoutine(base, CATALOG_EXERCISES, { style: 'machines' });
    const machineShare = ma.days.flatMap((d) => d.exercises).filter((e) => ['machine', 'cable', 'smith_machine', 'leg_press'].includes(bySlug.get(e.slug)!.equipment)).length;
    expect(machineShare / ma.days.flatMap((d) => d.exercises).length).toBeGreaterThan(0.6);
    const jf = generateRoutine(base, CATALOG_EXERCISES, { style: 'joint_friendly' });
    expect(jf.days.flatMap((d) => d.exercises).some((e) => bySlug.get(e.slug)!.tags.includes('basico'))).toBe(false);
  });

  it('specialization gives the priority muscle much more volume', () => {
    const input = { ...base, priorityMuscles: ['biceps'] };
    const bal = generateRoutine(input, CATALOG_EXERCISES, { style: 'balanced' });
    const spe = generateRoutine(input, CATALOG_EXERCISES, { style: 'specialization' });
    expect(spe.weeklyVolume.biceps!).toBeGreaterThan(bal.weeklyVolume.biceps!);
  });
});

describe('routine recommender', () => {
  it('returns many distinct, ranked and explained options', () => {
    const recs = recommendRoutines(base, CATALOG_EXERCISES, noHistory);
    expect(recs.length).toBeGreaterThanOrEqual(25);
    expect(new Set(recs.map((r) => r.id)).size).toBe(recs.length);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1]!.score).toBeGreaterThanOrEqual(recs[i]!.score);
    for (const r of recs) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.components.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 6);
      expect(parseRecommendationId(r.id)).toEqual({ style: r.style, split: r.split, days: r.days });
    }
    // The top options use the declared days and a 2×/week split.
    expect(recs[0]!.days).toBe(4);
    expect(recs[0]!.routine.frequencyScore).toBe(1);
  });

  it('ranks by goal: strength-focused styles rise for a strength goal, circuits for fat loss', () => {
    const rank = (goal: GeneratorInput['goal'], style: string) =>
      recommendRoutines({ ...base, goal }, CATALOG_EXERCISES, noHistory).findIndex((r) => r.style === style);
    expect(rank('strength', 'strength')).toBeLessThan(rank('fat_loss', 'strength'));
    expect(rank('fat_loss', 'density')).toBeLessThan(rank('strength', 'density'));
  });

  it('uses real history: users who train 3×/week get 3-day plans ranked higher', () => {
    const history = { weeklyCounts: [3, 3, 2, 3, 3, 3, 3, 2], recovery: null };
    const recs = recommendRoutines(base, CATALOG_EXERCISES, history);
    const best3 = recs.find((r) => r.days === 3)!;
    const best5 = recs.find((r) => r.days === 5)!;
    expect(best3.adherence.basis).toBe('history');
    expect(best3.adherence.probability).toBeCloseTo(7 / 10, 6);
    expect(best5.adherence.probability).toBeCloseTo(1 / 10, 6);
    expect(best3.score).toBeGreaterThan(best5.score);
  });

  it('favours low-fatigue styles when recovery is poor and joint-friendly with limitations', () => {
    const poor = { weeklyCounts: [], recovery: { recoveryScore: 2, sleepHours: 5.5, days: 10 } };
    const recs = recommendRoutines(base, CATALOG_EXERCISES, poor);
    const s = (style: string) => recs.find((r) => r.style === style && r.split === 'upper_lower')!.score;
    expect(s('express')).toBeGreaterThan(s('powerbuilding'));
    const lim = recommendRoutines({ ...base, limitations: ['lower_back'] }, CATALOG_EXERCISES, noHistory);
    const l = (style: string) => lim.find((r) => r.style === style && r.split === 'upper_lower')!.score;
    expect(l('joint_friendly')).toBeGreaterThan(l('strength'));
  });

  it('is fast enough to run on a phone', () => {
    const t = Date.now();
    recommendRoutines({ ...base, daysPerWeek: 5 }, CATALOG_EXERCISES, noHistory);
    expect(Date.now() - t).toBeLessThan(3000);
  });
});
