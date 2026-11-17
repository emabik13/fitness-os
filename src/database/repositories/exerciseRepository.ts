import type { Biomechanics, MuscleRole, Pattern } from '@/catalog';
import type { Equipment } from '@/domain/profile';

import type { SqlExecutor, SqlParam } from '../types';

export interface ExerciseListItem {
  id: string;
  slug: string;
  name: string;
  primaryMuscleId: string;
  primaryMuscleName: string;
  equipment: Equipment;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  movementType: 'compound' | 'isolation';
  pattern: Pattern;
  tags: string[];
}

export interface ExerciseFilters {
  search?: string;
  muscleId?: string | null;
  equipment?: Equipment | null;
  difficulty?: ExerciseListItem['difficulty'] | null;
  pattern?: Pattern | null;
}

export interface ExerciseMuscle {
  id: string;
  name: string;
  role: MuscleRole;
  functionText: string | null;
}

export interface ExerciseMedia {
  kind: 'anatomy_model' | 'animation' | 'thumbnail';
  status: 'available' | 'pending';
  uri: string | null;
  source: string | null;
  license: string | null;
  attribution: string | null;
}

export interface ExerciseDetail extends ExerciseListItem {
  altNames: string[];
  description: string | null;
  instructions: string[];
  biomechanics: Partial<Biomechanics>;
  errors: string[];
  tips: string[];
  muscles: ExerciseMuscle[];
  substitutes: { id: string; name: string }[];
  variants: { id: string; name: string }[];
  media: ExerciseMedia[];
  contentSource: string | null;
  isCustom: boolean;
}

const json = <T>(t: string | null, fb: T): T => {
  try {
    return t ? (JSON.parse(t) as T) : fb;
  } catch {
    return fb;
  }
};

/** Lowercase and strip accents for accent-insensitive search. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const LIST_SQL = `
  SELECT e.id, e.slug, e.name_es AS name, e.alt_names, e.primary_muscle_group_id AS primaryMuscleId,
         mg.name_es AS primaryMuscleName, e.equipment, e.difficulty, e.movement_type AS movementType,
         e.movement_pattern AS pattern, e.tags
    FROM exercises e JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
   WHERE e.deleted_at IS NULL`;

type ListRow = Omit<ExerciseListItem, 'tags'> & { tags: string; alt_names: string };

const toItem = (r: ListRow): ExerciseListItem => ({ ...r, tags: json(r.tags, []) });

export function createExerciseRepository(db: SqlExecutor) {
  return {
    async list(f: ExerciseFilters = {}): Promise<ExerciseListItem[]> {
      const where: string[] = [];
      const params: SqlParam[] = [];
      if (f.muscleId) {
        where.push(
          `(e.primary_muscle_group_id = ? OR EXISTS (SELECT 1 FROM exercise_muscles em WHERE em.exercise_id = e.id AND em.muscle_group_id = ? AND em.role = 'agonist'))`,
        );
        params.push(f.muscleId, f.muscleId);
      }
      if (f.equipment) {
        where.push('e.equipment = ?');
        params.push(f.equipment);
      }
      if (f.difficulty) {
        where.push('e.difficulty = ?');
        params.push(f.difficulty);
      }
      if (f.pattern) {
        where.push('e.movement_pattern = ?');
        params.push(f.pattern);
      }
      const rows = await db.getAllAsync<ListRow>(
        `${LIST_SQL}${where.length ? ` AND ${where.join(' AND ')}` : ''} ORDER BY mg.sort_order, e.movement_type, e.name_es`,
        params,
      );
      const q = f.search ? normalizeText(f.search.trim()) : '';
      const filtered = q
        ? rows.filter((r) => normalizeText(`${r.name} ${json<string[]>(r.alt_names, []).join(' ')}`).includes(q))
        : rows;
      return filtered.map(toItem);
    },

    async get(id: string): Promise<ExerciseDetail | null> {
      const r = await db.getFirstAsync<
        ListRow & {
          description: string | null;
          instructions: string;
          biomechanics: string;
          common_errors: string;
          tips: string;
          content_source: string | null;
          is_custom: number;
        }
      >(
        `SELECT e.id, e.slug, e.name_es AS name, e.alt_names, e.primary_muscle_group_id AS primaryMuscleId,
                mg.name_es AS primaryMuscleName, e.equipment, e.difficulty, e.movement_type AS movementType,
                e.movement_pattern AS pattern, e.tags, e.description, e.instructions, e.biomechanics,
                e.common_errors, e.tips, e.content_source, e.is_custom
           FROM exercises e JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id WHERE e.id = ?`,
        [id],
      );
      if (!r) return null;
      const [muscles, relations, media] = await Promise.all([
        db.getAllAsync<ExerciseMuscle>(
          `SELECT mg.id, mg.name_es AS name, em.role, mg.function_text AS functionText
             FROM exercise_muscles em JOIN muscle_groups mg ON mg.id = em.muscle_group_id
            WHERE em.exercise_id = ?
            ORDER BY CASE em.role WHEN 'agonist' THEN 0 WHEN 'synergist' THEN 1 ELSE 2 END, mg.sort_order`,
          [id],
        ),
        db.getAllAsync<{ id: string; name: string; kind: 'variant' | 'substitute' }>(
          `SELECT x.id, x.name_es AS name, r.kind FROM exercise_relations r
             JOIN exercises x ON x.id = r.related_exercise_id
            WHERE r.exercise_id = ? AND x.deleted_at IS NULL ORDER BY x.name_es`,
          [id],
        ),
        db.getAllAsync<ExerciseMedia>(
          `SELECT kind, status, uri, source, license, attribution FROM exercise_media WHERE exercise_id = ?`,
          [id],
        ),
      ]);
      return {
        ...toItem(r),
        altNames: json(r.alt_names, []),
        description: r.description,
        instructions: json(r.instructions, []),
        biomechanics: json(r.biomechanics, {}),
        errors: json(r.common_errors, []),
        tips: json(r.tips, []),
        muscles,
        substitutes: relations.filter((x) => x.kind === 'substitute'),
        variants: relations.filter((x) => x.kind === 'variant'),
        media,
        contentSource: r.content_source,
        isCustom: r.is_custom === 1,
      };
    },

    /** Exercises where a muscle participates, grouped by role. */
    async byMuscle(muscleId: string): Promise<(ExerciseListItem & { role: MuscleRole })[]> {
      const rows = await db.getAllAsync<ListRow & { role: MuscleRole }>(
        `SELECT e.id, e.slug, e.name_es AS name, e.alt_names, e.primary_muscle_group_id AS primaryMuscleId,
                mg.name_es AS primaryMuscleName, e.equipment, e.difficulty, e.movement_type AS movementType,
                e.movement_pattern AS pattern, e.tags, em.role
           FROM exercise_muscles em
           JOIN exercises e ON e.id = em.exercise_id AND e.deleted_at IS NULL
           JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
          WHERE em.muscle_group_id = ?
          ORDER BY CASE em.role WHEN 'agonist' THEN 0 WHEN 'synergist' THEN 1 ELSE 2 END,
                   e.movement_type, e.name_es`,
        [muscleId],
      );
      return rows.map((r) => ({ ...toItem(r), role: r.role }));
    },
  };
}
