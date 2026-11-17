import {
  profileInputSchema,
  parseDecimal,
  type Equipment,
  type Experience,
  type Goal,
  type LiftLevel,
  type LiftPattern,
  type LimitationArea,
  type Preferences,
  type Profile,
  type ProfileInput,
  type Sex,
  EQUIPMENT,
} from '@/domain/profile';

/** Raw form state (numbers typed as text so users can edit freely). */
export interface ProfileFormState {
  age: string;
  sex: Sex | null;
  height: string;
  weight: string;
  targetWeight: string;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  priorityMuscles: string[];
  limitations: LimitationArea[];
  limitationNote: string;
  liftExperience: Partial<Record<LiftPattern, LiftLevel>>;
  equipment: Equipment[];
  preferences: Preferences;
}

export function initialFormState(profile?: Profile | null, latestWeightKg?: number | null): ProfileFormState {
  if (!profile) {
    return {
      age: '',
      sex: null,
      height: '',
      weight: latestWeightKg ? String(latestWeightKg).replace('.', ',') : '',
      targetWeight: '',
      goal: 'recomposition',
      experience: 'beginner',
      daysPerWeek: 3,
      sessionMinutes: 60,
      priorityMuscles: [],
      limitations: [],
      limitationNote: '',
      liftExperience: {},
      equipment: [...EQUIPMENT],
      preferences: { effortScale: 'rir', preferMachines: false, includeCore: true },
    };
  }
  return {
    age: String(profile.ageYears),
    sex: profile.sex,
    height: String(profile.heightCm).replace('.', ','),
    weight: latestWeightKg ? String(latestWeightKg).replace('.', ',') : '',
    targetWeight: profile.targetWeightKg ? String(profile.targetWeightKg).replace('.', ',') : '',
    goal: profile.goal,
    experience: profile.experience,
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    priorityMuscles: profile.priorityMuscles,
    limitations: profile.limitations.map((l) => l.area),
    limitationNote: profile.limitations[0]?.note ?? '',
    liftExperience: profile.liftExperience,
    equipment: profile.equipment.length ? profile.equipment : [...EQUIPMENT],
    preferences: profile.preferences,
  };
}

export function toProfileInput(s: ProfileFormState) {
  const raw = {
    ageYears: parseDecimal(s.age) ?? undefined,
    sex: s.sex,
    heightCm: parseDecimal(s.height) ?? undefined,
    weightKg: parseDecimal(s.weight) ?? undefined,
    targetWeightKg: parseDecimal(s.targetWeight),
    goal: s.goal,
    experience: s.experience,
    daysPerWeek: s.daysPerWeek,
    sessionMinutes: s.sessionMinutes,
    priorityMuscles: s.priorityMuscles,
    limitations: s.limitations.map((area) => ({ area, note: s.limitationNote.trim() })),
    liftExperience: s.liftExperience,
    equipment: s.equipment,
    preferences: s.preferences,
  };
  return profileInputSchema.safeParse(raw);
}

/** Field → first error message, for inline display. */
export function fieldErrors(s: ProfileFormState): Partial<Record<keyof ProfileInput, string>> {
  const r = toProfileInput(s);
  if (r.success) return {};
  const out: Partial<Record<keyof ProfileInput, string>> = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof ProfileInput;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export const STEP_FIELDS: (keyof ProfileInput)[][] = [
  ['ageYears', 'sex', 'heightCm', 'weightKg', 'targetWeightKg'],
  ['goal', 'experience'],
  ['daysPerWeek', 'sessionMinutes', 'priorityMuscles'],
  ['equipment', 'limitations', 'liftExperience', 'preferences'],
];
