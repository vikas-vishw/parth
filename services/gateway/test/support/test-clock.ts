// platform: a Clock the test drives by hand. now() still never goes backwards.
import type { Clock, TimerHandle } from "../../src/clock.js";

export type TestClock = Clock & { advance: (ms: number) => void; readonly timers: number };

export function createTestClock(startMs = 1_700_000_000_000): TestClock {
  let t = startMs;
  let open = 0;
  return {
    now: () => t,
    setTimer: (): TimerHandle => {
      open += 1;
      return { id: open };
    },
    clearTimer: () => {
      open -= 1;
    },
    advance: (ms: number) => {
      t += Math.max(0, ms);
    },
    get timers() {
      return open;
    },
  };
}
