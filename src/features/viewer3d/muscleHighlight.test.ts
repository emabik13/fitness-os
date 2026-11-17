import { presetPosition, roleForMesh } from './muscleHighlight';

describe('3D muscle highlighting', () => {
  const roles = new Map([
    ['pectorals', 'agonist' as const],
    ['triceps', 'synergist' as const],
  ]);
  it('matches meshes named after muscle ids', () => {
    expect(roleForMesh('Pectorals_L', roles)).toBe('agonist');
    expect(roleForMesh('triceps.001', roles)).toBe('synergist');
    expect(roleForMesh('pectoralsMinor', roles)).toBeNull();
    expect(roleForMesh('skin', roles)).toBeNull();
  });
  it('places the camera for front/back/side views', () => {
    expect(presetPosition('front', 1)[2]).toBeGreaterThan(0);
    expect(presetPosition('back', 1)[2]).toBeLessThan(0);
    expect(presetPosition('side', 1)[0]).toBeGreaterThan(0);
  });
});
