# Requirements Document

## Introduction

**P0 Foundations.** P0 creates the Parth monorepo so every later phase has a place to land, and it does so **without the wire contract**, which does not exist yet. It delivers a pnpm workspace with strict TypeScript, one lint and format setup, five workspace packages that each build, the ported repo checks plus the new three-layer check, the Supabase local-dev scaffold, a Docker Compose stack that brings up EMQX with a gateway and a simulator, and the root `.env.example` connection panel.

P0 contains no product behaviour and no wire behaviour. The Gateway and the Simulator start, log one line, idle, and shut down cleanly. They open no socket and connect to nothing. Everything above configuration and lifecycle waits for Document B-P.

The expensive two-thirds of this phase is a port from `.reference/xelulu`, which is read-only. The genuinely new work is three things: the **three-layer check** (`tooling/checks/layer.ts`), the **Parth connection panel**, and the **reduced P0 service lifecycle** that replaces the reference's contract-wired `gateway.ts` and `simulator.ts` until P2.

## Choices

Every spec in this build opens with its choices and its FLAGs.

| # | Choice | Reason |
|---|---|---|
| P0-C1 | **The contract directories are not created.** `packages/shared/src/gateway-contract/` and `packages/shared/src/hmi-contract/` do not exist after P0 - no directory, no `index.ts`, no `.gitkeep`, no stub type. | A `.gitkeep` is an invitation to put something next to it. The directory arriving empty is indistinguishable, to a later reader, from the directory arriving wrong. The whole contract lands in one piece at P1 from B-P. This is stricter than the reference's Phase 0, which did create `gateway-contract/.gitkeep`, and the extra strictness is deliberate. |
| P0-C2 | **`@parth/shared` exports nothing at P0.** `src/index.ts` is `export {};` with a one-line comment. No `domain/`, no `gateway-log/`, no `mock-audio/`. | `gateway-log/` cannot compile without the contract: four of its six files import `../gateway-contract/index.js`. `domain/` is Parth's own and arrives at P4 with the schema. An empty package still exercises the `workspace:` protocol and topological build order, which is all P0 needs from it. |
| P0-C3 | **The Gateway and the Simulator idle; they do not exit 0.** Each loads config, logs one Startup_Line, holds the event loop open, and exits 0 on `SIGINT` or `SIGTERM` after one Shutdown_Line. | The gate says "start, log, and idle". The reference's Phase 0 chose `ok` + exit 0 because it had no lifecycle to prove; Parth's P0 has to prove the lifecycle that P2 hangs MQTT and audio off, including clean shutdown under Compose. A service that exits immediately proves nothing about `docker compose up`. |
| P0-C4 | **`config.ts` and `env.ts` are adapted, not ported.** The reference's `config.ts` imports `buildTopic` from the shared package. At P0 the Config carries every Panel_Key the P0 services read and **no topic-derived field**; P1 restores the topic fields when the contract lands. | It is the one ported file in the P0 set that genuinely cannot compile as written. Reducing it and declaring the reduction is honest; faking a `buildTopic` would be a contract stub by another name (P0-C1). |
| P0-C5 | **`lifecycle.ts` is new and is P0-only.** It is replaced at P2 by the ported `gateway.ts` / `simulator.ts`. | The reference's `gateway.ts` has forty imports, almost all contract-dependent. Porting a gutted version would produce a file whose shape has to be undone at P2. A small, clearly temporary file that P2 deletes is cheaper than a large permanent one that P2 rewrites. |
| P0-C6 | **Neither service publishes a port, and neither has a Compose healthcheck.** EMQX keeps its ported healthcheck. | At P0 there is no listener and no CLI to probe, because both the Operator_Surface and the Control_Surface are contract-adjacent and defer to P2. Inventing a liveness file would be inventing a mechanism that P2 throws away. Liveness at P0 is proved from the host: the container is still `running`, and `docker compose stop` returns exit 0. |
| P0-C7 | **The banned-string tiers live in a fixture**, `tooling/fixtures/banned-strings.json`, read by `layer.ts` the way `approved-panel.txt` is read by `panel.ts`. | The membership belongs to Document A-P section 8, which has already amended it once (v1.2 took the ordinary English words out). Code that hard-codes the list needs a code change every amendment; a fixture needs a one-file edit and the check's tests do not move. It also keeps `layer.ts` free of banned strings, which Requirement 4.9 demands and a hard-coded list makes impossible. |
| P0-C8 | **`approved-panel.txt` is generated from Parth's `.env.example`, not ported.** | Its entire purpose is to be a byte-for-byte copy of *this* product's panel. Porting Xelulu's would guarantee a failing check on the first run. |
| P0-C9 | **Every pin is the reference's pin, taken from `.reference/xelulu/package.json`, not re-resolved.** | The point of the port is that the ported tooling, checks and CI run unchanged. Re-resolving "latest" would reintroduce exactly the drift Document A-P C6 exists to prevent. Where the reference pins a version, that version is copied. |
| P0-C10 | **The Expo SDK is the one exception to P0-C9** and is resolved at implementation time against the Expo Go on the founder's phone. | Expo Go runs only the SDK it was built for. The reference's `apps/parent-app` pins an SDK resolved against a different phone on a different date. |

## FLAGs

| # | FLAG | What is needed |
|---|---|---|
| P0-F1 | **RESOLVED by A-P v1.3.** The two-tier membership is now in A-P section 8 and is reproduced verbatim in `structure.md` and in the design below. The earlier provisional split is gone. | Nothing. Recorded because the resolution changed the answer rather than confirming it: `focus`, `confirm`, `matter`, `brief`, `meeting` and bare `google`/`microsoft` are **off both tiers**, and Tier A gained `whisperx`, `pyannote`, `googleapis`, `microsoft-graph` and `matter.js`. Two exemptions A-P section 8 does not reach are decided in `structure.md` and restated in Requirements 4.15 and 4.16. |
| P0-F2 | **`packages/shared/src/gateway-log/` cannot port at P0.** `constants.ts`, `safe-issues.ts` and `stream.ts` import `../gateway-contract/index.js`; `entries.ts` and `stream.ts` import `../domain/index.js`. | Recorded in the Deferral_Register and corrected in `reuse.md`, which previously said the directory ported whole. It ports at P1 with the contract. Nothing in P0 writes a Log_Entry; the P0 Logger emits plain structured lines. |
| P0-F3 | **The reference's `compose-acceptance.ts` asserts published ports for the gateway and the simulator**, which P0-C6 removes. | The check module ports unchanged; its P0 expectations narrow to EMQX's ports plus "both services reach `running`". P2 restores the service-port assertions. Flagged because it is the one ported *check* whose expectations P0 narrows. |
| P0-F4 | **The Expo SDK and every Expo-managed version are resolved in Task 1** (P0-C10), so this spec deliberately holds no value for them. | If the founder's Expo Go does not support the current stable SDK, Task 1 stops and raises it before the app is scaffolded. |
| P0-F5 | **No `pnpm-lock.yaml` can be committed until a real install runs.** The lockfile is an output of the install task, not an input to it. | Expected, not a problem. Recorded so that "a clean checkout runs `pnpm install`" is understood to mean the lockfile produced by P0's own first install. |

### Out of scope

- **Document B-P: every message type, Zod schema, codec, topic, fixture and golden value.** The contract does not exist. See the Deferral_Register in `tasks.md`.
- The HMI page-and-variable contract and the HMI token set.
- All MQTT and WebSocket logic, in either service, including connecting to EMQX.
- The Operator_Surface, the Control_Surface, the simulator panel and both service CLIs.
- The Developer_Console's stream, matrix, control, HMI preview and latency pages.
- The brain, its providers, its safety layer, its tools and its state.
- The `data_region` field and the residency boot check: they live on `provider-declaration.ts` and `provider-gate.ts`, which arrive at P5.
- Supabase tables, RLS policies and migration content.
- The Parth app's design system, its nine areas, Rive and `expo-dev-client`.
- Authentication, connections, the vault, the confirmation layer and the Ledger.
- Hosted deployment, TLS material and per-device certificates.
- Firmware.
## Glossary

- **Workspace**: the pnpm workspace monorepo rooted at the repository root, defined by `pnpm-workspace.yaml`.
- **Workspace_Package**: any package the Workspace resolves. At P0 there are exactly five: `apps/app`, `apps/admin`, `services/gateway`, `services/simulator`, `packages/shared`.
- **Reference_Repo**: `.reference/xelulu`, a read-only clone. Never edited, never imported from, git-ignored.
- **Port_Origin**: the `.reference/xelulu/...` path named in a ported file's header comment.
- **Root_Manifest**: the root `package.json`.
- **Base_TSConfig**: the root `tsconfig.base.json`, which every Workspace_Package's TypeScript config extends.
- **Build_Pipeline**: the root `pnpm build` script, which runs each Workspace_Package's `build` script.
- **Lint_Tooling**: the root ESLint flat config, the Prettier config and ignore file, and the `lint` and `format:check` scripts.
- **Parth_Plugin**: the local ESLint plugin at `tooling/eslint/parth-plugin.mjs`, exposing `no-cross-package-import` under the `parth` namespace.
- **Layer_Label**: the first token of a file's one-line header comment. Exactly one of `contract`, `platform`, `product`.
- **Layer_Check**: `tooling/checks/layer.ts`, which decides the Import_Rule and the banned-string rule.
- **Import_Rule**: the primary layer rule. A `platform` file may not import from a `product` path; a `contract` file may import only from `contract`. It governs imports **within this repository only**.
- **Banned_Strings_Fixture**: `tooling/fixtures/banned-strings.json`, holding Tier_A and Tier_B.
- **Tier_A**: banned strings matched **anywhere in a file, code and comments, case-insensitively**.
- **Tier_B**: banned strings matched in **identifiers and string literals only, whole-word, never in comments**.
- **Escape_Hatch**: the comment `// layer-check-allow: <reason>` on the line above a finding, which suppresses it.
- **Hatch_Cap**: five. The maximum number of Escape_Hatch occurrences in the Workspace.
- **Contract_Home**: `packages/shared/src/gateway-contract/`. **Does not exist at P0.**
- **Hmi_Contract_Home**: `packages/shared/src/hmi-contract/`. **Does not exist at P0.**
- **Shared_Package**: `packages/shared`, package name `@parth/shared`.
- **Gateway**: the Node.js and TypeScript service at `services/gateway`, package name `@parth/gateway`.
- **Simulator**: the Node.js and TypeScript service at `services/simulator`, package name `@parth/simulator`.
- **Parth_App**: the Expo app at `apps/app`, package name `@parth/app`.
- **Developer_Console**: the internal Vite and React console at `apps/admin`, package name `@parth/admin`. Called the Parth Developer Console in its interface; the path and the name differ deliberately.
- **Service_Config**: the validated configuration object each service builds from the Panel_Keys it reads.
- **Startup_Line**: one line on stdout, emitted exactly once per service process, carrying the event name `service_start`.
- **Shutdown_Line**: one line on stdout, emitted exactly once per service process that receives a Stop_Signal, carrying the event name `service_stop`.
- **Stop_Signal**: `SIGINT` or `SIGTERM`.
- **Idle_State**: the state a service holds after its Startup_Line: alive, writing nothing further, holding no socket, and keeping the event loop open with exactly one referenced timer.
- **Graceful_Shutdown**: on a Stop_Signal, one Shutdown_Line then exit code 0, within 5 seconds.
- **Local_Mode**: the configuration resolution the Reference_Repo uses when `APP_ENV` is `local` or unset, in which every Panel_Key has a loopback-only default.
- **Connection_Panel**: the root `.env.example`.
- **Approved_Panel**: the Connection_Panel content reproduced in Appendix A, and its generated copy at `tooling/fixtures/approved-panel.txt`.
- **Panel_Key**: a variable name declared on a `KEY=` line in the Approved_Panel.
- **Panel_Check**: the ported check that parses the Connection_Panel and compares it with the Approved_Panel.
- **Secret_Check**: the ported check that scans git-tracked files for non-empty assignments to Panel_Keys.
- **Supabase_Scaffold**: `supabase/` with `config.toml`, an empty `migrations/` and `seed.sql`.
- **Compose_Stack**: the root `docker-compose.yml` and the per-service Dockerfiles it references.
- **EMQX**: the EMQX MQTT broker container, image tag `5.8.9`.
- **Placeholder_Screen**: one screen showing the product name and a short "P0 placeholder" message, and nothing else.
- **Root_README**: the root `README.md`.
- **Deferral_Register**: the table in `tasks.md` naming every port-manifest entry not delivered at P0, its reason and its phase.

## Requirements

### Requirement 1: Workspace foundation

**User Story:** As the implementation engineer, I want a pinned, strict pnpm monorepo whose pins match the Reference_Repo exactly, so that the ported tooling, checks and CI run unchanged on every machine.

#### Acceptance Criteria

1. THE Workspace SHALL declare exactly the package globs `apps/*`, `services/*` and `packages/*` in `pnpm-workspace.yaml`, and those globs SHALL resolve to exactly the five Workspace_Packages and no other package.
2. THE `pnpm-workspace.yaml` SHALL declare `onlyBuiltDependencies` containing exactly `esbuild`, as the Reference_Repo does.
3. THE Root_Manifest SHALL set `"name": "parth"`, `"private": true` and `"type": "module"`, and SHALL set `packageManager` to exactly `pnpm@10.34.6`.
4. THE Workspace SHALL contain a `.nvmrc` holding one line with exactly `24.21.0`, and THE Root_Manifest SHALL set `engines.node` to exactly `24.21.0`.
5. THE Base_TSConfig SHALL be byte-identical to `.reference/xelulu/tsconfig.base.json`, setting `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `isolatedModules`, `resolveJsonModule` and `skipLibCheck`.
6. THE `tsconfig.json` of each Workspace_Package SHALL extend the Base_TSConfig and SHALL NOT set `strict` or any individual strict-family option to `false`.
7. THE Workspace SHALL contain a root `.npmrc` setting `node-linker=hoisted` and `save-exact=true`.
8. THE Root_Manifest and the `package.json` of each Workspace_Package SHALL give every dependency entry one exact `MAJOR.MINOR.PATCH` version, with no `^`, `~`, `*`, `x`, `latest`, other dist-tag, comparator, `||`, hyphen range, git URL, file path or tarball URL. References between Workspace_Packages SHALL use the `workspace:` protocol.
9. WHERE the Reference_Repo's `package.json` pins a dependency that the Parth Root_Manifest also declares, THE Parth pin SHALL equal the Reference_Repo pin exactly. The Expo-managed dependencies of the Parth_App are the only exception.
10. THE `package.json` of each Workspace_Package SHALL set `"private": true`.
11. THE Workspace SHALL name every git-tracked file it introduces in kebab-case, meaning each dot-separated part of the name (ignoring one leading dot) uses only lowercase `a-z`, digits `0-9` and single hyphens, and does not start or end with a hyphen. The only exceptions SHALL be `README.md`, `Dockerfile` and Expo Router's `_layout.tsx`.
12. THE Workspace SHALL commit one `pnpm-lock.yaml` at the root that matches every `package.json` in the Workspace.
13. WHEN `pnpm install --frozen-lockfile` runs in a fresh clone using the Node version in `.nvmrc` and the pnpm version in `packageManager`, THE Workspace SHALL exit with code 0 on Windows, macOS and Linux without changing `pnpm-lock.yaml`.
14. IF `pnpm-lock.yaml` does not match a `package.json`, THEN `pnpm install --frozen-lockfile` SHALL exit non-zero and SHALL leave `pnpm-lock.yaml` unchanged.
15. THE Workspace SHALL contain no git-tracked file under `.reference/`, and `.gitignore` SHALL ignore `.reference/`.

### Requirement 2: Install, build and test

**User Story:** As the implementation engineer, I want install, build, lint and test to pass from a clean clone, so that every later phase starts from a green baseline.

#### Acceptance Criteria

1. WHEN `pnpm install` runs in a clean clone with no `node_modules`, no build output and no `.env`, THE Workspace SHALL exit with code 0.
2. THE `package.json` of each of the five Workspace_Packages SHALL define a script named exactly `build`.
3. THE `build` script of the Gateway, the Simulator and the Shared_Package SHALL compile TypeScript with `tsc -p tsconfig.json`.
4. THE `build` script of the Developer_Console SHALL run `tsc --noEmit && vite build`.
5. THE `build` script of the Parth_App SHALL run `tsc --noEmit`.
6. WHEN `pnpm build` runs at the Workspace root after a successful `pnpm install` in a clean clone with no `.env` present, THE Build_Pipeline SHALL run each Workspace_Package's `build` exactly once, report zero TypeScript errors, and exit 0.
7. THE Build_Pipeline SHALL finish the Shared_Package `build` before starting the `build` of any Workspace_Package that declares the Shared_Package as a dependency.
8. IF any Workspace_Package `build` exits non-zero, THEN THE Build_Pipeline SHALL exit non-zero and its output SHALL name the failing Workspace_Package.
9. THE Root_Manifest SHALL define a `test` script that builds, type-checks the test project, runs Vitest once, and runs the Parth_App's own test script, in that order.
10. WHEN `pnpm test` runs at the Workspace root in a clean clone, THE Workspace SHALL exit 0 with every test passing and no test skipped for a missing contract.
11. THE Root_Manifest and every Workspace_Package script SHALL produce the same exit code on Windows (PowerShell and Command Prompt), macOS and Linux, without relying on shell syntax or utilities that exist on only some of them.
12. WHEN `pnpm install` runs in a clean clone, THE Workspace SHALL leave `pnpm-lock.yaml` unmodified, so `git status` reports no change to it.

### Requirement 3: Lint and format

**User Story:** As the implementation engineer, I want one lint and format setup at the root, so that every package follows the same style and the dependency rule is enforced at lint time.

#### Acceptance Criteria

1. THE Lint_Tooling SHALL provide a single ESLint flat config at the Workspace root covering every `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` and `.cjs` file in every Workspace_Package. No Workspace_Package SHALL contain its own ESLint config.
2. THE root ESLint config SHALL register the Parth_Plugin under the namespace `parth` and SHALL enable `parth/no-cross-package-import` at severity `error`, with the package table loaded from the Workspace manifests at config load.
3. THE Lint_Tooling SHALL provide one Prettier config and one Prettier ignore file at the Workspace root. No Workspace_Package SHALL contain its own Prettier config.
4. THE Root_Manifest SHALL define a `lint` script that runs ESLint once from the Workspace root with `--max-warnings=0`, and a `format:check` script that runs Prettier in check mode, both unchanged on Windows, macOS and Linux.
5. WHEN `pnpm lint` runs in a fresh clone after `pnpm install` and **before** `pnpm build`, THE Lint_Tooling SHALL report zero errors and exit 0.
6. WHEN `pnpm format:check` runs in a fresh clone after `pnpm install`, THE Lint_Tooling SHALL report zero unformatted files and exit 0.
7. THE Lint_Tooling SHALL exclude from both scripts: `node_modules` at any depth, every TypeScript output folder, the Vite output folder, Expo-generated folders and files, `pnpm-lock.yaml`, the Connection_Panel, `tooling/fixtures/`, `docs/`, `.kiro/` and `.reference/`.
8. IF any linted file contains at least one ESLint error, THEN `pnpm lint` SHALL report each offending file path and exit non-zero.
9. IF any file covered by `format:check` does not match the Prettier config, THEN the script SHALL report each offending path, exit non-zero, and leave the file unchanged.
### Requirement 4: The three layers and the Layer_Check

**User Story:** As the CTO, I want the layer rule enforced by a check from the first commit, so that the platform extraction after P5 is a mechanical move rather than an archaeology exercise.

#### Acceptance Criteria

1. THE first line of every git-tracked `.ts`, `.tsx` and `.mjs` file the Workspace introduces SHALL be a single-line comment whose first token after the comment marker is a Layer_Label followed by a colon, then a space, then a non-empty one-line description. WHERE line 1 is a tool pragma that the tool requires to be first, THE Layer_Label SHALL occupy line 2 instead; the accepted pragma list SHALL contain exactly one entry, `// @vitest-environment <env>`, and `tooling/test/layer.test.ts` SHALL assert its length.
2. THE Layer_Check SHALL parse a Layer_Label from a file's first line and SHALL report a finding when that line is absent, is not a single-line comment, or does not begin with exactly one of `contract:`, `platform:` or `product:`.
3. WHERE a file is a port from the Reference_Repo, THE header comment SHALL additionally name its Port_Origin as a path beginning `.reference/xelulu/`, on the same line.
4. THE Layer_Check SHALL apply the Import_Rule: a `platform` file importing from a `product` path is a finding, and a `contract` file importing from any in-repository path that is not `contract` is a finding. A `product` file SHALL have no import restriction.
5. THE Import_Rule SHALL consider only in-repository module specifiers, resolved relatively or through a `@parth/*` package name. An external package specifier SHALL NOT be a finding under any Layer_Label, so a `contract` file importing `zod` and a `platform` file importing `mqtt`, `ws` or `node:crypto` are not findings.
6. THE Layer_Check SHALL apply Tier_A by matching each Tier_A string **anywhere in the file text, case-insensitively, in code and in comments alike**.
7. THE Layer_Check SHALL apply Tier_B by matching each Tier_B string **only inside identifiers and string literals, as a whole word, and never inside a comment**.
8. THE Layer_Check SHALL apply Tier_A and Tier_B to `platform` files only. A `contract` file and a `product` file SHALL NOT be checked against either tier.
9. THE Layer_Check SHALL read Tier_A and Tier_B from the Banned_Strings_Fixture and SHALL contain no banned string in its own source.
10. WHERE an Escape_Hatch comment appears on the line immediately above a finding, THE Layer_Check SHALL suppress that finding and SHALL count the Escape_Hatch.
11. THE Workspace SHALL contain at most Hatch_Cap Escape_Hatch occurrences across every git-tracked file, and `tooling/test/layer.test.ts` SHALL fail when that count exceeds Hatch_Cap.
12. THE Layer_Check SHALL be a pure module: text and fixture in, findings out, with no filesystem access. Every finding SHALL carry `{ path, lineNo, rule }` only, and SHALL NOT carry source text or the matched string.
13. WHEN the Layer_Check runs over every git-tracked file in the Workspace at P0, THE Workspace SHALL produce zero findings.
14. THE Banned_Strings_Fixture SHALL be valid JSON holding exactly the keys `tierA` and `tierB`, each an array of lowercase non-empty strings, with no string appearing in both arrays, and its contents SHALL equal Document A-P section 8's two tiers exactly.
15. THE Layer_Check SHALL NOT scan a module specifier - the quoted string of an `import`, `export … from`, `import()` or `require()` - against Tier_A or Tier_B. A specifier is governed by the Import_Rule alone, so `@parth/shared` SHALL NOT be a Tier_A finding in a `platform` file.
16. THE Layer_Check SHALL hold an Infrastructure_Exclusion list naming exactly the two paths `eslint.config.mjs` and `tooling/eslint/parth-plugin.mjs`, written out literally in its own source. A file on that list SHALL be excluded from layer labelling entirely: it SHALL carry no Layer_Label, and neither the Import_Rule, Tier_A nor Tier_B SHALL be applied to it.
17. THE `tooling/test/layer.test.ts` SHALL assert both the contents **and the length** of the Infrastructure_Exclusion list, so that adding a third path fails the build.
18. THE file `tooling/eslint/no-cross-package-import.mjs` SHALL NOT be on the Infrastructure_Exclusion list and SHALL carry the Layer_Label `platform`.
19. NO file on the Infrastructure_Exclusion list SHALL import from a `product` path. Exclusion withholds the check; it grants no right that a `platform` file does not have.
20. THE Banned_Strings_Fixture SHALL NOT contain `focus`, `confirm`, `matter`, `brief`, `meeting`, bare `google` or bare `microsoft` in either tier.

### Requirement 5: Ported repo checks

**User Story:** As the implementation engineer, I want the Reference_Repo's checks running on Parth from the first commit, so that the rules they encode are never a matter of memory.

#### Acceptance Criteria

1. THE Workspace SHALL contain `tooling/checks/` with `contract-use.ts`, `env-reads.ts`, `exact-version.ts`, `kebab-case.ts`, `panel.ts`, `secret-scan.ts`, `service-sources.ts`, `url-scan.ts`, `contrast.ts`, `audio-retention.ts` and `layer.ts`.
2. Each ported check module SHALL be byte-identical to its Reference_Repo original except for the rename rule and its Layer_Label header line.
3. Each ported check module SHALL remain pure: text in, findings out, no filesystem access, and no finding carrying a secret value or source text.
4. THE Workspace SHALL contain `tooling/compose/compose-acceptance.ts`, `tooling/eslint/no-cross-package-import.mjs`, `tooling/eslint/parth-plugin.mjs` and `tooling/emqx/auth-bootstrap.json`, each ported.
5. THE Workspace SHALL contain six ported fixtures: `contract-use-banned.txt`, `contract-use-clean.txt`, `gateway-boundaries-banned.txt`, `gateway-boundaries-clean.txt`, `service-sources-banned.txt` and `service-sources-clean.txt`.
6. WHERE a ported check's test cannot run without the contract, THE test SHALL be listed in the Deferral_Register rather than weakened, skipped or marked `todo`.
7. THE `contract-use` fixtures SHALL be ported at P0 even though their test defers to P1, and the Deferral_Register SHALL record them as present and unexercised.
8. THE `contrast` check module SHALL be ported at P0 and SHALL have no P0 target, because the HMI token set arrives at P9. The Deferral_Register SHALL record it.
9. THE `audio-retention` check module SHALL be ported at P0 and SHALL run against its own fixtures only.
10. WHEN `pnpm test` runs, every check module that has a P0 target SHALL be exercised by at least one test that is not deferred.

### Requirement 6: The Connection_Panel

**User Story:** As Omar, I want one file where every key, URL and port has a labelled box, so that I paste a value once and the whole system picks it up.

#### Acceptance Criteria

1. THE Workspace SHALL contain `.env.example` at the root whose content is byte-identical to Appendix A.
2. THE Connection_Panel SHALL use comment-above-key form: every comment SHALL occupy its own line, and no line SHALL contain text after a `KEY=` assignment.
3. THE Connection_Panel SHALL declare every Panel_Key with an empty value.
4. THE Connection_Panel SHALL NOT declare any key for OTA signing material beyond `OTA_SIGNING_KEY_ID`, and SHALL NOT declare any key for a feature not yet built, including a phone-companion push credential.
5. THE Connection_Panel SHALL mark each box with the side that fills it, using exactly `[cloud]`, `[app]` or `[device]`, and SHALL mark every backend-only secret as such.
6. THE Connection_Panel SHALL mark each box that arrives at P12.5 - `MQTT_CA_PATH`, `DEVICE_CERT_PATH`, `DEVICE_KEY_PATH`, `TELEMETRY_ENDPOINT` and `TELEMETRY_API_KEY` - with the phase it arrives in.
7. THE Connection_Panel SHALL state, on the boxes it applies to, that `CONFIRM_TIMEOUT_SEC`, `UNDO_WINDOW_SEC`, `PROACTIVITY_MAX_PER_HOUR`, `MEETING_AUDIO_RETENTION`, `TRANSCRIPT_RETENTION_DAYS` and `LEDGER_RETENTION_MONTHS` are defaults only, and that the live value is per user from P4.
8. THE Workspace SHALL contain `tooling/fixtures/approved-panel.txt` whose content is byte-identical to the Connection_Panel.
9. WHEN Panel_Check runs on the Workspace, THE Panel_Check SHALL report no issue, under LF or CRLF line endings and with or without one trailing line ending.
10. IF the Connection_Panel drops, duplicates, reorders, adds or gives a non-empty value to any Panel_Key, THEN Panel_Check SHALL report at least one issue and SHALL name every affected key.
11. IF the Connection_Panel differs from the Approved_Panel on any line, THEN Panel_Check SHALL report the 1-based number of the first differing line.
12. NO Panel_Check issue SHALL carry a declared value.
13. THE Workspace SHALL contain `.env.local.example`, git-tracked, holding dev-only placeholder values for the Compose stack and nothing real.
14. Every environment variable any Workspace_Package reads SHALL be declared in the Connection_Panel, and the ported `env-reads` check SHALL prove it.

### Requirement 7: Secret hygiene

**User Story:** As Omar, I want it to be structurally hard to commit a secret, so that one careless paste is not a trust incident.

#### Acceptance Criteria

1. THE `.gitignore` SHALL ignore `.env` and `.env.*` at any depth, re-including only `/.env.example` and `/.env.local.example`, and SHALL ignore `node_modules/`, `dist/`, `*.tsbuildinfo`, `coverage/`, `.reference/` and the Expo-generated paths.
2. THE `.dockerignore` SHALL exclude `**/node_modules`, `**/dist`, `.git`, `.env`, `.env.*`, `docs`, `.kiro` and `.reference`, so no secret and no reference source enters a build context.
3. WHEN Secret_Check runs over every git-tracked file, THE Secret_Check SHALL report no finding.
4. THE Secret_Check SHALL report exactly those lines that assign a non-empty literal value to a Panel_Key, treating no text, whitespace only, `""`, `''`, `${NAME}` and `env(NAME)` as empty.
5. NO Secret_Check output SHALL contain a detected value.
6. THE Parth_App SHALL read no environment variable at P0, and the ported `env-reads` check SHALL fail the build if the Parth_App reads any variable whose name does not begin `EXPO_PUBLIC_`.
7. THE Supabase_Scaffold SHALL express every secret as `env(NAME)` and SHALL hold no literal value.
8. NO Workspace_Package SHALL contain a non-local URL on a non-comment line, and the ported `url-scan` check SHALL prove it, treating `localhost`, `127.0.0.1` and `[::1]` as local.

### Requirement 8: Dependency direction

**User Story:** As the CTO, I want the one-way dependency rule enforced at lint time, so that the apps and services cannot quietly grow edges between each other.

#### Acceptance Criteria

1. THE Parth_Plugin SHALL expose `no-cross-package-import`, ported unchanged from the Reference_Repo apart from its plugin name and its Layer_Label header.
2. THE rule SHALL report an error for a static `import`, an `export … from`, a dynamic `import()` and a `require()` that resolves from one Workspace_Package under `apps/*` or `services/*` into a different Workspace_Package under `apps/*` or `services/*`, whether written as a relative path or as a package name.
3. THE rule SHALL NOT report an import of the Shared_Package by name from any Workspace_Package.
4. THE rule SHALL NOT report an import within the same Workspace_Package.
5. THE Gateway and the Simulator SHALL each declare `@parth/shared` as a `workspace:*` dependency, so that the Build_Pipeline runs in topological order.
6. NO Workspace_Package SHALL import from `.reference/`, and every `tsconfig` `include` and `exclude` SHALL keep `.reference/` out of every compilation.
7. THE Shared_Package SHALL declare no dependency on any other Workspace_Package.
### Requirement 9: Shared package scaffold, and the absence of the contract

**User Story:** As the CTO, I want the contract's home not to exist yet, so that nothing can be written against a guessed version of it.

#### Acceptance Criteria

1. THE Shared_Package SHALL be named `@parth/shared`, version `0.0.0`, private, `type: module`, with `main`, `types` and `exports` pointing into `dist`.
2. THE Shared_Package `src/index.ts` SHALL be exactly one Layer_Label header comment, one comment naming Document B-P and P1, and `export {};`.
3. WHEN the built Shared_Package is imported, THE module namespace SHALL have zero own enumerable keys and SHALL NOT have a `default` export.
4. THE Workspace SHALL NOT contain the Contract_Home: neither the directory, nor an `index.ts`, nor a `.gitkeep`, nor a placeholder type, nor a commented-out declaration.
5. THE Workspace SHALL NOT contain the Hmi_Contract_Home, on the same terms.
6. THE Workspace SHALL NOT contain `packages/shared/src/domain/`, `packages/shared/src/gateway-log/` or `packages/shared/src/mock-audio/` at P0.
7. NO file in the Workspace SHALL import from a path containing `gateway-contract` or `hmi-contract`.
8. NO file in the Workspace SHALL declare a type, constant or Zod schema that names a Document B-P message, field, enum, topic, capability flag or touch-zone value.
9. NO file in the Workspace except the Connection_Panel, the Approved_Panel, `.env.local.example`, the Compose_Stack and the Root_README SHALL contain a string literal beginning `parth/` or `prt_`.
10. THE Shared_Package SHALL declare `zod` in neither `dependencies` nor `devDependencies` at P0, because the only module entitled to import it is the Contract_Home.
11. WHEN the ported `contract-use` check is pointed at the Workspace at P0, THE check SHALL be given an empty contract surface and SHALL report no finding.

### Requirement 10: Gateway skeleton

**User Story:** As the implementation engineer, I want the gateway to start, log, idle and stop cleanly, so that P2 has a lifecycle to hang MQTT and audio off instead of inventing one.

#### Acceptance Criteria

1. THE Gateway SHALL be named `@parth/gateway`, version `0.0.0`, private, `type: module`, with a `build` script of `tsc -p tsconfig.json` and a `start` script of `node dist/index.js`.
2. THE Gateway SHALL contain, ported unchanged under the rename rule, `backoff.ts`, `clock.ts`, `config-error-writer.ts`, `crash.ts`, `deadlines.ts`, `ids.ts`, `listen-host.ts` and `log/logger.ts`.
3. THE Gateway SHALL contain an adapted `config.ts` and `env.ts` that read only Panel_Keys, validate them, and derive no topic and no contract value.
4. THE Gateway SHALL contain a new `lifecycle.ts` and `index.ts` implementing the P0 lifecycle, each labelled `platform`, each carrying a comment stating it is replaced at P2.
5. WHEN the Gateway starts with a valid Service_Config, THE Gateway SHALL emit exactly one Startup_Line on stdout carrying the event `service_start`, the service name, the resolved `APP_ENV`, the resolved listen host and the process id.
6. THE Startup_Line SHALL contain no Panel_Key value other than `APP_ENV` and the listen host, and SHALL contain no secret.
7. AFTER the Startup_Line, THE Gateway SHALL enter Idle_State and SHALL write nothing further to stdout or stderr until it receives a Stop_Signal.
8. WHILE in Idle_State, THE Gateway SHALL hold no listening socket and no outbound connection, and SHALL import no module from `node:net`, `node:http`, `node:https`, `node:dgram`, `node:tls`, `ws` or `mqtt`.
9. WHEN the Gateway receives a Stop_Signal, THE Gateway SHALL emit exactly one Shutdown_Line carrying the event `service_stop`, the signal name and the uptime in milliseconds, and SHALL exit with code 0 within 5 seconds.
10. THE Gateway SHALL NOT call `process.exit()` on the success path.
11. IF a required Panel_Key is absent or fails validation, THEN THE Gateway SHALL write one configuration error naming every offending key, SHALL write no Panel_Key value, SHALL emit no Startup_Line, and SHALL exit with a non-zero code.
12. WHEN the Gateway starts with every Panel_Key absent from the environment and `APP_ENV` unset, THE Gateway SHALL resolve its Local_Mode defaults, start and idle, so `docker compose up` works on a fresh clone with no `.env`.
13. IF `dist` is absent, THEN `node dist/index.js` SHALL exit non-zero, emit no Startup_Line and write nothing to stdout.
14. THE Gateway SHALL install the ported crash handler before any other work, so an uncaught exception is reported once and exits non-zero without a partial Shutdown_Line.
15. THE Gateway SHALL contain no file under `src/mqtt/`, `src/audio/`, `src/devices/`, `src/operator/`, `src/brain/`, `src/screen/`, `src/vault/`, `src/connections/`, `src/confirm/`, `src/ledger/`, `src/proactivity/`, `src/meetings/`, `src/matter/`, `src/btcall/`, `src/intercom/`, `src/schedules/` or `src/review/` at P0.

### Requirement 11: Simulator skeleton

**User Story:** As the implementation engineer, I want the simulator to have the same lifecycle as the gateway, so that P2 can make it a peer of the device rather than a script.

#### Acceptance Criteria

1. THE Simulator SHALL be named `@parth/simulator`, with the same manifest shape, scripts and `workspace:*` dependency on the Shared_Package as the Gateway.
2. THE Simulator SHALL contain, ported unchanged under the rename rule, `backoff.ts`, `clock.ts`, `config-error-writer.ts`, `crash.ts`, `deadlines.ts`, `ids.ts` and `listen-host.ts`.
3. THE Simulator SHALL contain an adapted `log/logger.ts` that emits the same line shape as the Gateway's Logger and depends on no Log_Entry type, because the Reference_Repo's simulator Logger imports the shared package.
4. THE Simulator SHALL contain an adapted `config.ts` and `env.ts`, and a new `lifecycle.ts` and `index.ts`, on the same terms as the Gateway.
5. Requirements 10.5 through 10.14 SHALL hold for the Simulator, with its own service name in the Startup_Line.
6. THE Simulator SHALL declare no dependency on the Gateway or on any `apps/*` package.
7. WHERE the Simulator reads `MQTT_USERNAME` or `MQTT_PASSWORD` and the value is unset or empty, THE Simulator SHALL resolve it to null, preserving the Reference_Repo's rule that an unset broker credential makes the simulator authenticate as the device. No connection is attempted at P0.
8. THE Simulator SHALL contain no file under `src/device/`, `src/mqtt/`, `src/audio/`, `src/control/`, `src/hmi/` or `panel/` at P0.

### Requirement 12: Parth app placeholder

**User Story:** As Omar, I want an empty Parth app that opens on my phone, so that the mobile toolchain is proven before any feature work.

#### Acceptance Criteria

1. THE Parth_App SHALL be named `@parth/app`, private, and SHALL live at `apps/app`.
2. THE Parth_App SHALL use Expo with Expo Router, NativeWind and the current stable Expo SDK resolved at implementation time, with every Expo-managed dependency pinned exactly to the version the resolved SDK pairs with.
3. THE Parth_App SHALL present exactly one Placeholder_Screen naming the product and stating that it is a P0 placeholder.
4. THE Placeholder_Screen SHALL mark its title as a heading for assistive technology.
5. THE Parth_App SHALL show no secret, no connection value and no device data.
6. THE Parth_App SHALL read no environment variable at P0.
7. THE Parth_App SHALL contain no native module outside the Expo Go runtime for the resolved SDK, and SHALL NOT depend on `expo-dev-client` or Rive at P0.
8. THE Parth_App `build` script SHALL be `tsc --noEmit` and SHALL exit 0.
9. THE Parth_App SHALL define a `test` script that the root `test` script invokes, and that script SHALL pass with at least one test asserting the Placeholder_Screen renders its title.
10. THE Parth_App SHALL NOT import from any `services/*` package, and SHALL NOT import the Shared_Package at P0.
11. THE Parth_App SHALL contain no `src/components/` UI kit, no `src/theme/` token set, no `src/orb/`, no `src/lib/` Supabase client and no route beyond the Placeholder_Screen at P0.

### Requirement 13: Developer console placeholder

**User Story:** As the implementation engineer, I want the console's shell to exist and build, so that P3 only has to add pages.

#### Acceptance Criteria

1. THE Developer_Console SHALL be named `@parth/admin` and SHALL live at `apps/admin`, for port fidelity with the Reference_Repo.
2. THE Developer_Console SHALL describe itself, in its manifest and in its interface, as the Parth Developer Console, internal only, never shipped to a customer.
3. THE Developer_Console SHALL read its port from `CONSOLE_PORT` and SHALL bind its dev and preview servers to `127.0.0.1` only, with `strictPort` set so a busy port fails loudly instead of moving.
4. THE Developer_Console SHALL present exactly one Placeholder_Screen and SHALL show no secret, no connection value and no device data.
5. THE Developer_Console SHALL NOT contain `src/stream/`, `src/log/`, `src/matrix/`, `src/control/`, `src/devices/`, `src/hmi/` or `src/latency/` at P0.
6. THE Developer_Console SHALL NOT contain `vite-proxy.ts` at P0, because the Operator_Surface it proxies does not exist until P2.
7. THE Developer_Console `build` script SHALL run `tsc --noEmit && vite build` and exit 0.
8. THE Developer_Console SHALL pin the same `react`, `react-dom` and `@types/react` versions as the Parth_App.
### Requirement 14: Supabase scaffold

**User Story:** As the implementation engineer, I want the Supabase folder shape in place, so that P4 adds migrations rather than inventing a layout.

#### Acceptance Criteria

1. THE Supabase_Scaffold SHALL contain `config.toml`, `migrations/`, `seed.sql` and its own `.gitignore`, ported from the Reference_Repo.
2. THE `config.toml` SHALL parse as TOML 1.0 and SHALL carry, on its first line, a comment naming the Supabase CLI version that generated it.
3. THE `migrations/` directory SHALL contain only a `.gitkeep`, and THE Workspace SHALL contain no SQL migration at P0.
4. THE `seed.sql` SHALL contain only comments.
5. THE Supabase_Scaffold SHALL express every secret as `env(NAME)` and SHALL contain no literal secret, no project ref and no non-local URL.
6. THE Supabase_Scaffold SHALL declare no Parth table, column, policy or role.

### Requirement 15: The Compose stack

**User Story:** As Omar, I want `docker compose up` on a fresh clone to bring up the broker and both services, so that I can see the stack run before any feature exists.

#### Acceptance Criteria

1. THE Compose_Stack SHALL define exactly three services at P0 - `emqx`, `gateway` and `simulator` - with the project name `parth`.
2. THE EMQX service SHALL use image tag exactly `emqx/emqx:5.8.9` and SHALL carry a comment stating that 5.9 and later are BSL 1.1.
3. THE EMQX service SHALL have anonymous access off, with one `password_based` and `built_in_database` authenticator seeded from `tooling/emqx/auth-bootstrap.json` mounted read-only, and SHALL carry a comment stating that the bootstrap file must be BOM-free or EMQX silently refuses every client.
4. THE EMQX service SHALL bind ports 1883 and 8883 to `${DEVICE_BIND_HOST:-127.0.0.1}` and ports 8083, 8084 and 18083 to `127.0.0.1` always.
5. THE EMQX service SHALL keep its ported healthcheck.
6. THE Gateway and Simulator services SHALL build from per-service Dockerfiles whose base image tag matches `.nvmrc` exactly.
7. THE Gateway and Simulator services SHALL publish no port at P0 and SHALL declare no healthcheck at P0.
8. THE Gateway and Simulator services SHALL each declare `depends_on` on `emqx` with condition `service_healthy`.
9. Each service SHALL carry its own Local_Mode environment defaults written `${VAR:-default}`, and SHALL declare `env_file` for `./.env` with `required: false`.
10. WHEN `docker compose up --build` runs in a fresh clone with **no** `.env` file, THE Compose_Stack SHALL reach a state where EMQX is healthy and both the Gateway and the Simulator containers are `running`, each having logged exactly one Startup_Line.
11. WHILE the Compose_Stack is up at P0, NO Gateway or Simulator log line SHALL report a broker connection, a subscription, a publish or an audio socket.
12. WHEN `docker compose stop` runs, THE Gateway and the Simulator SHALL each log exactly one Shutdown_Line and exit with code 0, and Compose SHALL NOT report a kill after timeout.
13. THE Compose_Stack SHALL set `restart: "no"` on every service.
14. NO Compose service SHALL carry a literal secret. Every credential SHALL be a `${VAR:-dev-placeholder}` form whose default is plainly a local placeholder.
15. THE ported `compose-acceptance` check SHALL pass against the P0 Compose_Stack, with its expectations for Gateway and Simulator published ports and healthchecks narrowed to match criterion 7 and recorded in the Deferral_Register.

### Requirement 16: CI

**User Story:** As the CTO, I want CI to run the same commands the gate names, so that green on a machine means green in the repository.

#### Acceptance Criteria

1. THE Workspace SHALL contain `.github/workflows/ci.yml`, ported from the Reference_Repo.
2. THE CI workflow SHALL use the Node version in `.nvmrc` and the pnpm version in `packageManager`.
3. THE CI workflow SHALL run, in order, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm build` and `pnpm test`, and SHALL fail on the first non-zero exit.
4. THE CI workflow SHALL assert that `pnpm install --frozen-lockfile` left `pnpm-lock.yaml` unchanged.
5. THE CI workflow SHALL run a Compose acceptance step that brings the stack up, asserts criteria 15.10 and 15.12, and brings it down.
6. THE CI workflow SHALL NOT require any secret to run, and SHALL NOT read a repository secret at P0.

### Requirement 17: Root README

**User Story:** As Omar, I want a README that tells me exactly what to run, so that I never have to reconstruct a command from a document.

#### Acceptance Criteria

1. THE Root_README SHALL state what Parth is in two sentences and SHALL name the three layer labels and where the steering files live.
2. THE Root_README SHALL give the prerequisites: the exact Node version, the exact pnpm version and the Docker Compose floor.
3. THE Root_README SHALL give the commands for install, build, lint, format check, test and `docker compose up`, each runnable unchanged on Windows, macOS and Linux, with the one exception of the copy step in criterion 4, which SHALL have separate PowerShell and POSIX forms.
4. THE Root_README SHALL tell the reader to copy `.env.local.example` to `.env` for the local stack, and SHALL state that `.env.example` is the panel and is never filled in place.
5. THE Root_README SHALL keep the Reference_Repo's EMQX licence warning: 5.8.9 is Apache-2.0, 5.9 and later are BSL 1.1, and the pin does not move.
6. THE Root_README SHALL state that the EMQX dashboard credentials are the image defaults, are for local development only, and are never exposed beyond `127.0.0.1`.
7. THE Root_README SHALL state that the wire contract does not exist yet, that it arrives at P1 from Document B-P, and that `packages/shared/src/gateway-contract/` is deliberately absent.
8. THE Root_README SHALL state that `.reference/xelulu` is read-only and is never edited or imported from.
9. THE Root_README SHALL show no secret and no value for any Panel_Key.

### Requirement 18: Port provenance and the Deferral_Register

**User Story:** As the CTO, I want to be able to tell, from the repository alone, what was ported, from where, and what was deliberately left out, so that the P1 spec starts from a complete list rather than a re-reading of the reference.

#### Acceptance Criteria

1. Every ported file SHALL name its Port_Origin in its header comment, on the same line as its Layer_Label.
2. Every Port_Origin SHALL resolve to a file that exists in the Reference_Repo.
3. Every file that is not a port SHALL carry a Layer_Label header with no Port_Origin.
4. THE Deferral_Register in `tasks.md` SHALL name every entry of the port manifest that P0 does not deliver, with a reason drawn from a closed set - imports the contract, needs Document B-P, needs a product service that does not exist, needs the Parth schema, needs the HMI token set, needs the app design system, or never ported - and the phase it is deferred to.
5. THE Deferral_Register SHALL be complete rather than representative: a port-manifest entry that appears in neither the P0 deliverables nor the Deferral_Register is a gap, and finding one is a P0 defect.
6. WHERE a ported file is present at P0 but unexercised, THE Deferral_Register SHALL record it as present and unexercised rather than omitting it.
7. WHERE a ported file's expectations are narrowed at P0, THE Deferral_Register SHALL record what was narrowed and the phase that restores it.

## Done when

P0 is done when all seven checks pass.

| # | Done when | Requirements |
|---|---|---|
| 1 | A clean checkout runs `pnpm install` and `pnpm build` with no errors. | 1.1-1.15, 2.1-2.12 |
| 2 | `pnpm lint` and `pnpm format:check` pass with zero errors and zero warnings. | 3.1-3.9 |
| 3 | `pnpm test` passes, every repo check included, with no test skipped for a missing contract. | 2.10, 4.1-4.14, 5.1-5.10, 6.9-6.12, 7.3-7.8, 8.1-8.7 |
| 4 | `docker compose up` on a fresh clone with no `.env` brings EMQX to healthy and leaves the gateway and the simulator `running`, each having logged one Startup_Line; `docker compose stop` gets one Shutdown_Line and exit 0 from each. | 15.1-15.15 |
| 5 | `.env.example` exists with every box present and empty, and `approved-panel.txt` matches it byte for byte. | 6.1-6.14 |
| 6 | `packages/shared/src/gateway-contract/` and `packages/shared/src/hmi-contract/` do not exist, and nothing in the repository names a B-P value. | 9.4-9.11 |
| 7 | Every file carries a layer label, every ported file names its origin, and the Deferral_Register accounts for every port-manifest entry P0 did not deliver. | 4.1-4.3, 18.1-18.7 |

Requirements 12, 13, 14, 16 and 17 support these checks - the two placeholders, the Supabase shape, CI and the README. They are verified by the automated checks and by review.

## Appendix A: The approved connection panel

The Connection_Panel must reproduce this content exactly, and `tooling/fixtures/approved-panel.txt` must be a byte-for-byte copy of it. Every comment sits on its own line directly above its key (A-P C15). There is no OTA signing key and no box for an unbuilt feature (A-P C16).
```
# ===================================================================
# PARTH CONNECTION PANEL. Never commit real values. Copy to .env.
# Side legend: [cloud]=gateway/edge fns  [app]=Parth app  [device]=device/simulator
# SECRET = backend only. Never in the app bundle, never on the device, never in a log.
# DEFAULT = a starting value only. The live value is per user from P4, in the app.
# ===================================================================

# --- Supabase ---
# [cloud] Project URL, Mumbai ap-south-1
SUPABASE_URL=
# [cloud] Public anon key, RLS-limited
SUPABASE_ANON_KEY=
# [cloud] SECRET. Bypasses RLS.
SUPABASE_SERVICE_KEY=
# [cloud] Project ref, for CLI migrations against the hosted project
SUPABASE_PROJECT_REF=
# [cloud] SECRET. Database password for CLI migrations
SUPABASE_DB_PASSWORD=

# --- Parth app. Expo bundles only EXPO_PUBLIC_* ---
# [app] Same value as SUPABASE_URL
EXPO_PUBLIC_SUPABASE_URL=
# [app] Same value as SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY=
# [app] local | staging | production. The app cannot read APP_ENV.
EXPO_PUBLIC_APP_ENV=
# [app] Fallback timezone before the user profile loads
EXPO_PUBLIC_DEFAULT_TZ=
# [app] Public base URL the app opens to start a connection flow
EXPO_PUBLIC_CONNECTIONS_BASE_URL=

# --- Brain providers ---
# [cloud] Adapter name
LLM_PROVIDER=
# [cloud] Model id
LLM_MODEL=
# [cloud] SECRET
LLM_API_KEY=
# [cloud] Speech-to-text adapter name
STT_PROVIDER=
# [cloud] SECRET
STT_API_KEY=
# [cloud] Text-to-speech adapter name
TTS_PROVIDER=
# [cloud] SECRET
TTS_API_KEY=
# [cloud] Research agent search backend
SEARCH_PROVIDER=
# [cloud] SECRET
SEARCH_API_KEY=

# --- Degradation ladder. Every provider names its fallback. ---
# [cloud] Model used when LLM_MODEL fails
LLM_FALLBACK_MODEL=
# [cloud] Fallback speech-to-text adapter
STT_FALLBACK_PROVIDER=
# [cloud] Fallback voice. The brain says when it is running degraded.
TTS_FALLBACK_PROVIDER=

# --- Transcription, for meetings ---
# [cloud] Hosted default adapter name
TRANSCRIBE_PROVIDER=
# [cloud] SECRET
TRANSCRIBE_API_KEY=
# [cloud] Self-host path only
WHISPERX_URL=
# [cloud] SECRET. Gated diarisation model agreement.
HUGGINGFACE_TOKEN=

# --- Ceilings. The brain refuses past these. ---
# [cloud] Per user per day
USER_DAILY_COST_CAP_USD=
# [cloud] Per user per hour
USER_HOURLY_TOOL_CAP=
# [cloud] Per research request
RESEARCH_COST_CAP_USD=
# [cloud] Maximum agent steps per research request
RESEARCH_MAX_STEPS=

# --- Trust spine timings. DEFAULT: per user from P4, on the Rules screen. ---
# [cloud] DEFAULT. Seconds a confirmation waits before expiring into not-done.
CONFIRM_TIMEOUT_SEC=
# [cloud] DEFAULT. Seconds the undo window stays open after an act.
UNDO_WINDOW_SEC=
# [cloud] DEFAULT. Interruptions allowed per hour.
PROACTIVITY_MAX_PER_HOUR=

# --- Retention. DEFAULT: per user from P4, on the Privacy screen. ---
# [cloud] DEFAULT. delete_after_transcription | keep_30d
MEETING_AUDIO_RETENTION=
# [cloud] DEFAULT. 30 | 90 | 365 | indefinite
TRANSCRIPT_RETENTION_DAYS=
# [cloud] DEFAULT. Months. The Ledger is the accountability receipt.
LEDGER_RETENTION_MONTHS=

# --- Connections. OAuth clients. ---
# [cloud] Built first at P6
GOOGLE_CLIENT_ID=
# [cloud] SECRET
GOOGLE_CLIENT_SECRET=
# [cloud] Callback URI registered with the provider
GOOGLE_REDIRECT_URI=
# [cloud] Built second at P6
MS_CLIENT_ID=
# [cloud] SECRET
MS_CLIENT_SECRET=
# [cloud] Directory tenant id
MS_TENANT_ID=
# [cloud] Callback URI registered with the provider
MS_REDIRECT_URI=
# [cloud] Notes and tasks client id
NOTION_CLIENT_ID=
# [cloud] SECRET
NOTION_CLIENT_SECRET=
# [cloud] Callback URI
NOTION_REDIRECT_URI=
# [cloud] Tasks client id
TODOIST_CLIENT_ID=
# [cloud] SECRET
TODOIST_CLIENT_SECRET=
# [cloud] Callback URI
TODOIST_REDIRECT_URI=
# [cloud] Music client id
SPOTIFY_CLIENT_ID=
# [cloud] SECRET
SPOTIFY_CLIENT_SECRET=
# [cloud] Callback URI
SPOTIFY_REDIRECT_URI=
# [cloud] SECRET. Signs the OAuth state parameter and the PKCE handoff.
OAUTH_STATE_SECRET=
# [cloud] Public base URL the OAuth callbacks land on
CONNECTIONS_BASE_URL=

# --- Token vault ---
# [cloud] SECRET. Wraps per-user data keys. Lives only in the cloud environment.
VAULT_MASTER_KEY=
# [cloud] Rotation marker
VAULT_KEY_VERSION=
# [cloud] env | kms. P12.5 moves the master key out of env.
VAULT_KEY_PROVIDER=

# --- Smart home ---
# [cloud] Where the controller keeps its fabric state
MATTER_STORAGE_PATH=
# [cloud] Human-readable fabric label
MATTER_FABRIC_LABEL=
# [cloud] Commissioning mode
MATTER_COMMISSIONING_MODE=

# --- Device seam. Document B-P. ---
# [cloud][device] Broker URL including scheme and port
MQTT_BROKER_URL=
# [cloud][device] Broker username. Cloud and device are different principals.
MQTT_USERNAME=
# [cloud][device] SECRET on whichever side holds it
MQTT_PASSWORD=
# [cloud][device] Per-turn audio WebSocket URL
AUDIO_WSS_URL=
# [cloud] SECRET. Issues the device id and the prototype token at provisioning.
DEVICE_PROVISION_SECRET=
# [cloud][device] Cloud-issued device id
DEVICE_ID=
# [device] SECRET on the device. Prototype auth; a certificate replaces it at P12.5.
DEVICE_TOKEN=
# [cloud][device] 127.0.0.1 keeps the stack closed. 0.0.0.0 opens the broker and the
# audio socket to the LAN only, and never the console or the panel.
DEVICE_BIND_HOST=

# --- TLS and per-device certificates. ARRIVES AT P12.5. ---
# [cloud][device] P12.5. CA bundle that validates the broker and the audio socket.
MQTT_CA_PATH=
# [device] P12.5. Per-device certificate, replacing DEVICE_TOKEN.
DEVICE_CERT_PATH=
# [device] P12.5. SECRET on the device. The key is generated on-device and never travels.
DEVICE_KEY_PATH=

# --- Local control surfaces ---
# [cloud] Local only, 127.0.0.1. The gateway operator surface.
GATEWAY_OPERATOR_PORT=
# [cloud] Local only, 127.0.0.1. The Parth Developer Console.
CONSOLE_PORT=
# [device] Local only, 127.0.0.1. The simulator control panel.
SIMULATOR_PANEL_PORT=

# --- Environment, locale and updates ---
# [cloud] local | staging | production
APP_ENV=
# [cloud] Default timezone, e.g. Asia/Kolkata
DEFAULT_TZ=
# [cloud] Default voice language before the user chooses, e.g. en-IN
DEFAULT_LOCALE=
# [cloud] Base URL for signed update manifests
OTA_MANIFEST_BASE_URL=
# [cloud] Which signing key a manifest was signed with. The key itself is never here:
# manifests are signed in the release pipeline and the device holds only the public key.
OTA_SIGNING_KEY_ID=
# [cloud] Base URL for display asset bundles
HMI_BUNDLE_BASE_URL=

# --- Telemetry. ARRIVES AT P12.5. ---
# [cloud] P12.5. Where field telemetry goes.
TELEMETRY_ENDPOINT=
# [cloud] P12.5. SECRET.
TELEMETRY_API_KEY=

# --- Evaluation harness ---
# [cloud] Grader model for the golden set. Separate, so a grader change
# does not silently move the gate.
EVAL_GRADER_MODEL=

# --- Data residency. Enforced at boot by the provider gate. ---
# [cloud] Storage and processing region
DATA_REGION=
# [cloud] true | false. False until Omar rules. A provider whose declared region
# violates this does not load, and a provider with no declared region does not load.
ALLOW_PROCESSING_OUTSIDE_INDIA=
```
