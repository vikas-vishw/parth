// platform: Property 5: exactly the non-empty panel assignments are flagged, and never echoed. The pure detectors are the ported modules; the repository expectations
// are Parth's, because the sibling product's were about the sibling product's layout.
// Detector origin: .reference/xelulu/tooling/checks/secret-scan.ts

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { parsePanel, type PanelLine } from "../checks/panel.js";
import { formatFindings, scanText } from "../checks/secret-scan.js";

const ROOT = process.cwd();
const read = (rel: string): string => readFileSync(path.join(ROOT, rel), "utf8");

const PANEL_KEYS: readonly string[] = parsePanel(read(".env.example"))
  .filter((l): l is Extract<PanelLine, { kind: "decl" }> => l.kind === "decl")
  .map((l) => l.key);

/**
 * Tracked files that may name a panel key, because every value in them is a visible local
 * placeholder: the two Compose-default files and the four service tests that build a Local_Mode
 * environment to spawn with. The key restriction below still applies to all six, and the sizes
 * are asserted so neither list can grow without someone noticing.
 */
const LOCAL_ONLY_FILES: ReadonlySet<string> = new Set([
  ".env.local.example",
  "docker-compose.yml",
  "services/gateway/test/start.test.ts",
  "services/simulator/test/start.test.ts",
  "services/gateway/test/config.test.ts",
  "services/simulator/test/config.test.ts",
]);

/** The keys those six may name: the device seam, the two local surface ports, the bind host. */
const LOCAL_ONLY_KEYS: ReadonlySet<string> = new Set([
  "APP_ENV",
  "MQTT_BROKER_URL",
  "MQTT_USERNAME",
  "MQTT_PASSWORD",
  "AUDIO_WSS_URL",
  "DEVICE_ID",
  "DEVICE_TOKEN",
  "GATEWAY_OPERATOR_PORT",
  "SIMULATOR_PANEL_PORT",
  "DEVICE_BIND_HOST",
]);

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l !== "" &&
        !l.startsWith(".reference/") &&
        // Prose, not code: the spec and the steering pack quote the panel and the Compose
        // defaults verbatim, which is the point of them. The scan is about code and config.
        !l.startsWith(".kiro/") &&
        !l.startsWith("docs/") &&
        !/\.(png|jpg|pdf|xlsx|docx)$/.test(l),
    );
}

describe("the two allowance lists are closed", () => {
  it("names six files and ten keys, and every key is a real panel key", () => {
    expect(LOCAL_ONLY_FILES.size).toBe(6);
    expect(LOCAL_ONLY_KEYS.size).toBe(10);
    for (const k of LOCAL_ONLY_KEYS) expect(PANEL_KEYS).toContain(k);
  });

  it("allows no secret-shaped key", () => {
    for (const k of LOCAL_ONLY_KEYS) {
      expect(k).not.toMatch(/SECRET|TOKEN_?KEY|CLIENT_SECRET|API_KEY|MASTER/);
    }
  });
});

describe("Property 5: the detector flags exactly the non-empty assignments and leaks nothing", () => {
  const empties = ["", "   ", '""', "''", "${NAME}", "env(NAME)"];

  it("flags a non-empty literal and passes every empty-equivalent form", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PANEL_KEYS),
        fc.constantFrom("KEY=", "KEY: ", "export KEY=", "- KEY=", "- KEY: "),
        fc
          .string({ minLength: 8, maxLength: 64 })
          .filter((s) => s.trim() !== "" && !s.includes("#") && !s.includes("\n")),
        fc.constantFrom(...empties),
        (key, form, value, empty) => {
          const line = (v: string): string => form.replace("KEY", key) + v;
          expect(scanText("f", line(value) + "\n", PANEL_KEYS).map((f) => f.key)).toEqual([key]);
          expect(scanText("f", line(empty) + "\n", PANEL_KEYS)).toEqual([]);
          const out = formatFindings(scanText("f", line(value) + "\n", PANEL_KEYS));
          expect(out).not.toContain(value);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("Secret_Check on the real repository", () => {
  it("finds no non-empty panel assignment outside the six local-only files", () => {
    const files = trackedFiles();
    expect(files.length).toBeGreaterThan(20);
    const findings = files.flatMap((f) => {
      let text: string;
      try {
        text = read(f);
      } catch {
        return [];
      }
      return scanText(f, text, PANEL_KEYS);
    });
    const elsewhere = findings.filter((f) => !LOCAL_ONLY_FILES.has(f.path));
    // Only `path:line KEY` is ever printed, so a failure cannot leak a value.
    expect(elsewhere, formatFindings(elsewhere)).toEqual([]);

    const disallowed = findings
      .filter((f) => LOCAL_ONLY_FILES.has(f.path))
      .filter((f) => !LOCAL_ONLY_KEYS.has(f.key));
    expect(disallowed, formatFindings(disallowed)).toEqual([]);
  });

  it("leaves every key in the panel itself empty", () => {
    expect(scanText(".env.example", read(".env.example"), PANEL_KEYS)).toEqual([]);
    expect(
      scanText("approved-panel.txt", read("tooling/fixtures/approved-panel.txt"), PANEL_KEYS),
    ).toEqual([]);
  });
});
