// platform: the three-layer check's properties, its closed lists, and a real run over every
// tracked source file. The check is pure; this loader is the only part that touches the disk.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  checkLayer,
  headerLine,
  HATCH_CAP,
  HATCH_MARKER,
  isInRepo,
  isInfrastructure,
  isTierExempt,
  parseLayerHeader,
  portOrigin,
  spans,
  specifiers,
  type Layer,
  type LayerConfig,
} from "../checks/layer.js";

// Vitest sets its root to the repository root, so cwd is the one reliable anchor here:
// import.meta.url is not a file URL once the file has been transformed.
const ROOT = process.cwd();
const read = (rel: string): string => readFileSync(path.join(ROOT, rel), "utf8");

const CONFIG = JSON.parse(read("tooling/fixtures/banned-strings.json")) as LayerConfig;

/** Where a Port_Origin must point. The clone itself is git-ignored and often absent. */
const REFERENCE_ROOT = ".reference/xelulu/";
const REFERENCE_PRESENT = existsSync(path.join(ROOT, REFERENCE_ROOT));

/** Tracked files under any of `prefixes` whose base name matches `pattern`. */
function trackedUnder(prefixes: readonly string[], pattern: RegExp): string[] {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l !== "" && prefixes.some((p) => l.startsWith(p)) && pattern.test(l.split("/").pop() ?? ""),
    );
}

/** Every tracked or about-to-be-tracked source file, excluding the read-only reference clone. */
function sourceFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && /\.(ts|tsx|mjs)$/.test(l) && !l.startsWith(".reference/"));
}

/** path -> layer, for the import rule. Infrastructure is absent from the map by design. */
function labelMap(files: readonly string[]): Map<string, Layer> {
  const map = new Map<string, Layer>();
  for (const rel of files) {
    if (isInfrastructure(rel, CONFIG)) continue;
    const layer = parseLayerHeader(headerLine(read(rel), CONFIG).line);
    if (layer !== null) map.set(rel, layer);
  }
  return map;
}

/** Resolve an in-repository specifier to a tracked file, then to its layer. */
function resolver(map: ReadonlyMap<string, Layer>) {
  const candidates = (base: string): string[] => [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    base,
  ];
  return (spec: string, fromPath: string): Layer | null => {
    let base: string;
    if (spec.startsWith(".")) {
      base = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), spec));
    } else {
      // The workspace scope: @<scope>/<pkg> is that package's entry point.
      const pkg = spec.slice(CONFIG.scopePrefix.length).split("/")[0] ?? "";
      base = `packages/${pkg}/src/index`;
    }
    base = base.replace(/\.js$/, "");
    for (const c of candidates(base)) {
      const hit = map.get(c);
      if (hit !== undefined) return hit;
    }
    return null;
  };
}

describe("the banned-string fixture and the two closed lists", () => {
  it("holds two disjoint tiers of lowercase, non-empty strings", () => {
    expect(CONFIG.tierA.length).toBeGreaterThan(0);
    expect(CONFIG.tierB.length).toBeGreaterThan(0);
    for (const s of [...CONFIG.tierA, ...CONFIG.tierB]) {
      expect(s).toBe(s.toLowerCase());
      expect(s.length).toBeGreaterThan(0);
    }
    const overlap = CONFIG.tierA.filter((s) => CONFIG.tierB.includes(s));
    expect(overlap).toEqual([]);
  });

  it("excludes the ordinary English words A-P section 8 took out", () => {
    const both = [...CONFIG.tierA, ...CONFIG.tierB];
    for (const word of ["focus", "confirm", "matter", "brief", "meeting", "google", "microsoft"]) {
      expect(both).not.toContain(word);
    }
  });

  it("names exactly two infrastructure paths, and the local boundary rule is not one", () => {
    expect(CONFIG.infrastructurePaths).toHaveLength(2);
    expect([...CONFIG.infrastructurePaths].sort()).toEqual([
      "eslint.config.mjs",
      "tooling/eslint/parth-plugin.mjs",
    ]);
    expect(CONFIG.infrastructurePaths).not.toContain("tooling/eslint/no-cross-package-import.mjs");
  });

  it("exempts exactly one prefix from the tiers, and never the product code", () => {
    expect(CONFIG.tierExemptPrefixes).toHaveLength(1);
    expect(CONFIG.tierExemptPrefixes).toEqual(["tooling/"]);
    // The exemption must never reach the code the tiers exist to police.
    for (const prefix of CONFIG.tierExemptPrefixes) {
      for (const policed of ["services/", "apps/", "packages/"]) {
        expect(policed.startsWith(prefix)).toBe(false);
        expect(prefix.startsWith(policed)).toBe(false);
      }
    }
  });

  it("accepts exactly one first-line pragma", () => {
    expect(CONFIG.acceptedFirstLinePragmas).toHaveLength(1);
    expect(CONFIG.acceptedFirstLinePragmas[0]).toBe("// @vitest-environment ");
  });
});

describe("Property 11: the span split is a total partition", () => {
  const frag = fc.oneof(
    fc.constant("const a = 1;\n"),
    fc.constant("// a line comment\n"),
    fc.constant("/* a block\n   comment */\n"),
    fc.constant('const s = "text";\n'),
    fc.constant("const t = 'text';\n"),
    fc.constant("const u = `tpl ${x} tail`;\n"),
    fc.constant('const unterminated = "oops'),
    fc.constant("/* unterminated block"),
    fc.constant("// unterminated line comment"),
  );

  it("returns disjoint spans whose union covers every offset exactly once", () => {
    fc.assert(
      fc.property(fc.array(frag, { minLength: 1, maxLength: 12 }), (parts) => {
        const text = parts.join("");
        const { code, comment, literal } = spans(text);
        const all = [...code, ...comment, ...literal].sort((a, b) => a.start - b.start);
        let cursor = 0;
        for (const s of all) {
          expect(s.start).toBe(cursor);
          expect(s.end).toBeGreaterThan(s.start);
          cursor = s.end;
        }
        expect(cursor).toBe(text.length);
      }),
      { numRuns: 300 },
    );
  });
});

describe("Property 12: the header parser is total and never guesses", () => {
  it("returns a layer only for a well-formed label, and never throws", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), (s) => {
        expect(() => parseLayerHeader(s)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  it("accepts the three labels and rejects a label word used in prose", () => {
    for (const layer of ["contract", "platform", "product"] as const) {
      expect(parseLayerHeader(`// ${layer}: something it does.`)).toBe(layer);
    }
    expect(parseLayerHeader("// see the product notes")).toBeNull();
    expect(parseLayerHeader("// platform")).toBeNull();
    expect(parseLayerHeader("// platform:")).toBeNull();
    expect(parseLayerHeader("// platform: ")).toBeNull();
    expect(parseLayerHeader("const platform = 1;")).toBeNull();
    expect(parseLayerHeader("")).toBeNull();
  });

  it("takes line 2 when line 1 is the accepted pragma, and line 1 otherwise", () => {
    const withPragma = "// @vitest-environment jsdom\n// product: a test.\n";
    expect(headerLine(withPragma, CONFIG).index).toBe(1);
    expect(parseLayerHeader(headerLine(withPragma, CONFIG).line)).toBe("product");
    const withoutPragma = "// platform: a module.\n";
    expect(headerLine(withoutPragma, CONFIG).index).toBe(0);
    const otherPragma = "// @ts-nocheck\n// platform: a module.\n";
    expect(headerLine(otherPragma, CONFIG).index).toBe(0);
  });
});

describe("Property 13: Tier A matches everywhere, Tier B never matches a comment", () => {
  const placements = (term: string): Readonly<Record<string, string>> => ({
    line_comment: `// prose mentioning ${term} here\nconst a = 1;\n`,
    block_comment: `/* prose mentioning ${term} here */\nconst a = 1;\n`,
    string_literal: `const a = "${term}";\n`,
    whole_identifier: `const ${term} = 1;\n`,
    substring_identifier: `const wrapper${term}Suffix = 1;\n`,
  });

  const body = (layer: Layer, rest: string): string => `// ${layer}: a file for the test.\n${rest}`;

  it("fires Tier A in all five placements, for any case variant", () => {
    for (const term of CONFIG.tierA) {
      for (const variant of [term, term.toUpperCase(), term[0]!.toUpperCase() + term.slice(1)]) {
        for (const [, snippet] of Object.entries(placements(variant))) {
          const r = checkLayer("services/gateway/src/x.ts", body("platform", snippet), CONFIG);
          expect(r.findings.map((f) => f.rule)).toContain("banned_tier_a");
        }
      }
    }
  });

  it("fires Tier B only in a literal or a whole identifier, never in a comment", () => {
    for (const term of CONFIG.tierB) {
      const p = placements(term);
      for (const key of ["string_literal", "whole_identifier"]) {
        const r = checkLayer("services/gateway/src/x.ts", body("platform", p[key]!), CONFIG);
        expect(r.findings.map((f) => f.rule)).toContain("banned_tier_b");
      }
      for (const key of ["line_comment", "block_comment", "substring_identifier"]) {
        const r = checkLayer("services/gateway/src/x.ts", body("platform", p[key]!), CONFIG);
        expect(r.findings.map((f) => f.rule)).not.toContain("banned_tier_b");
      }
    }
  });

  it("checks neither tier on a contract or a product file", () => {
    for (const layer of ["contract", "product"] as const) {
      for (const term of [...CONFIG.tierA, ...CONFIG.tierB]) {
        const r = checkLayer(
          "packages/shared/src/x.ts",
          body(layer, `const a = "${term}";\n`),
          CONFIG,
        );
        const rules = r.findings.map((f) => f.rule);
        expect(rules).not.toContain("banned_tier_a");
        expect(rules).not.toContain("banned_tier_b");
      }
    }
  });

  it("never fires a tier on a term that only appears inside a module specifier", () => {
    const src = `// platform: a module.\nimport { a } from "${CONFIG.scopePrefix}shared";\n`;
    const r = checkLayer("services/gateway/src/x.ts", src, CONFIG);
    expect(r.findings.map((f) => f.rule)).not.toContain("banned_tier_a");
  });

  it("finds a specifier in all four import forms", () => {
    const src = [
      "// platform: a module.",
      'import a from "./a.js";',
      'export { b } from "./b.js";',
      'const c = await import("./c.js");',
      'const d = require("./d.js");',
    ].join("\n");
    expect(specifiers(src).map((s) => s.value)).toEqual(["./a.js", "./b.js", "./c.js", "./d.js"]);
  });
});

describe("Property 14: the import rule, and the hatch is counted exactly", () => {
  const targets: Readonly<Record<string, Layer>> = {
    "services/gateway/src/p.ts": "product",
    "services/gateway/src/f.ts": "platform",
    "packages/shared/src/c.ts": "contract",
  };
  const resolve = (spec: string): Layer | null => {
    if (spec.endsWith("p.js")) return targets["services/gateway/src/p.ts"]!;
    if (spec.endsWith("f.js")) return targets["services/gateway/src/f.ts"]!;
    if (spec.endsWith("c.js")) return targets["packages/shared/src/c.ts"]!;
    return null;
  };

  it("applies the A-P section 8 import table and ignores every external specifier", () => {
    const external = ["zod", "mqtt", "ws", "node:crypto", "react", "vitest"];
    const cases: ReadonlyArray<[Layer, string, boolean]> = [
      ["platform", "./p.js", true],
      ["platform", "./f.js", false],
      ["platform", "./c.js", false],
      ["contract", "./p.js", true],
      ["contract", "./f.js", true],
      ["contract", "./c.js", false],
      ["product", "./p.js", false],
      ["product", "./f.js", false],
      ["product", "./c.js", false],
    ];
    for (const [layer, spec, expectFinding] of cases) {
      const src = `// ${layer}: a file.\nimport { x } from "${spec}";\n`;
      const r = checkLayer("services/gateway/src/x.ts", src, CONFIG, resolve);
      const importFindings = r.findings.filter((f) => f.rule.startsWith("import_"));
      expect(importFindings.length > 0).toBe(expectFinding);
    }
    for (const layer of ["contract", "platform", "product"] as const) {
      for (const spec of external) {
        const src = `// ${layer}: a file.\nimport { x } from "${spec}";\n`;
        const r = checkLayer("services/gateway/src/x.ts", src, CONFIG, resolve);
        expect(r.findings.filter((f) => f.rule.startsWith("import_"))).toEqual([]);
        expect(isInRepo(spec, CONFIG)).toBe(false);
      }
    }
  });

  it("suppresses exactly the hatched findings and counts them", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }), (hatched) => {
        const lines = ["// platform: a file."];
        for (const h of hatched) {
          if (h) lines.push(`${HATCH_MARKER} a stated reason`);
          lines.push('import { x } from "./p.js";');
        }
        const r = checkLayer("services/gateway/src/x.ts", lines.join("\n") + "\n", CONFIG, resolve);
        const k = hatched.filter(Boolean).length;
        expect(r.hatches).toHaveLength(k);
        expect(r.findings.filter((f) => f.rule.startsWith("import_"))).toHaveLength(
          hatched.length - k,
        );
      }),
      { numRuns: 200 },
    );
  });

  it("does not suppress anything when the hatch carries no reason", () => {
    const src = `// platform: a file.\n${HATCH_MARKER}\nimport { x } from "./p.js";\n`;
    const r = checkLayer("services/gateway/src/x.ts", src, CONFIG, resolve);
    expect(r.hatches).toHaveLength(0);
    expect(r.findings.filter((f) => f.rule.startsWith("import_"))).toHaveLength(1);
  });
});

describe("the real repository", () => {
  const files = sourceFiles();
  const map = labelMap(files);
  const resolve = resolver(map);

  it("has at least one source file to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("labels every source file, infrastructure excepted", () => {
    const unlabelled = files.filter((rel) => !isInfrastructure(rel, CONFIG) && !map.has(rel));
    expect(unlabelled).toEqual([]);
  });

  it("reports zero findings over every source file", () => {
    const all = files.flatMap((rel) => checkLayer(rel, read(rel), CONFIG, resolve).findings);
    expect(all).toEqual([]);
  });

  it("keeps the escape hatch under its cap", () => {
    const hatches = files.flatMap((rel) => checkLayer(rel, read(rel), CONFIG, resolve).hatches);
    expect(hatches.length).toBeLessThanOrEqual(HATCH_CAP);
  });

  /** Every declared Port_Origin, as [file, origin]. */
  function portOrigins(): [string, string][] {
    return files.flatMap((rel): [string, string][] => {
      const block = read(rel).split("\n").slice(0, 8).join("\n");
      const origin = portOrigin(block);
      return origin === null ? [] : [[rel, origin]];
    });
  }

  it("names a well-formed port origin inside the reference clone (Req 18.1)", () => {
    // Runs everywhere, including where the reference clone is absent: a malformed origin - a
    // Windows path separator, a path outside the clone, a bare file name - is a defect whatever
    // is on disk, and this is the half of Req 18.2 that does not need the clone to check.
    const origins = portOrigins();
    expect(origins.length).toBeGreaterThan(30);
    const malformed = origins
      .filter(
        ([, origin]) =>
          !origin.startsWith(REFERENCE_ROOT) ||
          origin.includes("\\") ||
          origin.endsWith("/") ||
          origin.length <= REFERENCE_ROOT.length,
      )
      .map(([rel, origin]) => `${rel} -> ${origin}`);
    expect(malformed).toEqual([]);
  });

  // Req 18.2 proper, and it needs the clone. `.reference/` is git-ignored, so it exists on the
  // machine doing the porting and NOWHERE ELSE - not in a fresh clone, not on a CI runner. Making
  // this unconditional makes every clean clone and every CI run red for a file that is correct.
  // It is platform-conditional for the same reason the two service stop-line assertions are, and
  // with the same payer: it runs where a wrong origin can actually be introduced, which is the
  // only place one ever is.
  it.runIf(REFERENCE_PRESENT)(
    "resolves every port origin to a real reference file (Req 18.2)",
    () => {
      const missing = portOrigins()
        .filter(([, origin]) => !existsSync(path.join(ROOT, origin)))
        .map(([rel, origin]) => `${rel} -> ${origin}`);
      expect(missing).toEqual([]);
    },
  );

  // A-P section 8, as-built rule 4, final clause. The tier exemption is only contained while
  // this holds. `tooling/` may say `parth` and name a vendor, because a detector has to contain
  // the string it detects; the moment an extractable file imports from there, every one of those
  // strings is reachable from the code the tiers exist to keep clean, and the exemption has
  // quietly become a hole. The tiers would not catch it - a specifier is never scanned - and the
  // import rule would not either, because `tooling/` is labelled `platform` and a platform file
  // may import from a platform file. So it is asserted here, separately, as its own rule.
  it("lets nothing extractable import from tooling/", () => {
    const EXTRACTABLE = ["apps/", "services/", "packages/"];
    const offenders: string[] = [];
    for (const rel of files.filter((f) => EXTRACTABLE.some((p) => f.startsWith(p)))) {
      const fromDir = path.posix.dirname(rel);
      for (const spec of specifiers(read(rel))) {
        // Resolved, not matched: `../../tooling/x.js` names tooling without saying so. A
        // non-relative specifier is checked as written, which is the only thing it can be.
        const target = spec.value.startsWith(".")
          ? path.posix.normalize(path.posix.join(fromDir, spec.value))
          : spec.value;
        if (target.startsWith("tooling/") || target.includes("/tooling/")) {
          offenders.push(`${rel}:${spec.lineNo} -> ${spec.value}`);
        }
      }
    }
    expect(offenders, `extractable code importing tooling/:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("scans every extractable package for that rule, so the assertion is not vacuous", () => {
    // Without this, deleting the three prefixes above would make the assertion pass trivially.
    // `packages/` holds exactly two source files at P0 - the shared package's `index.ts` and its
    // export test - so each prefix is asserted present rather than populous, and the total
    // carries the weight. It grows at P1 when the contract lands.
    const counted = ["apps/", "services/", "packages/"].map(
      (prefix) => [prefix, files.filter((f) => f.startsWith(prefix)).length] as const,
    );
    for (const [prefix, n] of counted) expect(n, prefix).toBeGreaterThan(0);
    expect(counted.reduce((sum, [, n]) => sum + n, 0)).toBeGreaterThan(20);
  });

  it("reaches tooling/ from nothing extractable at compile time either", () => {
    // The import rule above governs module specifiers. A tsconfig `include`, `files` or
    // `references` entry, or a manifest dependency, would pull the same files in without one.
    const manifests = trackedUnder(
      ["apps/", "services/", "packages/"],
      /(tsconfig.*\.json|package\.json)$/,
    );
    expect(manifests.length).toBeGreaterThan(8);
    const offenders = manifests
      .filter((rel) => /(^|[^\w-])tooling\//.test(read(rel)))
      .map((rel) => rel);
    expect(offenders, `manifests naming tooling/: ${offenders.join(", ")}`).toEqual([]);
  });

  it("exempts tooling from the tiers but not from labelling or the import rule", () => {
    const tooling = files.filter((f) => f.startsWith("tooling/"));
    expect(tooling.length).toBeGreaterThan(10);
    for (const rel of tooling) {
      expect(isTierExempt(rel, CONFIG)).toBe(true);
      if (!isInfrastructure(rel, CONFIG)) expect(map.has(rel)).toBe(true);
    }
    // And nothing outside tooling/ is exempt.
    for (const rel of files.filter((f) => !f.startsWith("tooling/"))) {
      expect(isTierExempt(rel, CONFIG)).toBe(false);
    }
  });

  it("carries no banned string in the check that scans for them", () => {
    const self = read("tooling/checks/layer.ts").toLowerCase();
    for (const term of [...CONFIG.tierA, ...CONFIG.tierB]) {
      expect(self.includes(term)).toBe(false);
    }
  });
});
