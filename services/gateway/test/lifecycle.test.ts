// platform: Property 15 - the lifecycle is start, idle, stop, once each.
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { IDLE_TICK_MS, startLifecycle, type StopSignal } from "../src/lifecycle.js";
import { createCaptureSink } from "./support/capture-sink.js";
import { createTestClock } from "./support/test-clock.js";

const SIGNALS: readonly StopSignal[] = ["SIGINT", "SIGTERM"];

function boot(appEnv = "local", listenHost = "127.0.0.1") {
  const sink = createCaptureSink();
  const clock = createTestClock();
  let open = 0;
  const lifecycle = startLifecycle({
    service: "gateway",
    appEnv,
    listenHost,
    pid: 4242,
    sink,
    clock,
    intervals: {
      set: () => {
        open += 1;
        return open;
      },
      clear: () => {
        open -= 1;
      },
    },
  });
  return { sink, clock, lifecycle, openCount: () => open };
}

describe("gateway lifecycle", () => {
  it("emits exactly one start line, with a fixed key order and no secret", () => {
    const { sink } = boot();
    expect(sink.lines).toHaveLength(1);
    expect(sink.lines[0]).toBe(
      JSON.stringify({
        event: "service_start",
        service: "gateway",
        app_env: "local",
        listen_host: "127.0.0.1",
        pid: 4242,
      }),
    );
  });

  it("holds exactly one referenced timer while idling", () => {
    const { lifecycle, openCount } = boot();
    expect(openCount()).toBe(1);
    expect(lifecycle.idling()).toBe(true);
    expect(IDLE_TICK_MS).toBeGreaterThan(0);
  });

  it("writes nothing between the start line and a stop signal", () => {
    const { sink, clock } = boot();
    clock.advance(10 * IDLE_TICK_MS);
    expect(sink.lines).toHaveLength(1);
  });

  it("start then stop, once each, naming the first signal, for any signal sequence", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...SIGNALS), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 86_400_000 }),
        (signals, elapsed) => {
          const { sink, clock, lifecycle, openCount } = boot();
          clock.advance(elapsed);
          for (const s of signals) lifecycle.stop(s);

          expect(sink.lines).toHaveLength(2);
          const stop = JSON.parse(sink.lines[1] as string) as Record<string, unknown>;
          expect(stop["event"]).toBe("service_stop");
          expect(stop["service"]).toBe("gateway");
          expect(stop["signal"]).toBe(signals[0]);
          expect(stop["uptime_ms"]).toBe(elapsed);
          expect(openCount()).toBe(0);
          expect(lifecycle.idling()).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("carries no environment value other than app_env and listen_host", () => {
    const { sink } = boot("local", "0.0.0.0");
    const start = JSON.parse(sink.lines[0] as string) as Record<string, unknown>;
    expect(Object.keys(start)).toEqual(["event", "service", "app_env", "listen_host", "pid"]);
  });
});
