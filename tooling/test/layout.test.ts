// platform: the repository layout, and the deliberate absence of the contract. Ported from .reference/xelulu/tooling/test/layout.test.ts
// Repo layout checks (design: tooling/test/layout.test.ts).
// Real-repo checks for Req 1.7, 1.10, 3.1, 3.2, 4.4, 6.1, 7.1, 8.4–8.6, 9.5, 9.8.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The five Workspace_Packages (Req 1.10). */
const PACKAGE_DIRS = [
  "apps/app",
  "apps/admin",
  "services/gateway",
  "services/simulator",
  "packages/shared",
] as const;

const ROOT_FILES = [
  ".env.example",
  "docker-compose.yml",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  ".nvmrc",
  ".npmrc",
  "README.md",
] as const;

const ROOT_FOLDERS = [...PACKAGE_DIRS, "supabase"] as const;

/** Folders that hold generated or installed content, never authored configs. */
const SKIPPED_DIRS = new Set(["node_modules", "dist", ".expo"]);

/** ESLint config file names: flat config (any extension) and legacy `.eslintrc*`. */
const ESLINT_CONFIG = /^(eslint\.config\.[cm]?[jt]s|\.eslintrc(\.(js|cjs|mjs|json|ya?ml))?)$/;

/** Prettier config file names: `.prettierrc*` and `prettier.config.*`. */
const PRETTIER_CONFIG =
  /^(\.prettierrc(\.(json5?|ya?ml|toml|[cm]?[jt]s))?|prettier\.config\.[cm]?[jt]s)$/;

function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function isDir(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** Sorted entry names of a folder (files and subfolders). */
function entries(relDir: string): string[] {
  return readdirSync(join(ROOT, relDir)).sort();
}

/** Every file under `dir`, skipping generated and installed folders. */
function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/** Asserts that `relDir` holds exactly one entry: an empty `.gitkeep` file. */
function expectOnlyEmptyGitkeep(relDir: string): void {
  expect(isDir(join(ROOT, relDir)), `${relDir} is a folder`).toBe(true);
  expect(entries(relDir), `${relDir} entries`).toEqual([".gitkeep"]);
  const marker = join(ROOT, relDir, ".gitkeep");
  expect(isFile(marker), `${relDir}/.gitkeep is a file`).toBe(true);
  expect(statSync(marker).size, `${relDir}/.gitkeep size`).toBe(0);
}

/** The topic root Document B-P will freeze. No file may write it at P0. */
const TOPIC_ROOT = "parth/";
/**
 * The one shipped file that may carry the string, and it is not a topic: `parth/` is the ESLint
 * RULE PREFIX, and the rename rule requires it to equal the package scope. `eslint.config.mjs`
 * is one of the two infrastructure files whose content is that namespace; the other,
 * `tooling/eslint/parth-plugin.mjs`, carries it for the same reason and already sits outside the
 * scanned scope. No file may carry the topic root itself at P0, because the root is B-P's to set.
 */
const TOPIC_ROOT_ALLOWED = new Set<string>(["eslint.config.mjs"]);

/** This product's device-id prefix (product.md). */
const DEVICE_PREFIX = "prt_";
/** The sibling product's, which the rename rule replaces and which must survive nowhere. */
const SIBLING_PREFIX = "xlu" + "_";
/**
 * Exactly the shipped files that may carry the device-id prefix: the dev default and the local
 * copy of it. Nothing under services/, apps/, packages/ or supabase/ is on it - no product code
 * names a device id at P0.
 */
const DEVICE_PREFIX_ALLOWED: readonly string[] = [".env.local.example", "docker-compose.yml"];

/**
 * What these three literal assertions do NOT scan, and why. It is the same trade the layer
 * check's two tiers make under `tooling/`: a detector has to contain the string it detects, and
 * a test has to name the value it asserts about, so a rule that scanned them would fire on the
 * code that enforces it and would be deleted within a week. `docs/` and `.kiro/` are prose that
 * quote the rules verbatim. What is left is exactly the code that ships, which is what the rules
 * are about. Length-asserted below, so the list cannot quietly grow to cover a real leak.
 */
const UNSCANNED_PREFIXES: readonly string[] = ["tooling/", "docs/", ".kiro/"];

/** Tracked text files that ship: everything outside the three unscanned prefixes. */
function shippedTextFiles(): readonly { path: string; text: string }[] {
  return trackedTextFiles().filter(
    ({ path }) => !UNSCANNED_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
}

/** File extensions whose text these assertions read. */
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".js",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".sql",
  ".toml",
  ".example",
  ".txt",
]);

const SPECIFIER_RE =
  /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|^\s*import\s*)["']([^"']+)["']/gm;

/** Every module specifier in `text`. */
function specifiers(text: string): string[] {
  return [...text.matchAll(SPECIFIER_RE)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
}

/**
 * The topic root written as a bare literal: `parth/` NOT preceded by `@`. The workspace package
 * scope is `@parth/`, a different string, and it appears in every manifest, the lockfile and the
 * ESLint namespace. This is the specifier rule from structure.md in its simplest form - the
 * quoted string in an import is governed by the import rule and nothing else - and it needs no
 * parser to say so.
 */
const TOPIC_ROOT_RE = /(?<!@)\bparth\//;

/** Tracked plus untracked-but-not-ignored files, as repo-relative `/` paths. Fails without git. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith(".reference/"));
}

/** Every tracked text file, as a repo-relative POSIX path and its contents. */
function trackedTextFiles(): readonly { path: string; text: string }[] {
  return trackedFiles()
    .filter((rel) => TEXT_EXTENSIONS.has(extname(rel)) || rel.startsWith(".env"))
    .flatMap((rel) => {
      const abs = join(ROOT, rel);
      return isFile(abs) ? [{ path: rel, text: readFileSync(abs, "utf8") }] : [];
    });
}

describe("repo layout", () => {
  describe("root files and folders (Req 1.7, 1.10)", () => {
    it.each(ROOT_FILES)("root file %s exists", (name) => {
      expect(isFile(join(ROOT, name)), `${name} at the Workspace root`).toBe(true);
    });

    it.each(ROOT_FOLDERS)("folder %s exists", (dir) => {
      expect(isDir(join(ROOT, dir)), `${dir} folder`).toBe(true);
    });

    it.each(PACKAGE_DIRS)("%s has package.json and tsconfig.json", (dir) => {
      expect(isFile(join(ROOT, dir, "package.json")), `${dir}/package.json`).toBe(true);
      expect(isFile(join(ROOT, dir, "tsconfig.json")), `${dir}/tsconfig.json`).toBe(true);
    });

    it(".npmrc sets node-linker=hoisted", () => {
      const lines = readFileSync(join(ROOT, ".npmrc"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim());
      expect(lines).toContain("node-linker=hoisted");
    });
  });

  describe("lint and format configs live only at the root (Req 3.1, 3.2)", () => {
    it("the root has exactly one ESLint config and one Prettier config and ignore file", () => {
      const names = entries(".");
      expect(names.filter((name) => ESLINT_CONFIG.test(name))).toEqual(["eslint.config.mjs"]);
      expect(names.filter((name) => PRETTIER_CONFIG.test(name))).toEqual([".prettierrc.json"]);
      expect(names).toContain(".prettierignore");
    });

    it.each(PACKAGE_DIRS)("%s contains no ESLint or Prettier config", (dir) => {
      const offenders = walkFiles(join(ROOT, dir))
        .filter((file) => {
          const name = file.split(/[\\/]/).pop() ?? "";
          return (
            ESLINT_CONFIG.test(name) || PRETTIER_CONFIG.test(name) || name === ".prettierignore"
          );
        })
        .map((file) => toPosix(relative(ROOT, file)));
      expect(offenders).toEqual([]);
    });
  });

  describe("app routes (Req 10.1)", () => {
    it("apps/app/app holds exactly the two P0 route files", () => {
      // The nine areas arrive at P11 with the design system; six of them ship for the pilot.
      expect(readdirSync(join(ROOT, "apps/app/app")).sort()).toEqual(["_layout.tsx", "index.tsx"]);
    });
  });

  describe("service folders (Req 6.1, 7.1)", () => {
    it.each(["services/gateway", "services/simulator"])("%s has src/ and test/", (dir) => {
      expect(isDir(join(ROOT, dir, "src")), `${dir}/src`).toBe(true);
      expect(isDir(join(ROOT, dir, "test")), `${dir}/test`).toBe(true);
    });
  });

  describe("the contract is deliberately absent at P0 (Req 9.4-9.6)", () => {
    // The inverse of the sibling product's assertion, and the point of P0-C1: the directory
    // arriving empty is indistinguishable, to a later reader, from the directory arriving
    // wrong. P1 restores the positive form when Document B-P lands.
    for (const rel of [
      "packages/shared/src/gateway-contract",
      "packages/shared/src/hmi-contract",
      "packages/shared/src/domain",
      "packages/shared/src/gateway-log",
      "packages/shared/src/mock-audio",
    ]) {
      it(`${rel} does not exist`, () => {
        expect(existsSync(join(ROOT, rel))).toBe(false);
      });
    }

    it("packages/shared/src holds exactly index.ts", () => {
      expect(readdirSync(join(ROOT, "packages/shared/src")).sort()).toEqual(["index.ts"]);
    });

    it("no tracked file imports a contract path", () => {
      // The directories do not exist, so an import of one would not compile - but it would
      // compile the moment P1 creates them, and then nobody would notice the import was
      // written before the contract it names.
      const offenders = trackedTextFiles()
        .filter(({ text }) =>
          specifiers(text).some(
            (spec) => spec.includes("gateway-contract") || spec.includes("hmi-contract"),
          ),
        )
        .map(({ path }) => path);
      expect(offenders, `files importing the contract: ${offenders.join(", ")}`).toEqual([]);
    });

    it("no tracked file writes the topic root as a literal", () => {
      // The topic root is Document B-P's to set, and `topics.ts` is the only file that may ever
      // hold it. A MODULE SPECIFIER is never scanned: `@parth/shared` is the workspace's own
      // scope and appears in every cross-package import, which is the specifier rule from
      // structure.md, not an exemption from it.
      const offenders = shippedTextFiles()
        .filter(({ path }) => !TOPIC_ROOT_ALLOWED.has(path))
        .filter(({ text }) => TOPIC_ROOT_RE.test(text))
        .map(({ path }) => path);
      expect(offenders, `files writing ${TOPIC_ROOT}: ${offenders.join(", ")}`).toEqual([]);
    });

    it("writes the device-id prefix in exactly the files allowed to carry it", () => {
      const carriers = shippedTextFiles()
        .filter(({ text }) => text.includes(DEVICE_PREFIX))
        .map(({ path }) => path)
        .sort();
      expect(carriers).toEqual([...DEVICE_PREFIX_ALLOWED].sort());
      // Both lists are length-asserted, so neither can grow unnoticed.
      expect(DEVICE_PREFIX_ALLOWED.length).toBe(2);
      expect(UNSCANNED_PREFIXES.length).toBe(3);
      expect(TOPIC_ROOT_ALLOWED.size).toBe(1);
    });

    it("carries the sibling product's device prefix nowhere that ships", () => {
      const offenders = shippedTextFiles()
        .filter(({ text }) => text.includes(SIBLING_PREFIX))
        .map(({ path }) => path);
      expect(offenders, `files carrying the sibling prefix: ${offenders.join(", ")}`).toEqual([]);
    });
  });

  describe("supabase scaffold (Req 9.5, 9.8)", () => {
    it("supabase/migrations holds only .gitkeep", () => {
      expectOnlyEmptyGitkeep("supabase/migrations");
    });

    it("supabase/functions holds no source files, only .gitkeep", () => {
      expectOnlyEmptyGitkeep("supabase/functions");
    });
  });
});
