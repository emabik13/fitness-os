import { remainingSeconds, useRestTimer } from './restTimerStore';

describe('rest timer', () => {
  it('counts down from an absolute end time and can be extended or stopped', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    useRestTimer.getState().start(90, 'Press');
    expect(remainingSeconds(useRestTimer.getState().endsAt, 1_000_000)).toBe(90);
    expect(remainingSeconds(useRestTimer.getState().endsAt, 1_030_000)).toBe(60);
    useRestTimer.getState().add(15);
    expect(remainingSeconds(useRestTimer.getState().endsAt, 1_000_000)).toBe(105);
    useRestTimer.getState().add(-200);
    expect(remainingSeconds(useRestTimer.getState().endsAt, 1_000_000)).toBe(0);
    useRestTimer.getState().stop();
    expect(useRestTimer.getState().endsAt).toBeNull();
    jest.restoreAllMocks();
  });
});
