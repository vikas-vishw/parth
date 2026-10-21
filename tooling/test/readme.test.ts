// platform: the root README says the nine things Req 17 requires, and names no secret. Ported from .reference/xelulu/tooling/test/readme.test.ts
//
// NARROWED AT P0 from the ported original, which also pins an Expected_Results table row per
// command - Expo Go showing a screen, the console showing live data, a deep-link prefix. At P0
// there is no screen, no live console data and no stack route, so those rows would assert a
// promise instead of a fact. P11 restores them with the app's six pilot areas.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parsePanel } from "../checks/panel.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

interface Manifest {
  packageManager?: string;
  scripts?: Record<string, string>;
}

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf8").replace(/\r\n/g, "\n");
}

const readme = read("README.md");
const readmeLower = readme.toLowerCase();
const rootManifest = JSON.parse(read("package.json")) as Manifest;
const nvmrc = read(".nvmrc").trim();

/** The five EMQX ports the README must list (Req 17.6). */
const EMQX_PORTS = ["1883", "8883", "8083", "8084", "18083"] as const;

/** pnpm subcommands that are built in, not Root_Manifest scripts. */
const BUILTIN_PNPM_COMMANDS = new Set(["install", "exec", "dlx"]);

/** Text inside inline code spans and fenced code blocks: where commands live. */
function codeText(markdown: string): string[] {
  const parts: string[] = [];
  const withoutFences = markdown.replace(/```[^\n]*\n([\s\S]*?)```/g, (_match, body: string) => {
    parts.push(body);
    return "";
  });
  for (const match of withoutFences.matchAll(/`([^`\n]+)`/g)) {
    if (match[1] !== undefined) parts.push(match[1]);
  }
  return parts;
}

/** Script names from every `pnpm <name>` command in code, skipping leading flags. */
function pnpmCommandNames(markdown: string): string[] {
  const names: string[] = [];
  for (const code of codeText(markdown)) {
    for (const match of code.matchAll(
      /(?:^|[\s;&|(])pnpm((?:\s+--?[a-z][a-z-]*)*)\s+([^\s`]+)/gm,
    )) {
      if (match[2] !== undefined) names.push(match[2]);
    }
  }
  return names;
}

describe("root README (Req 17)", () => {
  describe("what this is, and the layers (Req 17.1)", () => {
    it("names all three layer labels and where the steering pack lives", () => {
      for (const label of ["`contract`", "`platform`", "`product`"]) {
        expect(readme, `README is missing the ${label} layer label`).toContain(label);
      }
      expect(readme).toContain(".kiro/steering/");
    });
  });

  describe("prerequisites (Req 17.2)", () => {
    it("gives the exact Node version from .nvmrc", () => {
      expect(nvmrc).toMatch(/^\d+\.\d+\.\d+$/);
      expect(readme, `README is missing Node ${nvmrc}`).toContain(nvmrc);
      expect(readme).toContain(".nvmrc");
    });

    it("gives the exact pnpm version from packageManager, and no other", () => {
      const pm = rootManifest.packageManager ?? "";
      const match = /^pnpm@(\d+\.\d+\.\d+)$/.exec(pm);
      expect(match, `root packageManager is "${pm}"`).not.toBeNull();
      const version = match?.[1] ?? "";
      expect(readme).toContain(version);
      // Every pnpm version the README mentions must be the pinned one.
      const mentioned = [...readme.matchAll(/pnpm[@ ](\d+\.\d+\.\d+)/g)].map((m) => m[1]);
      expect(mentioned.length).toBeGreaterThan(0);
      for (const v of mentioned) expect(v).toBe(version);
      expect(readme).toContain("corepack enable");
    });

    it("names the Docker Compose floor as a version", () => {
      expect(readmeLower).toContain("docker compose");
      expect(readme).toMatch(/Docker Compose[\s\S]{0,80}\d+\.\d+\.\d+/);
    });
  });

  describe("commands (Req 17.3)", () => {
    it("gives install, build, lint, format check and test", () => {
      const names = new Set(pnpmCommandNames(readme));
      for (const name of ["install", "build", "lint", "format:check", "test"]) {
        expect(names, `README is missing \`pnpm ${name}\``).toContain(name);
      }
    });

    it("gives `docker compose up`", () => {
      expect(readme).toContain("`docker compose up`");
    });

    it("names only pnpm scripts that exist in the root manifest", () => {
      const scripts = rootManifest.scripts ?? {};
      const missing = pnpmCommandNames(readme).filter(
        (name) => !BUILTIN_PNPM_COMMANDS.has(name) && !Object.hasOwn(scripts, name),
      );
      expect(missing, `README names unknown scripts: ${missing.join(", ")}`).toEqual([]);
    });
  });

  describe("the connection panel (Req 17.4)", () => {
    it("gives both the PowerShell and the POSIX copy command, from the local example", () => {
      expect(readme).toContain("Copy-Item .env.local.example .env");
      expect(readme).toContain("cp .env.local.example .env");
    });

    it("says .env.example is the panel and is never filled in place", () => {
      expect(readme).toContain(".env.example");
      expect(readmeLower).toContain("never filled in place");
    });
  });

  describe("EMQX (Req 17.5, 17.6)", () => {
    it("keeps the licence warning: 5.8.9 is Apache-2.0, 5.9 and later are BSL", () => {
      expect(readme).toContain("5.8.9");
      expect(readme).toContain("Apache-2.0");
      expect(readme).toMatch(/BSL 1\.1/);
      expect(readmeLower).toMatch(/pin does not move|does not move/);
    });

    it("says the dashboard credentials are image defaults, for local development only", () => {
      expect(readmeLower).toContain("image defaults");
      expect(readmeLower).toContain("local development only");
    });

    it("lists the five ports and the loopback address they are bound to", () => {
      for (const port of EMQX_PORTS) {
        expect(readme, `README is missing EMQX port ${port}`).toMatch(new RegExp(`\\b${port}\\b`));
      }
      expect(readme).toContain("127.0.0.1");
    });
  });

  describe("the contract does not exist yet (Req 17.7)", () => {
    it("says the directory is deliberately absent and that B-P arrives next", () => {
      const line = readme
        .split("\n")
        .find((l) => l.includes("packages/shared/src/gateway-contract/"));
      expect(line, "README line about gateway-contract").toBeDefined();
      expect(readme).toContain("Document B-P");
      expect(readmeLower).toContain("deliberately absent");
    });

    it("names no B-P message, field, enum or topic", () => {
      // The contract is the first fence. A README that guessed a field name would be a document
      // the firmware side could read as a promise.
      expect(readme).not.toMatch(/proto_ver/);
      expect(readme).not.toMatch(/\bparth\//);
      expect(readme).not.toMatch(/\bprt_/);
    });
  });

  describe("the reference is read-only (Req 17.8)", () => {
    it("says it is never edited and never imported from", () => {
      expect(readme).toContain(".reference/xelulu");
      expect(readmeLower).toContain("read-only");
      expect(readmeLower).toMatch(/never edited/);
      expect(readmeLower).toMatch(/never imported from/);
    });
  });

  describe("no secret and no panel value (Req 17.9)", () => {
    const panelKeys = parsePanel(read("tooling/fixtures/approved-panel.txt"))
      .flatMap((line) => (line.kind === "decl" ? [line.key] : []))
      .filter((key): key is string => typeof key === "string" && key !== "");

    it("reads a non-empty key list from the approved panel", () => {
      expect(panelKeys.length).toBeGreaterThan(0);
    });

    it("assigns no Panel_Key a value anywhere in the README", () => {
      const offenders = panelKeys.filter((key) =>
        new RegExp(`(?:^|[^A-Z_])${key}=\\s*\\S`, "m").test(readme),
      );
      expect(offenders, `README assigns: ${offenders.join(", ")}`).toEqual([]);
    });
  });
});
