// platform: the three-layer check. Document A-P section 8. Pure: text and fixtures in, findings
// out, no filesystem access and no module resolution against disk. The loader in
// tooling/test/layer.test.ts reads the files, builds the label map, and enforces the caps.
//
// Five rules, in this order:
//   1. the header        -- line 1 names the layer, or line 2 after an accepted tool pragma
//   2. the port origin   -- a ported file names the path it came from
//   3. the import rule   -- the primary rule, and the only one that catches a real leak
//   4. Tier A            -- anywhere in the file, code and comments, case-insensitive
//   5. Tier B            -- identifiers and string literals only, whole word, never comments
// A module specifier is never scanned by rules 4 or 5: rule 3 governs it and governs it better.

export type Layer = "contract" | "platform" | "product";

export type LayerRule =
  | "missing_header"
  | "bad_label"
  | "port_origin_missing"
  | "import_platform_to_product"
  | "import_contract_to_non_contract"
  | "banned_tier_a"
  | "banned_tier_b";

export type LayerFinding = Readonly<{ path: string; lineNo: number; rule: LayerRule }>;
export type LayerHatch = Readonly<{ path: string; lineNo: number; rule: LayerRule }>;
export type LayerResult = Readonly<{
  findings: readonly LayerFinding[];
  hatches: readonly LayerHatch[];
}>;

/**
 * The check's whole configuration, read from tooling/fixtures/banned-strings.json by the loader.
 * Nothing here is hard-coded, for one reason: this module scans platform files for banned
 * strings, and the workspace scope prefix and the infrastructure paths ARE banned strings. A
 * literal copy of either would make this file fail its own Tier A rule (Req 4.9). The fixture is
 * committed, reviewable and length-asserted, so the lists are no less written out for living
 * there - and tooling/test/layer.test.ts asserts both their contents and their lengths.
 *
 *  - `infrastructurePaths`: exactly two. Repo infrastructure, excluded from labelling entirely:
 *    no label, no tier, no import rule. Both carry the ESLint namespace, which must equal the
 *    package scope. Exclusion withholds the check and grants nothing - neither may import from a
 *    product path. The local no-cross-package-import rule is deliberately NOT on the list: it
 *    names no package and takes the package table as rule options, so it is labelled platform.
 *  - `acceptedFirstLinePragmas`: exactly one. A tool pragma a tool requires on line 1, after
 *    which the layer label may take line 2.
 *  - `scopePrefix`: the workspace package scope, which marks a specifier as in-repository.
 *  - `tierExemptPrefixes`: exactly one, `tooling/`. The two tiers do not apply under it. Every
 *    file there is either a detector that must contain the strings it detects - the ported
 *    checks look for the topic root, the package scope and vendor SDK names - or a test that
 *    must name the packages it asserts about. They keep their layer label and they obey the
 *    import rule in full; only the two tiers skip them. A-P section 8's own words make this the
 *    right trade: the import rule is the real one and the strings are the backstop. The tiers
 *    exist to keep PRODUCT CODE under services/ and apps/ free of product identity, so the P5
 *    extraction is a mechanical move; tooling/ is not extracted and stays with the repository.
 *    Length-asserted at one, and the test proves no prefix reaches services/, apps/ or
 *    packages/, so the exemption cannot quietly swallow the code it exists to police.
 */
export type LayerConfig = Readonly<{
  tierA: readonly string[];
  tierB: readonly string[];
  scopePrefix: string;
  infrastructurePaths: readonly string[];
  acceptedFirstLinePragmas: readonly string[];
  tierExemptPrefixes: readonly string[];
}>;

/** The maximum number of escape hatches in the whole repository. */
export const HATCH_CAP = 5;

export const HATCH_MARKER = "// layer-check-allow:";

/** The import table of A-P section 8, over in-repository targets only. */
const MAY_IMPORT: Readonly<Record<Layer, readonly Layer[]>> = Object.freeze({
  contract: Object.freeze(["contract"] as const),
  platform: Object.freeze(["contract", "platform"] as const),
  product: Object.freeze(["contract", "platform", "product"] as const),
});

export type Span = Readonly<{ start: number; end: number }>;
export type Spans = Readonly<{ code: Span[]; comment: Span[]; literal: Span[] }>;

const toPosix = (p: string): string => p.replace(/\\/g, "/").replace(/^\.\//, "");

export function isInfrastructure(path: string, config: LayerConfig): boolean {
  return config.infrastructurePaths.includes(toPosix(path));
}

/** Under a tier-exempt prefix. Keeps its layer label and the import rule; skips the two tiers. */
export function isTierExempt(path: string, config: LayerConfig): boolean {
  const rel = toPosix(path);
  return config.tierExemptPrefixes.some((prefix) => rel.startsWith(prefix));
}

function isAcceptedPragma(line: string, config: LayerConfig): boolean {
  return config.acceptedFirstLinePragmas.some((prefix) => line.startsWith(prefix));
}

const HEADER_RE = /^\/\/\s(contract|platform|product):\s\S/;

/** The layer named on a single line, or null. Total, and it never guesses from a stray word. */
export function parseLayerHeader(line: string): Layer | null {
  const m = HEADER_RE.exec(line);
  return m === null ? null : (m[1] as Layer);
}

/**
 * Which line carries the header: 0, or 1 when line 0 is an accepted pragma. Returns the index
 * and the line, so a finding can report the right number.
 */
export function headerLine(text: string, config: LayerConfig): { index: number; line: string } {
  const lines = text.split("\n");
  const first = (lines[0] ?? "").trim();
  if (isAcceptedPragma(first, config) && lines.length > 1) {
    return { index: 1, line: lines[1] ?? "" };
  }
  return { index: 0, line: lines[0] ?? "" };
}

const PORT_ORIGIN_RE = /\.reference\/xelulu\/[^\s)]+/;

/** The origin path a ported file names, or null when the line does not claim to be a port. */
export function portOrigin(line: string): string | null {
  if (!line.includes("Ported from") && !line.includes("ADAPTED from")) return null;
  const m = PORT_ORIGIN_RE.exec(line);
  return m === null ? null : m[0];
}

/** True when the header claims a port but names no origin. */
function claimsPortWithoutOrigin(text: string, headerIdx: number): boolean {
  // A port may name its origin on the header line or on a continuation comment just below it.
  const lines = text.split("\n").slice(headerIdx, headerIdx + 6);
  const block = lines.filter((l) => l.trimStart().startsWith("//")).join("\n");
  const claims = block.includes("Ported from") || block.includes("ADAPTED from");
  return claims && PORT_ORIGIN_RE.exec(block) === null;
}

/**
 * Partition the text into comment, string-literal and code spans. Conservative and line-based: a
 * template literal with an embedded expression is one literal span, and a regex literal is code.
 * A conservative split can produce a false finding and can never miss one, which is the right
 * direction for this check. Every offset belongs to exactly one list.
 */
export function spans(text: string): Spans {
  const comment: Span[] = [];
  const literal: Span[] = [];
  const code: Span[] = [];
  const n = text.length;
  let i = 0;
  let codeStart = 0;

  const closeCode = (at: number): void => {
    if (at > codeStart) code.push({ start: codeStart, end: at });
  };

  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === "/" && next === "/") {
      closeCode(i);
      const nl = text.indexOf("\n", i);
      const end = nl < 0 ? n : nl;
      comment.push({ start: i, end });
      i = end;
      codeStart = i;
    } else if (c === "/" && next === "*") {
      closeCode(i);
      const close = text.indexOf("*/", i + 2);
      const end = close < 0 ? n : close + 2;
      comment.push({ start: i, end });
      i = end;
      codeStart = i;
    } else if (c === '"' || c === "'" || c === "`") {
      closeCode(i);
      let j = i + 1;
      while (j < n && text[j] !== c) {
        if (text[j] === "\\") j += 1;
        j += 1;
      }
      const end = Math.min(j + 1, n);
      literal.push({ start: i, end });
      i = end;
      codeStart = i;
    } else {
      i += 1;
    }
  }
  closeCode(n);
  return Object.freeze({ code, comment, literal });
}

const inSpans = (offset: number, list: readonly Span[]): boolean =>
  list.some((s) => offset >= s.start && offset < s.end);

/** Every module specifier in all four import forms, with the span of the quoted string. */
const SPECIFIER_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(["'])([^"']*)\1/g;

export type Specifier = Readonly<{ value: string; start: number; end: number; lineNo: number }>;

const lineNoAt = (text: string, offset: number): number => text.slice(0, offset).split("\n").length;

export function specifiers(text: string): readonly Specifier[] {
  const out: Specifier[] = [];
  for (const m of text.matchAll(SPECIFIER_RE)) {
    const value = m[2] ?? "";
    // The FIRST quote of the match, not the last: lastIndexOf would find the closing one
    // and shift the span past the specifier, which is how the draft scan missed it.
    const quoteOffset = (m.index ?? 0) + m[0].indexOf(m[1] ?? '"');
    out.push({
      value,
      start: quoteOffset,
      end: quoteOffset + value.length + 2,
      lineNo: lineNoAt(text, m.index ?? 0),
    });
  }
  return Object.freeze(out);
}

/** An in-repository specifier: relative, or the workspace scope. Everything else is external. */
export function isInRepo(value: string, config: LayerConfig): boolean {
  return value.startsWith(".") || value.startsWith(config.scopePrefix);
}

/** Resolves an in-repository target to a layer. The loader supplies the label map. */
export type LayerOfTarget = (specifier: string, fromPath: string) => Layer | null;

function hatchAbove(lines: readonly string[], lineNo: number): boolean {
  const above = lines[lineNo - 2];
  if (above === undefined) return false;
  const trimmed = above.trim();
  if (!trimmed.startsWith(HATCH_MARKER)) return false;
  return trimmed.slice(HATCH_MARKER.length).trim().length > 0;
}

/** Every breach of A-P section 8 in one file, plus the hatches that suppressed one. */
export function checkLayer(
  path: string,
  text: string,
  config: LayerConfig,
  layerOfTarget: LayerOfTarget = () => null,
): LayerResult {
  const rel = toPosix(path);
  if (isInfrastructure(rel, config)) return Object.freeze({ findings: [], hatches: [] });

  const lines = text.split("\n");
  const findings: LayerFinding[] = [];
  const hatches: LayerHatch[] = [];
  const add = (lineNo: number, rule: LayerRule): void => {
    if (hatchAbove(lines, lineNo)) hatches.push(Object.freeze({ path: rel, lineNo, rule }));
    else findings.push(Object.freeze({ path: rel, lineNo, rule }));
  };

  // Rule 1: the header.
  const { index, line } = headerLine(text, config);
  const layer = parseLayerHeader(line);
  if (layer === null) {
    add(index + 1, line.trimStart().startsWith("//") ? "bad_label" : "missing_header");
    return Object.freeze({ findings: Object.freeze(findings), hatches: Object.freeze(hatches) });
  }

  // Rule 2: the port origin.
  if (claimsPortWithoutOrigin(text, index)) add(index + 1, "port_origin_missing");

  // Rule 3: the import rule, over in-repository targets only.
  const specs = specifiers(text);
  const allowed = MAY_IMPORT[layer];
  for (const s of specs) {
    if (!isInRepo(s.value, config)) continue;
    const target = layerOfTarget(s.value, rel);
    if (target === null || allowed.includes(target)) continue;
    add(
      s.lineNo,
      layer === "contract" ? "import_contract_to_non_contract" : "import_platform_to_product",
    );
  }

  // Rules 4 and 5 apply to platform files only, and never to a declared detector.
  if (layer !== "platform" || isTierExempt(rel, config)) {
    return Object.freeze({ findings: Object.freeze(findings), hatches: Object.freeze(hatches) });
  }

  const specSpans: Span[] = specs.map((s) => ({ start: s.start, end: s.end }));
  const { comment, literal } = spans(text);
  const lower = text.toLowerCase();

  // Tier A: anywhere, code and comments, case-insensitive. Never inside a specifier.
  for (const term of config.tierA) {
    const needle = term.toLowerCase();
    let at = lower.indexOf(needle);
    while (at !== -1) {
      if (!inSpans(at, specSpans)) add(lineNoAt(text, at), "banned_tier_a");
      at = lower.indexOf(needle, at + 1);
    }
  }

  // Tier B: identifiers and string literals only, whole word, never comments.
  for (const term of config.tierB) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    for (const m of lower.matchAll(re)) {
      const at = m.index ?? 0;
      if (inSpans(at, comment) || inSpans(at, specSpans)) continue;
      if (!inSpans(at, literal) && !/[A-Za-z0-9_$]/.test(text[at] ?? "")) continue;
      add(lineNoAt(text, at), "banned_tier_b");
    }
  }

  return Object.freeze({ findings: Object.freeze(findings), hatches: Object.freeze(hatches) });
}
