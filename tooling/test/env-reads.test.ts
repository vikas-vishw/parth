// platform: Property 8: the environment-read detector, and who may read the environment. The pure detectors are the ported modules; the repository expectations
// are Parth's, because the sibling product's were about the sibling product's layout.
// Detector origin: .reference/xelulu/tooling/checks/env-reads.ts

import { readFileSync } from "node:fs";
import path from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { findEnvReads } from "../checks/env-reads.js";

const ROOT = process.cwd();
const read = (rel: string): string => readFileSync(path.join(ROOT, rel), "utf8");

const GATEWAY_KEYS = [
  "APP_ENV",
  "MQTT_BROKER_URL",
  "MQTT_USERNAME",
  "MQTT_PASSWORD",
  "AUDIO_WSS_URL",
  "DEVICE_ID",
  "DEVICE_TOKEN",
  "GATEWAY_OPERATOR_PORT",
] as const;
const SIMULATOR_KEYS = [...GATEWAY_KEYS.slice(0, 7), "SIMULATOR_PANEL_PORT"] as const;

describe("Property 8: the environment-read detector", () => {
  it("finds every access form and names the key", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Z0-9_]{0,20}$/),
        fc.integer({ min: 0, max: 3 }),
        (name, form) => {
          const forms = [
            `process.env.${name}`,
            `process.env["${name}"]`,
            `process.env['${name}']`,
            `import.meta.env.${name}`,
          ];
          const src = `const x = 1;\nconst y = ${forms[form]};\n`;
          const reads = findEnvReads(src);
          expect(reads.map((r) => r.name)).toContain(name);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("reports a null name for a destructured or computed access", () => {
    for (const src of [
      "const { A } = process.env;\n",
      "const k = 'A';\nconst v = process.env[k];\n",
    ]) {
      expect(findEnvReads(src).some((r) => r.name === null)).toBe(true);
    }
  });
});

describe("the real repository: who reads the environment", () => {
  it("each service reads only its own keys, by static name, in env.ts alone", () => {
    for (const [svc, keys] of [
      ["gateway", GATEWAY_KEYS],
      ["simulator", SIMULATOR_KEYS],
    ] as const) {
      const reads = findEnvReads(read(`services/${svc}/src/env.ts`));
      expect(reads.every((r) => r.name !== null)).toBe(true);
      expect([...new Set(reads.map((r) => r.name))].sort()).toEqual([...keys].sort());
    }
  });

  it("no other service source reads the environment at all", () => {
    const others = [
      "backoff",
      "clock",
      "config",
      "config-error-writer",
      "crash",
      "deadlines",
      "ids",
      "lifecycle",
      "listen-host",
    ];
    for (const svc of ["gateway", "simulator"]) {
      for (const name of others) {
        expect(findEnvReads(read(`services/${svc}/src/${name}.ts`))).toEqual([]);
      }
      expect(findEnvReads(read(`services/${svc}/src/log/logger.ts`))).toEqual([]);
    }
  });

  it("the console reads one non-secret local port, through loadEnv, in vite.config.ts only", () => {
    const cfg = read("apps/admin/vite.config.ts");
    expect(cfg.match(/loadEnv\(/g)).toHaveLength(1);
    expect(cfg).toContain('"CONSOLE_PORT"');
    expect(findEnvReads(cfg)).toEqual([]);
    for (const rel of [
      "apps/admin/src/main.tsx",
      "apps/admin/src/app.tsx",
      "apps/admin/index.html",
    ]) {
      const text = read(rel);
      expect(text).not.toContain("loadEnv");
      expect(findEnvReads(text)).toEqual([]);
    }
  });

  it("the app reads no environment variable at all", () => {
    for (const rel of ["apps/app/app/_layout.tsx", "apps/app/app/index.tsx"]) {
      expect(findEnvReads(read(rel))).toEqual([]);
    }
  });
});
