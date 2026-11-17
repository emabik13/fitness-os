import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { createBodyRepository } from './bodyRepository';
import { createNutritionRepository, sumDay } from './nutritionRepository';
import { averageRecovery, createRecoveryRepository } from './recoveryRepository';

async function setup() {
  const db = createTestDb();
  const { userId } = await bootstrapDatabase(db);
  return { db, userId };
}

describe('body, nutrition and recovery logs', () => {
  it('stores measurements with method and error for body fat', async () => {
    const { db, userId } = await setup();
    const body = createBodyRepository(db);
    await body.addMeasurement(userId, {
      measuredAt: '2026-11-17T08:00:00.000Z', values: { waist_cm: 84.5, arm_cm: 36 },
      bodyFatPct: 18, bodyFatMethod: 'bia_scale', bodyFatErrorPct: 4, notes: null,
    });
    const [m] = await body.listMeasurements(userId);
    expect(m).toMatchObject({ bodyFatPct: 18, bodyFatMethod: 'bia_scale', bodyFatErrorPct: 4 });
    expect(m!.values.waist_cm).toBe(84.5);
    await expect(
      body.addMeasurement(userId, { measuredAt: 'x', values: {}, bodyFatPct: 18, bodyFatMethod: null, bodyFatErrorPct: null, notes: null }),
    ).rejects.toThrow(/CHECK/);
  });

  it('sums nutrition per day and keeps water as its own entries', async () => {
    const { db, userId } = await setup();
    const n = createNutritionRepository(db);
    const base = { label: null, caloriesKcal: null, proteinG: null, carbsG: null, fatG: null, waterMl: null };
    await n.add(userId, { ...base, entryDate: '2026-11-17', label: 'Comida', caloriesKcal: 700, proteinG: 45, carbsG: 80, fatG: 20 });
    await n.add(userId, { ...base, entryDate: '2026-11-17', waterMl: 500 });
    await n.add(userId, { ...base, entryDate: '2026-11-16', caloriesKcal: 2000 });
    const day = await n.listDay(userId, '2026-11-17');
    expect(sumDay(day)).toEqual({ caloriesKcal: 700, proteinG: 45, carbsG: 80, fatG: 20, waterMl: 500 });
    expect((await n.dailyTotals(userId, '2026-11-01', '2026-11-30')).map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17']);
    await n.remove(day[0]!.id);
    expect(sumDay(await n.listDay(userId, '2026-11-17')).caloriesKcal).toBe(0);
  });

  it('keeps one recovery entry per day and averages recorded values', async () => {
    const { db, userId } = await setup();
    const r = createRecoveryRepository(db);
    const base = { sleepHours: 7, recoveryScore: 3, fatigue: 2, soreness: 2, energy: 4, notes: null };
    const id1 = await r.upsert(userId, { ...base, entryDate: '2026-11-17' });
    const id2 = await r.upsert(userId, { ...base, entryDate: '2026-11-17', sleepHours: 8 });
    expect(id2).toBe(id1);
    await r.upsert(userId, { ...base, entryDate: '2026-11-16', sleepHours: 6, energy: null });
    const avg = averageRecovery(await r.list(userId, '2026-11-01'));
    expect(avg).toMatchObject({ sleepHours: 7, energy: 4, days: 2 });
    await expect(r.upsert(userId, { ...base, entryDate: '2026-11-15', fatigue: 9 })).rejects.toThrow(/CHECK/);
  });
});
