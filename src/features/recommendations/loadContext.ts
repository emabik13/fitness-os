import type { MuscleId } from '@/catalog';
import { createAnalyticsRepository } from '@/database/repositories/analyticsRepository';
import { createExerciseRepository } from '@/database/repositories/exerciseRepository';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { createStatsRepository } from '@/database/repositories/statsRepository';
import { createWorkoutRepository, toSessions } from '@/database/repositories/workoutRepository';
import type { SqlExecutor } from '@/database/types';
import type { Profile } from '@/domain/profile';
import type { ExerciseTrend } from '@/engine/analytics/insights';
import { classifyTrend } from '@/engine/progression/doubleProgression';
import type { RecommendationContext } from '@/engine/recommendations/recommendRoutines';
import { bestOneRm } from '@/engine/strength/oneRm';
import type { GeneratorInput } from '@/engine/workout-generator/generateRoutine';

export function profileToGeneratorInput(p: Profile): GeneratorInput {
  return {
    goal: p.goal,
    experience: p.experience,
    daysPerWeek: p.daysPerWeek,
    sessionMinutes: p.sessionMinutes,
    equipment: p.equipment,
    priorityMuscles: p.priorityMuscles,
    limitations: p.limitations.map((l) => l.area),
    liftExperience: p.liftExperience,
    preferMachines: p.preferences.preferMachines,
    includeCore: p.preferences.includeCore,
  };
}

/** Profile + history-derived context for the routine recommender. */
export async function loadRecommendationInputs(db: SqlExecutor, userId: string) {
  const analytics = createAnalyticsRepository(db);
  const [profile, weeklyCounts, recovery] = await Promise.all([
    createProfileRepository(db).getProfile(userId),
    analytics.weeklyCounts(userId),
    analytics.recoveryAverages(userId),
  ]);
  if (!profile) return null;
  const ctx: RecommendationContext = { weeklyCounts, recovery };
  return { profile, input: profileToGeneratorInput(profile), ctx };
}

/** Everything the analysis screen needs (last 4 weeks of volume, 12 weeks of trends). */
export async function loadAnalyticsInput(db: SqlExecutor, userId: string, now = new Date()) {
  const base = await loadRecommendationInputs(db, userId);
  if (!base) return null;
  const weeksWithData = base.ctx.weeklyCounts.length;
  const windowWeeks = Math.max(1, Math.min(4, weeksWithData));
  const from = new Date(now);
  from.setDate(from.getDate() - 7 * windowWeeks);
  const trendFrom = new Date(now);
  trendFrom.setDate(trendFrom.getDate() - 7 * 12);

  const stats = createStatsRepository(db);
  const workouts = createWorkoutRepository(db);
  const exercisesRepo = createExerciseRepository(db);
  const [volume, top] = await Promise.all([
    stats.muscleVolume(userId, from.toISOString()),
    stats.topExercises(userId, trendFrom.toISOString(), 12),
  ]);
  const directSets: Partial<Record<MuscleId, number>> = {};
  for (const v of volume) directSets[v.muscleGroupId as MuscleId] = v.direct;

  const exercises: ExerciseTrend[] = [];
  for (const t of top.filter((x) => x.sessions >= 3)) {
    const hist = (await workouts.history(userId, t.exerciseId)).filter((h) => h.startedAt >= trendFrom.toISOString());
    const e1 = hist.map((h) => bestOneRm(h.sets)).filter((v): v is number => v !== null);
    const detail = await exercisesRepo.get(t.exerciseId);
    exercises.push({
      exerciseId: t.exerciseId,
      name: t.name,
      sessions: hist.length,
      trend: classifyTrend(toSessions(hist)),
      firstE1rm: e1[0] ?? null,
      lastE1rm: e1[e1.length - 1] ?? null,
      substitutes: detail?.substitutes ?? [],
    });
  }
  return {
    ...base,
    analytics: {
      weeklyCounts: base.ctx.weeklyCounts,
      plannedDays: base.profile.daysPerWeek,
      directSets,
      windowWeeks,
      exercises,
      recovery: base.ctx.recovery,
    },
  };
}
