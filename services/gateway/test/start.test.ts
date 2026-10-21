// platform: the built service starts, logs one line, idles, and stops cleanly on a signal.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ENTRY = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const CWD = fileURLToPath(new URL("..", import.meta.url));

const LOCAL_ENV: Readonly<Record<string, string>> = Object.freeze({
  APP_ENV: "local",
  MQTT_BROKER_URL: "mqtt://127.0.0.1:1883",
  AUDIO_WSS_URL: "ws://127.0.0.1:8081",
  DEVICE_ID: "dev_local_only",
  DEVICE_TOKEN: "dev_local_only_not_a_secret",
  GATEWAY_OPERATOR_PORT: "8090",
});

type Run = { code: number | null; out: string; err: string };

function run(env: Record<string, string>, opts: { signalAfterMs?: number } = {}): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [ENTRY], {
      cwd: CWD,
      env: { PATH: process.env.PATH ?? "", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    if (opts.signalAfterMs !== undefined) {
      setTimeout(() => child.kill("SIGTERM"), opts.signalAfterMs);
    }
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

describe("gateway start", () => {
  // Windows has no signals: child.kill() calls TerminateProcess, so a SIGTERM handler never
  // runs and no stop line can be observed. The stop path is a POSIX and container behaviour, and
  // it is asserted where it actually matters - on Linux in CI, and by the Compose acceptance test
  // in wave C, which sends a real SIGTERM with `docker compose stop`. On Windows this asserts
  // what Windows can observe: one start line, then a process that is still idling.
  const POSIX = process.platform !== "win32";

  it("logs one start line and idles", async () => {
    const r = await run({ ...LOCAL_ENV }, { signalAfterMs: 1_500 });
    const lines = r.out
      .trim()
      .split("\n")
      .filter((l) => l !== "");
    expect(r.err).toBe("");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const start = JSON.parse(lines[0] as string) as Record<string, unknown>;
    expect(start["event"]).toBe("service_start");
    expect(start["service"]).toBe("gateway");
    expect(start["pid"]).toBeTypeOf("number");
  }, 20_000);

  it.runIf(POSIX)(
    "stops with one stop line and code 0 on SIGTERM",
    async () => {
      const r = await run({ ...LOCAL_ENV }, { signalAfterMs: 1_500 });
      const lines = r.out
        .trim()
        .split("\n")
        .filter((l) => l !== "");
      expect(lines).toHaveLength(2);
      const stop = JSON.parse(lines[1] as string) as Record<string, unknown>;
      expect(stop["event"]).toBe("service_stop");
      expect(stop["service"]).toBe("gateway");
      expect(stop["signal"]).toBe("SIGTERM");
      expect(stop["uptime_ms"]).toBeTypeOf("number");
      expect(r.code).toBe(0);
    },
    20_000,
  );

  it("never writes a value from the environment", async () => {
    const sentinel = "sentinel-value-must-not-appear";
    const r = await run(
      { ...LOCAL_ENV, DEVICE_TOKEN: sentinel, MQTT_PASSWORD: sentinel },
      { signalAfterMs: 1_000 },
    );
    expect(r.out).not.toContain(sentinel);
    expect(r.err).not.toContain(sentinel);
  }, 20_000);

  it("reports the offending key names and exits non-zero on a bad config", async () => {
    const r = await run({ ...LOCAL_ENV, GATEWAY_OPERATOR_PORT: "not-a-port" });
    expect(r.out).toBe("");
    expect(r.err).toContain("GATEWAY_OPERATOR_PORT");
    expect(r.err).not.toContain("not-a-port");
    expect(r.code).not.toBe(0);
  }, 20_000);

  it("exits non-zero with an empty environment and writes no start line", async () => {
    const r = await run({});
    expect(r.out).toBe("");
    expect(r.code).not.toBe(0);
  }, 20_000);
});
