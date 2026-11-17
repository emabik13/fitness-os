import { incomingWins } from './conflict';

describe('conflict resolution', () => {
  it('higher version wins, then later update, else keep local', () => {
    expect(incomingWins(null, { version: 1, updated_at: 'a' })).toBe(true);
    expect(incomingWins({ version: 3, updated_at: '2026-01-02' }, { version: 2, updated_at: '2026-05-01' })).toBe(false);
    expect(incomingWins({ version: 2, updated_at: '2026-01-02' }, { version: 3, updated_at: '2026-01-01' })).toBe(true);
    expect(incomingWins({ version: 2, updated_at: '2026-01-02' }, { version: 2, updated_at: '2026-01-03' })).toBe(true);
    expect(incomingWins({ version: 2, updated_at: '2026-01-02' }, { version: 2, updated_at: '2026-01-02' })).toBe(false);
  });
});
