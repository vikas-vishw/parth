// platform: the service-source boundaries. The pure detectors are the ported module; the
// repository expectations are Parth's, because the sibling product's were about its own tree.
// Detector origin: .reference/xelulu/tooling/checks/service-sources.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  findFileWrites,
  findModuleSpecifiers,
  findStdioUse,
  formatSourceFindings,
  type SourceFinding,
} from "../checks/service-sources.js";

const ROOT = process.cwd();
const read = (rel: string): string => readFileSync(path.join(ROOT, rel), "utf8");

function sourcesOf(svc: string): string[] {
  const base = path.join(ROOT, "services", svc, "src");
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".ts")) out.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  };
  walk(base);
  return out.sort();
}

const SERVICES = ["gateway", "simulator"] as const;

/**
 * The workspace scope, read from the shared package's own manifest rather than written out.
 * A literal copy would be a Tier A string in a platform file, which is the rule this file sits
 * beside: the scope prefix IS one of the banned strings.
 */
const SCOPE = `${(JSON.parse(read("packages/shared/package.json")) as { name: string }).name.split("/")[0]}/`;

/** The only two modules in a service that may write to stdout or stderr. */
const STDIO_WRITERS = ["log/logger.ts", "config-error-writer.ts"];

function expectNone(findings: readonly SourceFinding[], what: string): void {
  expect(findings, `${what}:\n${formatSourceFindings(findings)}`).toEqual([]);
}

describe("service sources", () => {
  it("finds a module specifier in every import form", () => {
    const src = [
      'import a from "./a.js";',
      'export { b } from "./b.js";',
      'const c = await import("./c.js");',
      'const d = require("./d.js");',
    ].join("\n");
    expect(findModuleSpecifiers(src).map((s) => s.specifier)).toEqual([
      "./a.js",
      "./b.js",
      "./c.js",
      "./d.js",
    ]);
  });

  it("has sources to check in both services", () => {
    for (const svc of SERVICES) expect(sourcesOf(svc).length).toBeGreaterThan(8);
  });

  it("imports only node: built-ins, relative paths and the workspace scope", () => {
    for (const svc of SERVICES) {
      for (const rel of sourcesOf(svc)) {
        for (const { specifier } of findModuleSpecifiers(read(rel))) {
          const ok =
            specifier.startsWith("node:") ||
            specifier.startsWith(".") ||
            specifier.startsWith(SCOPE);
          expect(ok, `${rel} imports ${specifier}`).toBe(true);
        }
      }
    }
  });

  it("opens no network module at P0", () => {
    for (const svc of SERVICES) {
      for (const rel of sourcesOf(svc)) {
        for (const { specifier } of findModuleSpecifiers(read(rel))) {
          expect(
            ["node:net", "node:http", "node:https", "node:dgram", "node:tls", "ws", "mqtt"],
            `${rel} imports ${specifier}`,
          ).not.toContain(specifier);
        }
      }
    }
  });

  it("writes to a file from nowhere", () => {
    // The ported detector rather than a substring scan: it finds an aliased fs import too.
    const findings = SERVICES.flatMap((svc) =>
      sourcesOf(svc).flatMap((rel) => findFileWrites(rel, read(rel))),
    );
    expectNone(findings, "File-writing calls in service sources");
  });

  it("writes to stdout or stderr only from the logger and the config error writer", () => {
    const findings = SERVICES.flatMap((svc) =>
      sourcesOf(svc)
        .filter((rel) => !STDIO_WRITERS.some((w) => rel.endsWith(w)))
        .flatMap((rel) => findStdioUse(rel, read(rel))),
    );
    expectNone(findings, "Stdio use outside the allowed files");

    // The allowance is used: every logger writes to stdout and every config error writer to
    // stderr. Without this half, deleting both files would make the assertion above pass.
    for (const svc of SERVICES) {
      const rules = (rel: string): string[] => findStdioUse(rel, read(rel)).map((f) => f.rule);
      expect(rules(`services/${svc}/src/log/logger.ts`)).toContain("stdout_write");
      expect(rules(`services/${svc}/src/config-error-writer.ts`)).toContain("stderr_write");
    }
  });

  // The two ported fixtures, which nothing else exercises at P0. They name no wire value and no
  // product string, so they run now rather than waiting for the services to grow.
  describe("fixture self-tests", () => {
    const fixturePath = "services/gateway/src/fixture.ts";
    const banned = read("tooling/fixtures/service-sources-banned.txt");
    const clean = read("tooling/fixtures/service-sources-clean.txt");
    const lineRules = (findings: readonly SourceFinding[]): [number, string][] =>
      findings.map((f) => [f.lineNo, f.rule]);

    it("reports every banned pattern", () => {
      expect(lineRules(findFileWrites(fixturePath, banned))).toEqual([
        [3, "file_write"],
        [4, "file_write"],
        [5, "file_write"],
      ]);
      expect(lineRules(findStdioUse(fixturePath, banned))).toEqual([
        [6, "console"],
        [7, "stdout_write"],
        [8, "stderr_write"],
      ]);
    });

    it("reports nothing for the clean fixture", () => {
      expectNone(findFileWrites(fixturePath, clean), "file writes");
      expectNone(findStdioUse(fixturePath, clean), "stdio");
    });
  });
});
