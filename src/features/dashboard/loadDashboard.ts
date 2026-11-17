import { createDashboardRepository, type LatestRecord, type LatestWeight, type MuscleWeeklySets, type ProfileSummary } from '@/database/repositories/dashboardRepository';
import { createStatsRepository, type WeightPoint } from '@/database/repositories/statsRepository';
import type { SqlExecutor } from '@/database/types';
import { startOfWeek, toLocalDateKey } from '@/utils/time';

export interface DashboardData {
  profile: ProfileSummary | null;
  activeRoutineName: string | null;
  trainedDayKeys: Set<string>;
  workoutsThisWeek: number;
  latestWeight: LatestWeight | null;
  weightSeries: WeightPoint[];
  latestRecord: LatestRecord | null;
  muscleSets: MuscleWeeklySets[];
}

/** Aggregates everything the home screen needs in one pass (all local reads). */
export async function loadDashboard(db: SqlExecutor, userId: string, now: Date = new Date()): Promise<DashboardData> {
  const repo = createDashboardRepository(db);
  const stats = createStatsRepository(db);

  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();

  const since = new Date(now);
  since.setDate(since.getDate() - 30);

  const [profile, activeRoutineName, dates, latestWeight, weightSeries, latestRecord, muscleSets] =
    await Promise.all([
      repo.getProfileSummary(userId),
      repo.getActiveRoutineName(userId),
      repo.getCompletedWorkoutDates(userId, from, to),
      repo.getLatestWeight(userId),
      stats.getWeightSeries(userId, since.toISOString()),
      repo.getLatestRecord(userId),
      repo.getWeeklySetsByMuscle(userId, from, to),
    ]);

  return {
    profile,
    activeRoutineName,
    trainedDayKeys: new Set(dates.map((iso) => toLocalDateKey(new Date(iso)))),
    workoutsThisWeek: dates.length,
    latestWeight,
    weightSeries,
    latestRecord,
    muscleSets,
  };
}
