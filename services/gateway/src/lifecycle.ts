// platform: the P0 service lifecycle. NEW, and P0-only: start, log one line, idle, stop.
// It is replaced at P2 by the ported gateway.ts / simulator.ts, which wire the control plane
// and the audio plane onto exactly this shape. Nothing here opens a socket or connects anywhere.
import type { Clock } from "./clock.js";
import type { LineSink } from "./log/logger.js";

export type ServiceName = "gateway" | "simulator";
export type StopSignal = "SIGINT" | "SIGTERM";

/** Holds the event loop open and nothing else. One referenced timer, no work in the callback. */
export const IDLE_TICK_MS = 60_000;

export type IntervalApi = Readonly<{
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}>;

export const systemIntervals: IntervalApi = Object.freeze({
  set: (fn, ms) => globalThis.setInterval(fn, ms),
  clear: (handle) => {
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>);
  },
});

export type LifecycleDeps = Readonly<{
  service: ServiceName;
  appEnv: string;
  listenHost: string;
  pid: number;
  sink: LineSink;
  clock: Clock;
  intervals?: IntervalApi;
}>;

export type Lifecycle = Readonly<{
  /** Idempotent: the first call wins and every later one is ignored. */
  stop: (signal: StopSignal) => void;
  idling: () => boolean;
}>;

/**
 * Emits the start line, holds the loop open, and on the first stop signal emits the stop line
 * and clears the timer. It never calls process.exit: the ported crash handler owns the exit, so
 * a container gets code 0 without this module knowing what a process is.
 */
export function startLifecycle(deps: LifecycleDeps): Lifecycle {
  const intervals = deps.intervals ?? systemIntervals;
  const startedAt = deps.clock.now();

  deps.sink.writeLine(
    JSON.stringify({
      event: "service_start",
      service: deps.service,
      app_env: deps.appEnv,
      listen_host: deps.listenHost,
      pid: deps.pid,
    }),
  );

  let handle: unknown = intervals.set(() => {
    // Deliberately empty. The timer exists to keep the event loop referenced.
  }, IDLE_TICK_MS);

  return Object.freeze({
    stop: (signal: StopSignal): void => {
      if (handle === null) return;
      intervals.clear(handle);
      handle = null;
      deps.sink.writeLine(
        JSON.stringify({
          event: "service_stop",
          service: deps.service,
          signal,
          uptime_ms: deps.clock.now() - startedAt,
        }),
      );
    },
    idling: () => handle !== null,
  });
}
