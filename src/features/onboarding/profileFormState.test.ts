import { fieldErrors, initialFormState, toProfileInput } from './profileFormState';

describe('profile form validation', () => {
  it('defaults to body recomposition and all gym equipment', () => {
    const s = initialFormState();
    expect(s.goal).toBe('recomposition');
    expect(s.equipment).toHaveLength(10);
  });

  it('accepts comma decimals and leaves the target weight optional', () => {
    const s = { ...initialFormState(), age: '31', height: '178', weight: '82,4' };
    const r = toProfileInput(s);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.weightKg).toBe(82.4);
      expect(r.data.targetWeightKg).toBeNull();
    }
  });

  it('reports out-of-range values per field', () => {
    const e = fieldErrors({ ...initialFormState(), age: '9', height: '300', weight: '' });
    expect(e.ageYears).toMatch(/13/);
    expect(e.heightCm).toMatch(/250/);
    expect(e.weightKg).toBeDefined();
  });

  it('limits priority muscles to 3', () => {
    const e = fieldErrors({ ...initialFormState(), age: '30', height: '170', weight: '70', priorityMuscles: ['a', 'b', 'c', 'd'] });
    expect(e.priorityMuscles).toMatch(/3/);
  });
});
