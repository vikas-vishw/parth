// platform: the Compose acceptance check's pure machinery, and the three P0 criteria it runs. Ported from .reference/xelulu/tooling/test/compose-acceptance.test.ts
//
// NARROWED AT P0, heavily and deliberately. The ported original is 43 KB, and most of it drives
// the 23.x step predicates with fixture log entries built from WIRE VALUES - message variants,
// event names, ack reasons. Those values are Document B-P's to define and B-P does not exist, so
// porting those suites would bake the sibling product's vocabulary into this repository through
// a test file. They arrive at P2, with the contract and with the steps they exercise.
//
// What is here instead: the pure machinery that names no wire value - budget arithmetic, failure
// naming, log parsing, redaction, the `.env` tuple writer, the Req 23.11 refusal - plus the three
// P0 criteria predicates, plus the source-hygiene assertions that keep a URL literal and a
// Panel_Key assignment out of the check itself.
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  BUDGET_MS,
  CI_DEVICE_TOKEN,
  CRITERIA,
  CheckFailure,
  DEVICE_ID_VALUE,
  KILL_WORDS,
  PASSED_LINE,
  QUIET_WORDS,
  REDACTED,
  ROOT_ENV_SENTINEL,
  SERVICES,
  START_EVENT,
  STOP_EVENT,
  STOP_SIGNAL,
  checkExitedZero,
  checkHealthy,
  checkNoKill,
  checkQuiet,
  checkRunning,
  checkStartLine,
  checkStopLine,
  envFileText,
  isOurScratchEnv,
  localEnvEntries,
  newDeviceToken,
  parseLogLines,
  psRecords,
  redact,
  remainingMs,
  resultLine,
  rootEnvRefusal,
  rootEnvRefusalFor,
  runInOrder,
  timeoutLabel,
  urlFrom,
  waitLimitMs,
  type Criterion,
  type Step,
  type Verdict,
} from "../compose/compose-acceptance.js";
import { parsePanel } from "../checks/panel.js";
import { URL_SCHEMES } from "../checks/url-scan.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE_PATH = join(ROOT, "tooling", "compose", "compose-acceptance.ts");

const status = (v: Verdict): string => v.status;

/** One `docker compose ps --format json` row, as Compose prints it. */
function row(service: string, extra: Readonly<Record<string, unknown>> = {}): string {
  return JSON.stringify({ Service: service, Name: `parth-${service}-1`, ...extra });
}

function line(event: string, service: string, extra: Readonly<Record<string, unknown>> = {}) {
  return JSON.stringify({ event, service, ...extra });
}

const startLine = (service: string): string =>
  line(START_EVENT, service, { app_env: "local", listen_host: "0.0.0.0", pid: 1 });
const stopLine = (service: string, signal: string = STOP_SIGNAL): string =>
  line(STOP_EVENT, service, { signal, uptime_ms: 1_234 });

describe("the P0 criteria", () => {
  it("runs up, then quiet, then stop, ahead of the ported 23.x criteria", () => {
    expect(CRITERIA.slice(0, 3)).toEqual(["up", "quiet", "stop"]);
    expect(PASSED_LINE).toBe("PASSED up + quiet + stop");
    expect(SERVICES).toEqual(["gateway", "simulator"]);
  });

  describe("psRecords", () => {
    it("reads one object per line and a JSON array alike", () => {
      expect(psRecords(`${row("gateway")}\n${row("simulator")}\n`)).toHaveLength(2);
      expect(psRecords(`[${row("gateway")},${row("simulator")}]`)).toHaveLength(2);
    });

    it("yields nothing for empty, malformed or non-object output", () => {
      for (const text of ["", "   ", "not json", "[1,2]", "{oops"]) {
        expect(psRecords(text), text).toEqual([]);
      }
    });
  });

  describe("up", () => {
    it("passes on healthy, waits on starting and fails on unhealthy", () => {
      expect(status(checkHealthy(row("emqx", { Health: "healthy" }), "emqx"))).toBe("pass");
      expect(status(checkHealthy(row("emqx", { Health: "starting" }), "emqx"))).toBe("pending");
      expect(status(checkHealthy("", "emqx"))).toBe("pending");
      expect(status(checkHealthy(row("emqx", { Health: "unhealthy" }), "emqx"))).toBe("fail");
    });

    it("passes on running, waits for a container that is not there yet, fails on any other state", () => {
      expect(status(checkRunning(row("gateway", { State: "running" }), "gateway"))).toBe("pass");
      expect(status(checkRunning("", "gateway"))).toBe("pending");
      for (const state of ["exited", "restarting", "dead", "created"]) {
        expect(status(checkRunning(row("gateway", { State: state }), "gateway")), state).toBe(
          "fail",
        );
      }
    });

    it("reads the row by service name, not by position", () => {
      const both = `${row("simulator", { State: "exited" })}\n${row("gateway", { State: "running" })}`;
      expect(status(checkRunning(both, "gateway"))).toBe("pass");
      expect(status(checkRunning(both, "simulator"))).toBe("fail");
    });
  });

  describe("quiet", () => {
    it("passes on exactly one start line naming the service", () => {
      expect(status(checkStartLine(`${startLine("gateway")}\n`, "gateway"))).toBe("pass");
    });

    it("waits while the log is empty", () => {
      expect(status(checkStartLine("", "gateway"))).toBe("pending");
      expect(status(checkStartLine("\n\n", "gateway"))).toBe("pending");
    });

    it("fails on a second line of any kind, so the idle claim cannot be filtered", () => {
      const two = `${startLine("gateway")}\n${line("anything_at_all", "gateway")}\n`;
      expect(status(checkStartLine(two, "gateway"))).toBe("fail");
    });

    it("fails on a line that is not JSON, on the wrong event, or on the wrong service", () => {
      expect(status(checkStartLine("starting up...\n", "gateway"))).toBe("fail");
      expect(status(checkStartLine(`${line("service_ready", "gateway")}\n`, "gateway"))).toBe(
        "fail",
      );
      expect(status(checkStartLine(`${startLine("simulator")}\n`, "gateway"))).toBe("fail");
    });

    it("fails a log that mentions a connection, a subscription, a publish or a socket", () => {
      expect(status(checkQuiet(`${startLine("gateway")}\n`))).toBe("pass");
      for (const word of QUIET_WORDS) {
        expect(status(checkQuiet(`{"event":"${word}"}`)), word).toBe("fail");
        expect(status(checkQuiet(`{"event":"${word.toUpperCase()}"}`)), word).toBe("fail");
      }
    });
  });

  describe("stop", () => {
    it("passes on a start then one stop carrying SIGTERM and an uptime", () => {
      const log = `${startLine("gateway")}\n${stopLine("gateway")}\n`;
      expect(status(checkStopLine(log, "gateway"))).toBe("pass");
    });

    it("waits while only the start line is there", () => {
      expect(status(checkStopLine(`${startLine("gateway")}\n`, "gateway"))).toBe("pending");
    });

    it("fails on a second stop line", () => {
      const log = `${startLine("gateway")}\n${stopLine("gateway")}\n${stopLine("gateway")}\n`;
      expect(status(checkStopLine(log, "gateway"))).toBe("fail");
    });

    it("fails on any signal other than SIGTERM, and on a missing uptime", () => {
      const other = `${startLine("gateway")}\n${stopLine("gateway", "SIGINT")}\n`;
      expect(status(checkStopLine(other, "gateway"))).toBe("fail");
      const noUptime = `${startLine("gateway")}\n${line(STOP_EVENT, "gateway", { signal: STOP_SIGNAL })}\n`;
      expect(status(checkStopLine(noUptime, "gateway"))).toBe("fail");
    });

    it("fails a stop that was not preceded by exactly one start", () => {
      expect(status(checkStopLine(`${stopLine("gateway")}\n`, "gateway"))).toBe("fail");
    });

    it("passes an exit code of 0 and fails any other", () => {
      const exited = (code: number): string => row("gateway", { State: "exited", ExitCode: code });
      expect(status(checkExitedZero(exited(0), "gateway"))).toBe("pass");
      expect(status(checkExitedZero(exited(1), "gateway"))).toBe("fail");
      expect(status(checkExitedZero(exited(143), "gateway"))).toBe("fail");
      expect(status(checkExitedZero(row("gateway", { State: "running" }), "gateway"))).toBe(
        "pending",
      );
      expect(status(checkExitedZero("", "gateway"))).toBe("fail");
    });

    it("fails when Compose had to kill a container after a timeout", () => {
      expect(status(checkNoKill(" Container parth-gateway-1  Stopped\n"))).toBe("pass");
      for (const word of KILL_WORDS) {
        expect(status(checkNoKill(`Container parth-gateway-1 ${word}ing`)), word).toBe("fail");
      }
    });
  });
});

describe("gateway log parsing", () => {
  it("parses every non-blank line as a JSON object", () => {
    expect(parseLogLines('{"kind":"gateway"}\r\n\n{"kind":"auth"}\n')).toEqual({
      ok: true,
      entries: [{ kind: "gateway" }, { kind: "auth" }],
    });
  });

  it("fails on the first line that is not a JSON object, by number only", () => {
    expect(parseLogLines('{"a":1}\nnot json\n')).toEqual({ ok: false, lineNo: 2 });
    expect(parseLogLines("[1]\n")).toEqual({ ok: false, lineNo: 1 });
  });
});

describe("budget arithmetic", () => {
  it("counts the 600 s budget down to zero, never below", () => {
    expect(BUDGET_MS).toBe(600_000);
    expect(remainingMs(1_000, 1_000)).toBe(600_000);
    expect(remainingMs(1_000, 1_000 + BUDGET_MS)).toBe(0);
    expect(remainingMs(1_000, 1_000 + BUDGET_MS + 5_000)).toBe(0);
  });

  it("bounds each wait by its own limit and the budget left", () => {
    expect(waitLimitMs(10_000, 600_000)).toBe(10_000);
    expect(waitLimitMs(10_000, 4_000)).toBe(4_000);
    expect(waitLimitMs(10_000, -1)).toBe(0);
  });

  it("names the budget when the budget cut a wait short, else the criterion", () => {
    expect(timeoutLabel("stop", 10_000, 600_000)).toBe("stop");
    expect(timeoutLabel("stop", 10_000, 10_000)).toBe("stop");
    expect(timeoutLabel("stop", 10_000, 9_999)).toBe("budget");
  });
});

describe("first-failure naming", () => {
  const CRITS: readonly Criterion[] = ["up", "quiet", "stop"];

  function steps(failAt: Criterion | null, ran: Criterion[] = [], error?: Error): readonly Step[] {
    return CRITS.map((criterion) => ({
      criterion,
      run: async () => {
        ran.push(criterion);
        if (criterion === failAt) {
          throw error ?? new CheckFailure(criterion, "the reason");
        }
        await Promise.resolve();
      },
    }));
  }

  it("passes when every step passes, and names the pass line", async () => {
    const ran: Criterion[] = [];
    const result = await runInOrder(steps(null, ran), () => 1);
    expect(result.ok).toBe(true);
    expect(ran).toEqual(["up", "quiet", "stop"]);
    expect(resultLine(result)).toBe(PASSED_LINE);
  });

  it("stops at the first failure and names it", async () => {
    const ran: Criterion[] = [];
    const result = await runInOrder(steps("quiet", ran), () => 1);
    expect(resultLine(result)).toBe("FAILED quiet");
    expect(ran).toEqual(["up", "quiet"]);
  });

  it("names the step's own criterion for an unexpected error", async () => {
    const result = await runInOrder(steps("stop", [], new Error("boom")), () => 1);
    expect(resultLine(result)).toBe("FAILED stop");
  });

  it("names the budget when a step reports it, or when it runs out between steps", async () => {
    const reported = await runInOrder(steps("up", [], new CheckFailure("budget", "x")), () => 1);
    expect(resultLine(reported)).toBe("FAILED budget");
    const ranOut = await runInOrder(steps(null), () => 0);
    expect(resultLine(ranOut)).toBe("FAILED budget");
  });
});

describe("token redaction", () => {
  it("replaces every occurrence of the token", () => {
    const token = newDeviceToken();
    const text = `a ${token} b ${token}${token}\n`;
    const out = redact(text, token);
    expect(out).not.toContain(token);
    expect(out).toBe(`a ${REDACTED} b ${REDACTED}${REDACTED}\n`);
  });

  it("leaves the text alone when there is no token, which is the P0 case", () => {
    expect(redact("anything at all", "")).toBe("anything at all");
  });

  it("makes a 32-byte base64url token, new per call", () => {
    const a = newDeviceToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newDeviceToken()).not.toBe(a);
  });
});

describe(".env lines from tuples", () => {
  it("writes the Local_Mode values, one KEY=value line per tuple, behind the sentinel", () => {
    const token = newDeviceToken();
    const text = envFileText(localEnvEntries(token));
    const lines = text.split("\n").filter((l) => l !== "");
    expect(lines[0]).toBe(ROOT_ENV_SENTINEL);
    expect(lines.slice(1).every((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))).toBe(true);
    expect(text).toContain(token);
    // The acceptance device is this product's, never the sibling's.
    expect(DEVICE_ID_VALUE.startsWith("prt_")).toBe(true);
    expect(CI_DEVICE_TOKEN).toMatch(/not_a_secret/);
  });

  it("supplies no broker credential: the two keys are absent, not empty", () => {
    const keys = localEnvEntries("t").map(([key]) => key);
    expect(keys).not.toContain("MQTT_USERNAME");
    expect(keys).not.toContain("MQTT_PASSWORD");
  });

  it("builds URLs from parts", () => {
    expect(new URL(urlFrom("ws", "gateway", 8081)).host).toBe("gateway:8081");
  });

  it("refuses a bad key, a repeated key or a value with a line break", () => {
    expect(() => envFileText([["bad key", "x"]])).toThrow();
    expect(() =>
      envFileText([
        ["A", "1"],
        ["A", "2"],
      ]),
    ).toThrow();
    expect(() => envFileText([["A", "1\n2"]])).toThrow();
  });
});

describe("the pre-existing root env file (Req 23.11)", () => {
  const dir = mkdtempSync(join(tmpdir(), "parth-acceptance-"));
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("lets the check proceed when there is none", () => {
    expect(rootEnvRefusal(false)).toEqual([]);
    expect(rootEnvRefusalFor(join(dir, "absent.env"))).toEqual([]);
  });

  it("refuses, and names the file rather than reading it, when one is there", () => {
    const path = join(dir, "developers.env");
    writeFileSync(path, "SUPABASE_SERVICE_KEY=a-real-looking-value\n");
    const refusal = rootEnvRefusalFor(path);
    expect(refusal.length).toBe(2);
    expect(refusal.join("\n")).not.toContain("a-real-looking-value");
    // And it is still there afterwards: the refusal reads, and never writes or removes.
    expect(readFileSync(path, "utf8")).toContain("SUPABASE_SERVICE_KEY");
  });

  it("recognises its own scratch file by its sentinel and does not refuse for it", () => {
    const path = join(dir, "scratch.env");
    writeFileSync(path, envFileText(localEnvEntries("t")));
    expect(isOurScratchEnv(path)).toBe(true);
    expect(rootEnvRefusalFor(path)).toEqual([]);
    // A developer's own file carries no sentinel, so it is never mistaken for ours.
    const theirs = join(dir, "theirs.env");
    writeFileSync(theirs, "APP_ENV=local\n");
    expect(isOurScratchEnv(theirs)).toBe(false);
    expect(isOurScratchEnv(join(dir, "nothing-here.env"))).toBe(false);
  });
});

describe("compose-acceptance.ts source", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("holds no scheme:// literal", () => {
    const literal = new RegExp(`(?<![A-Za-z0-9])(?:${URL_SCHEMES.join("|")}):\\/\\/`, "i");
    expect(source).not.toMatch(literal);
  });

  it("holds no Panel_Key declaration line, empty or not", () => {
    const keys = parsePanel(
      readFileSync(join(ROOT, "tooling", "fixtures", "approved-panel.txt"), "utf8"),
    ).flatMap((l) => (l.kind === "decl" && typeof l.key === "string" ? [l.key] : []));
    expect(keys.length).toBeGreaterThan(0);
    const offenders = keys.filter((key) => new RegExp(`^\\s*(?://\\s*)?${key}=`, "m").test(source));
    expect(offenders, `source assigns: ${offenders.join(", ")}`).toEqual([]);
  });

  it("carries the sibling product's path as a port origin, and its device prefix nowhere", () => {
    expect(source).toContain("Ported from .reference/xelulu/tooling/compose/compose-acceptance.ts");
    expect(source).not.toContain("xlu_");
  });
});
