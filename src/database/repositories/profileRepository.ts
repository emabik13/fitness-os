import {
  EQUIPMENT,
  preferencesSchema,
  type Equipment,
  type Profile,
  type ProfileInput,
} from '@/domain/profile';
import { nowIso } from '@/utils/time';

import type { SqlExecutor } from '../types';
import { insertRow, updateRow } from '../write';

interface ProfileRow {
  id: string;
  age_years: number | null;
  sex: Profile['sex'];
  height_cm: number | null;
  target_weight_kg: number | null;
  goal: Profile['goal'];
  experience: Profile['experience'] | null;
  days_per_week: number | null;
  session_minutes: number | null;
  priority_muscles: string;
  limitations: string;
  lift_experience: string;
  preferences: string;
  onboarding_completed_at: string | null;
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function createProfileRepository(db: SqlExecutor) {
  async function getEquipment(userId: string): Promise<Equipment[]> {
    const rows = await db.getAllAsync<{ equipment: Equipment }>(
      `SELECT equipment FROM user_equipment WHERE user_id = ? AND available = 1 AND deleted_at IS NULL`,
      [userId],
    );
    return rows.map((r) => r.equipment);
  }

  return {
    getEquipment,

    async getProfile(userId: string): Promise<Profile | null> {
      const r = await db.getFirstAsync<ProfileRow>(
        `SELECT * FROM user_profiles WHERE user_id = ? AND deleted_at IS NULL`,
        [userId],
      );
      if (!r) return null;
      return {
        id: r.id,
        ageYears: r.age_years ?? 0,
        sex: r.sex,
        heightCm: r.height_cm ?? 0,
        targetWeightKg: r.target_weight_kg,
        goal: r.goal,
        experience: r.experience ?? 'beginner',
        daysPerWeek: r.days_per_week ?? 3,
        sessionMinutes: r.session_minutes ?? 60,
        priorityMuscles: parseJson(r.priority_muscles, []),
        limitations: parseJson(r.limitations, []),
        liftExperience: parseJson(r.lift_experience, {}),
        equipment: await getEquipment(userId),
        preferences: preferencesSchema.parse(parseJson(r.preferences, {})),
        onboardingCompleted: r.onboarding_completed_at !== null,
      };
    },

    /**
     * Creates or updates the profile, equipment and (if it changed) logs the
     * body weight — all in one transaction.
     */
    async saveProfile(userId: string, input: ProfileInput): Promise<void> {
      await db.withTransactionAsync(async () => {
        const existing = await db.getFirstAsync<{ id: string; onboarding_completed_at: string | null }>(
          `SELECT id, onboarding_completed_at FROM user_profiles WHERE user_id = ?`,
          [userId],
        );
        const values = {
          age_years: input.ageYears,
          sex: input.sex,
          height_cm: input.heightCm,
          target_weight_kg: input.targetWeightKg,
          goal: input.goal,
          experience: input.experience,
          days_per_week: input.daysPerWeek,
          session_minutes: input.sessionMinutes,
          priority_muscles: JSON.stringify(input.priorityMuscles),
          limitations: JSON.stringify(input.limitations),
          lift_experience: JSON.stringify(input.liftExperience),
          preferences: JSON.stringify(input.preferences),
        };
        if (existing) {
          await updateRow(db, 'user_profiles', existing.id, {
            ...values,
            onboarding_completed_at: existing.onboarding_completed_at ?? nowIso(),
            deleted_at: null,
          });
        } else {
          await insertRow(db, 'user_profiles', { user_id: userId, ...values, onboarding_completed_at: nowIso() });
        }

        // Equipment: one row per type, toggled with `available`.
        const rows = await db.getAllAsync<{ id: string; equipment: Equipment; available: number }>(
          `SELECT id, equipment, available FROM user_equipment WHERE user_id = ?`,
          [userId],
        );
        for (const eq of EQUIPMENT) {
          const want = input.equipment.includes(eq) ? 1 : 0;
          const row = rows.find((r) => r.equipment === eq);
          if (!row) {
            if (want) await insertRow(db, 'user_equipment', { user_id: userId, equipment: eq, available: 1 });
          } else if (row.available !== want) {
            await updateRow(db, 'user_equipment', row.id, { available: want });
          }
        }

        const last = await db.getFirstAsync<{ weight_kg: number }>(
          `SELECT weight_kg FROM body_weight_entries WHERE user_id = ? AND deleted_at IS NULL ORDER BY measured_at DESC LIMIT 1`,
          [userId],
        );
        if (!last || Math.abs(last.weight_kg - input.weightKg) > 0.001) {
          await insertRow(db, 'body_weight_entries', {
            user_id: userId,
            measured_at: nowIso(),
            weight_kg: input.weightKg,
            source: 'manual',
          });
        }
      });
    },

    async updatePreferences(userId: string, patch: Partial<Profile['preferences']>): Promise<void> {
      const r = await db.getFirstAsync<{ id: string; preferences: string }>(
        `SELECT id, preferences FROM user_profiles WHERE user_id = ?`,
        [userId],
      );
      if (!r) return;
      const next = preferencesSchema.parse({ ...parseJson(r.preferences, {}), ...patch });
      await updateRow(db, 'user_profiles', r.id, { preferences: JSON.stringify(next) });
    },
  };
}
