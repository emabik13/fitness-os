import { activityFactor, mifflinStJeor, nutritionTargets } from './targets';

describe('nutrition targets', () => {
  it('implements Mifflin-St Jeor', () => {
    // Reference: male 80 kg, 180 cm, 30 y → 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(mifflinStJeor('male', 80, 180, 30)).toBe(1780);
    expect(mifflinStJeor('female', 60, 165, 30)).toBe(1320);
    expect(activityFactor(4)).toBe(1.55);
  });

  it('gives ranges for recomposition with protein 1.8–2.2 g/kg', () => {
    const t = nutritionTargets({ sex: 'male', ageYears: 30, heightCm: 180, weightKg: 80, trainingDaysPerWeek: 4, goal: 'recomposition' });
    expect(t.maintenanceKcal).toBe(2760);
    expect(t.calories).toEqual({ min: 2500, max: 2750 });
    expect(t.proteinG).toEqual({ min: 145, max: 175 });
    expect(t.fatMinG).toBe(50);
    expect(t.carbsG!.min).toBeGreaterThan(0);
    expect(t.notes.join(' ')).toMatch(/estimación/);
  });

  it('does not estimate calories without sex, nor anything without weight', () => {
    const noSex = nutritionTargets({ sex: null, ageYears: 30, heightCm: 180, weightKg: 80, trainingDaysPerWeek: 3, goal: 'hypertrophy' });
    expect(noSex.calories).toBeNull();
    expect(noSex.proteinG).toEqual({ min: 130, max: 175 });
    const noWeight = nutritionTargets({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: null, trainingDaysPerWeek: 3, goal: 'maintenance' });
    expect(noWeight.proteinG).toBeNull();
    expect(noWeight.waterMl).toEqual({ min: 2000, max: 2000 });
  });
});
