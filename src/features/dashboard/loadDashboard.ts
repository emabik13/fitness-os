import {
  createDashboardRepository,
  type LatestRecord,
  type MuscleWeeklySets,
  type ProfileSummary,
} from '@/database/repositories/dashboardRepository';
import { createRoutineRepository, type RoutineDayRow } from '@/database/repositories/routineRepository';
import { createStatsRepository, type WeightPoint } from '@/database/repositories/statsRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import type { SqlExecutor } from '@/database/types';
import { summarizeTrend, type TrendSummary } from '@/engine/body/weightTrend';
import { weeklyStreak } from '@/engine/statistics/buckets';
import { startOfWeek, toLocalDateKey } from '@/utils/time';

export interface DashboardData {
  profile: (ProfileSummary & { daysPerWeek: number | null }) | null;
  activeRoutineName: string | null;
  active: { id: string; name: string } | null;
  next: { routineName: string; day: RoutineDayRow } | null;
  trainedDayKeys: Set<string>;
  workoutsThisWeek: number;
  streakWeeks: number;
  latestWeight: { weightKg: number; measuredAt: string } | null;
  weightSeries: WeightPoint[];
  trend: TrendSummary;
  latestRecord: LatestRecord | null;
  muscleSets: MuscleWeeklySets[];
}

/** Aggregates everything the home screen needs (all local reads). */
export async function loadDashboard(db: SqlExecutor, userId: string, now: Date = new Date()): Promise<DashboardData> {
  const repo = createDashboardRepository(db);
  const stats = createStatsRepository(db);
  const workouts = createWorkoutRepository(db);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();
  const since = new Date(now);
  since.setDate(since.getDate() - 30);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const [profile, days, activeRoutineName, dates, allDates, latestWeight, weightSeries, latestRecord, muscleSets, activeId, next] =
    await Promise.all([
      repo.getProfileSummary(userId),
      db.getFirstAsync<{ days_per_week: number | null }>('SELECT days_per_week FROM user_profiles WHERE user_id = ?', [userId]),
      repo.getActiveRoutineName(userId),
      repo.getCompletedWorkoutDates(userId, from, to),
      repo.getCompletedWorkoutDates(userId, yearAgo.toISOString(), to),
      repo.getLatestWeight(userId),
      stats.getWeightSeries(userId, since.toISOString()),
      repo.getLatestRecord(userId),
      repo.getWeeklySetsByMuscle(userId, from, to),
      workouts.getActiveId(userId),
      createRoutineRepository(db).nextDay(userId),
    ]);
  const active = activeId ? await workouts.get(activeId) : null;
  const target = days?.days_per_week ?? 0;

  return {
    profile: profile ? { ...profile, daysPerWeek: days?.days_per_week ?? null } : null,
    activeRoutineName,
    active: active ? { id: active.id, name: active.name } : null,
    next: next ? { routineName: next.routineName, day: next.day } : null,
    trainedDayKeys: new Set(dates.map((iso) => toLocalDateKey(new Date(iso)))),
    workoutsThisWeek: dates.length,
    streakWeeks: weeklyStreak(allDates, Math.min(target, 7), now),
    latestWeight,
    weightSeries,
    trend: summarizeTrend(weightSeries),
    latestRecord,
    muscleSets,
  };
}
