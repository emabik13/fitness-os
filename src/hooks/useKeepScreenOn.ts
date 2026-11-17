import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

/**
 * Keeps the screen on while mounted (workout mode). Failures are ignored:
 * some browsers deny the Wake Lock API, and the app must keep working.
 */
export function useKeepScreenOn(tag = 'fitness-os-workout'): void {
  useEffect(() => {
    let active = false;
    activateKeepAwakeAsync(tag).then(
      () => {
        active = true;
      },
      () => {},
    );
    return () => {
      if (!active) return;
      Promise.resolve()
        .then(() => deactivateKeepAwake(tag))
        .catch(() => {});
    };
  }, [tag]);
}
