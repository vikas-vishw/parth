# Implementation Plan: P0 Foundations

## Overview

This plan builds the Parth monorepo in strict TypeScript, in the order the design lays out. It starts by copying every pin out of `.reference/xelulu` and resolving the one exception, then the root workspace config, the shared package, the two service skeletons, the two placeholders, and then install and build. After that come the connection panel, the ported checks, the new layer check, the ESLint config, the ported tooling tests, the Supabase scaffold, the Compose stack, the README and CI. It ends with full verification against the seven **Done when** rows and a completeness check on the Deferral Register.

Almost every task is a port. The three that are not are task 10 (the layer check), task 8 (the panel) and task 4.3 (the service lifecycle).

Ground rules for every task:

- **No contract.** `packages/shared/src/gateway-contract/` and `packages/shared/src/hmi-contract/` are not created. No directory, no `index.ts`, no `.gitkeep`, no stub type, no commented-out declaration. Nothing names a Document B-P message, field, enum, topic, capability flag or touch-zone value.
- **`.reference/` is read-only.** Read it as much as you like. Never edit, move or add a file inside it, and never import from it. The one test that touches it reads it to confirm a Port_Origin path exists.
- **Every pin is copied, not resolved.** Open `.reference/xelulu/package.json` and use its value. The Expo SDK is the only exception.
- **Every file carries a layer header on line 1**: `// contract: …`, `// platform: …` or `// product: …`. A ported file names its Port_Origin on the same line, as a path beginning `.reference/xelulu/`.
- **Tier A scans comments.** A `platform` file may not contain the product name even in prose. Where the rename rule would put it there, reword the sentence instead.
- **No env reads outside the two services.** No network connection from anything. The console and both services bind nothing that is not explicitly specified.
- **No secrets.** Every Panel_Key stays empty, every `.env.local.example` value is a visible placeholder, every Compose credential is a `${VAR:-dev-placeholder}`.
- **Every dependency is pinned exactly.** Any `~` or `^` a tool writes is rewritten to the exact resolved version.
- **Every file name is kebab-case**, except `README.md`, `Dockerfile` and `_layout.tsx`.
- **No git commits without Omar's explicit request.** Resolved versions, port origins and verification results are reported in the task result.
- **When you port a file, say which file it came from** in the task result, not only in the header.

## Tasks

- [ ] 1. Read the reference and resolve the one unpinned thing
  - [ ] 1.1 Copy every pin out of the Reference_Repo into a recorded list
    - Read `.reference/xelulu/package.json`, `.nvmrc`, `.npmrc`, `docker-compose.yml`, `apps/admin/package.json` and each service `package.json`. Record every version exactly as written.
    - The design's Pinned versions table is the expected answer. Report any value that differs from it and **do not edit design.md**.
    - Do not run `pnpm view`, do not resolve `latest`, do not bump anything. A drifted pin makes the ported tests fail for reasons that look like Parth bugs.
    - Confirm `emqx/emqx:5.8.9` and that it is the Apache-2.0 line. If the reference has moved past 5.8.x, stop and raise it with Omar.
    - _Requirements: 1.3, 1.4, 1.8, 1.9, 15.2_
  - [ ] 1.2 Resolve the current stable Expo SDK and confirm the founder's Expo Go supports it
    - Resolve with `npx create-expo-app` or `pnpm view expo version`, then `npx expo install --fix` for the Expo-managed set.
    - Confirm the Expo Go installed on the founder's phone, iOS or Android, supports that SDK. One platform is enough.
    - If neither does, stop and raise it with Omar before task 6.
    - Report the resolved SDK and the React, React Native, TypeScript, NativeWind and Tailwind versions it pairs with. The console pins the same React trio (design D3 of the reference).
    - _Requirements: 12.2, 13.8_
  - [ ] 1.3 Build the port manifest working list
    - List every file in the design's P0 file tree that is a port, with its Port_Origin. This list is the input to tasks 4, 9, 11, 12, 13 and 14, and the complement of the Deferral Register.
    - Cross-check it against the Deferral Register in this document. Every entry of `reuse.md`'s port manifest must appear in exactly one of the two. Report any entry that appears in neither.
    - _Requirements: 18.1, 18.4, 18.5_

- [ ] 2. Root workspace configuration
  - [ ] 2.1 Create `package.json`, `pnpm-workspace.yaml`, `.npmrc` and `.nvmrc`
    - `package.json`: `name: parth`, `private`, `type: module`, `packageManager: pnpm@10.34.6`, `engines.node: 24.21.0`, and the reference's scripts with `@parth/*` filters. `test` is `pnpm build && tsc -p tsconfig.test.json && vitest run && pnpm --filter @parth/app test`.
    - `pnpm-workspace.yaml`: exactly `apps/*`, `services/*`, `packages/*`, plus `onlyBuiltDependencies: [esbuild]`.
    - `.npmrc`: `node-linker=hoisted`, `save-exact=true`. `.nvmrc`: one line, `24.21.0`.
    - Scripts use only `pnpm`, `eslint`, `prettier`, `tsc`, `vitest` and `&&`. No `rm`, `cp`, env-var prefixes or shell globs.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 2.9, 2.11, 3.4_
  - [ ] 2.2 Create `tsconfig.base.json`, `tsconfig.test.json` and `vitest.config.ts`
    - `tsconfig.base.json` is byte-identical to the reference's. Each package sets its own `module`, `target`, `lib` and `jsx`.
    - `tsconfig.test.json` includes `tooling/**/*.ts`, `services/*/test/**/*.ts`, `packages/*/test/**/*.ts` and `vitest.config.ts`, and excludes `.reference/`.
    - `vitest.config.ts` covers the three test globs with `environment: "node"`.
    - _Requirements: 1.5, 1.6, 8.6_
  - [ ] 2.3 Create `.gitignore` and `.dockerignore`
    - `.gitignore`: `.env` and `.env.*` at any depth, re-including only `/.env.example` and `/.env.local.example`; plus `node_modules/`, `dist/`, `*.tsbuildinfo`, `coverage/`, `.reference/`, `apps/app/.expo/`, `apps/app/expo-env.d.ts`.
    - `.dockerignore`: `**/node_modules`, `**/dist`, `.git`, `.env`, `.env.*`, `docs`, `.kiro`, `.reference`, `apps/app/.expo`.
    - _Requirements: 1.15, 7.1, 7.2_
  - [ ] 2.4 Create `.prettierrc.json` and `.prettierignore`
    - Copy the reference's Prettier config. The ignore list swaps `apps/parent-app` for `apps/app` and gains `.reference/`.
    - _Requirements: 3.3, 3.7_

- [ ] 3. Shared package
  - [ ] 3.1 Create `packages/shared`
    - `@parth/shared`, `0.0.0`, private, `type: module`, `main`/`types`/`exports` into `dist`, `build` is `tsc -p tsconfig.json`. No `dependencies`. devDependencies only `typescript` and `@types/node`, both exact. **No `zod`.**
    - `tsconfig.json` extends the base, `NodeNext`, `ES2023`, `rootDir: src`, `outDir: dist`, `declaration: true`.
    - `src/index.ts` is the `contract` layer header, one comment saying the contract arrives whole at P1 from Document B-P, and `export {};`. Nothing else.
    - **Create no subdirectory under `src/`.** Not `gateway-contract`, not `hmi-contract`, not `domain`, not `gateway-log`, not `mock-audio`.
    - _Requirements: 2.3, 9.1, 9.2, 9.4, 9.5, 9.6, 9.10, 8.7_
  - [ ] 3.2 Write `packages/shared/test/exports.test.ts`
    - Import `../dist/index.js`. Assert `Object.keys(ns).length === 0` and `!("default" in ns)`.
    - _Requirements: 9.3_

- [ ] 4. Gateway and simulator skeletons
  - [ ] 4.1 Port the seven contract-free files into `services/gateway`
    - `backoff.ts`, `clock.ts`, `config-error-writer.ts`, `crash.ts`, `deadlines.ts`, `ids.ts`, `listen-host.ts`, and `log/logger.ts`. Each is byte-identical apart from the rename rule and its `platform` header naming its Port_Origin.
    - Confirmed contract-free by import inspection: only `deadlines.ts` (`./clock.js`) and `ids.ts` (`node:crypto`) import anything, and `node:crypto` is external so the Import_Rule ignores it.
    - Reword any ported comment that would put the product name into a `platform` file. Report every reworded line.
    - Create the manifest: `@parth/gateway`, `0.0.0`, private, `type: module`, `build` is `tsc -p tsconfig.json`, `start` is `node dist/index.js`, dependency `"@parth/shared": "workspace:*"`, devDependencies `typescript` and `@types/node`.
    - _Requirements: 10.1, 10.2, 2.3, 8.5, 4.1, 4.3, 18.1_
  - [ ] 4.2 Adapt `config.ts` and `env.ts` for the gateway
    - Keep the reference's signature and failure mode: `buildConfig(env)` returns either a Config or a list of `ConfigIssue`, and an issue carries a key name and a kind, never a value.
    - **Drop the topic fields and the `buildTopic` import.** `ServiceConfig` carries `appEnv`, `listenHost`, `brokerUrl`, `brokerUsername`, `brokerPassword`, `audioWssUrl`, `deviceId`, `deviceToken`, `operatorPort` and `defaultTz`. No `statusTopic`, `eventTopic`, `cmdTopic` or `ackTopic`.
    - Carry the Local_Mode defaults forward exactly, including the rule that an unset or empty `MQTT_USERNAME`/`MQTT_PASSWORD` resolves to `null`.
    - Add a comment naming P1 as the phase that restores the topic fields, and record the adaptation in the task result.
    - _Requirements: 10.3, 10.11, 10.12, 6.14, 9.7, 9.8_
  - [ ] 4.3 Write `lifecycle.ts` and `index.ts` for the gateway
    - `startLifecycle` emits the Startup_Line, opens exactly one referenced interval that does nothing, registers one handler for `SIGINT` and `SIGTERM`, and on the first signal clears the interval, emits the Shutdown_Line and lets the loop drain. A second signal is ignored. Never `process.exit()` on success.
    - `index.ts` installs the ported crash handler **first**, reads `process.env`, calls `buildConfig`, and on failure hands the issues to `config-error-writer` and exits non-zero with no Startup_Line.
    - The two lines are single-line JSON with fixed key order, exactly as the design states.
    - Import nothing from `node:net`, `node:http`, `node:https`, `node:dgram`, `node:tls`, `ws` or `mqtt`.
    - Both files carry a comment saying they are P0-only and are replaced at P2 by the ported `gateway.ts`.
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.13, 10.14, 10.15_
  - [ ] 4.4 Mirror tasks 4.1 to 4.3 into `services/simulator`
    - Same seven ported files, same adapted `config.ts` and `env.ts`, same new `lifecycle.ts` and `index.ts`, with `simulator` as the service name and `panelPort` in place of `operatorPort`.
    - **`log/logger.ts` is adapted, not ported**: the reference's simulator logger imports `@xelulu/shared`. Reduce it to the same no-import shape as the gateway's, emitting the identical line format.
    - Declare no dependency on the gateway or on any `apps/*` package.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  - [ ] 4.5 Write the start tests for both services
    - `test/start.test.ts` per service: spawn `node dist/index.js` and `pnpm --silent start`; assert exactly one Startup_Line, empty stderr, still alive after 3 s, no further output; `SIGTERM`; assert exactly one Shutdown_Line and exit 0 within 5 s.
    - Repeat with every Panel_Key removed, then with every Panel_Key set to a sentinel. The lines must be identical apart from `app_env` and `listen_host`, and no sentinel may appear anywhere in the output.
    - Spawn in a temp dir with no `dist`: non-zero exit, empty stdout.
    - Spawn with one required key invalid: no Startup_Line, an error naming the key, no value in the output, non-zero exit.
    - Port `test/support/test-clock.ts` and `test/support/capture-sink.ts` for these.
    - _Requirements: 10.5, 10.6, 10.7, 10.9, 10.11, 10.12, 10.13, 11.5_
  - [ ] 4.6 Write the lifecycle property test for both services (Property 15)
    - For any valid Service_Config and any signal sequence of length 1 to 5 drawn from `{SIGINT, SIGTERM}`, assert exactly one Startup_Line then exactly one Shutdown_Line, the Shutdown_Line names the **first** signal, `uptime_ms` is non-negative and monotonic on the test clock, and the interval is cleared exactly once.
    - For any invalid Service_Config, assert no Startup_Line, every offending key named, and no environment value in the output other than `APP_ENV` and the listen host.
    - 100 sequences per service.
    - _Requirements: 10.5-10.11, 11.5_

- [ ] 5. Developer console placeholder
  - [ ] 5.1 Create `apps/admin`
    - `@parth/admin`, `0.0.0`, private, `type: module`. `description`: "Parth Developer Console. Internal only; never shipped to a customer." Scripts `dev: vite`, `build: tsc --noEmit && vite build`, `preview: vite preview`.
    - Port `index.html`, `src/main.tsx`, `src/app.tsx` and `src/styles.css`, stripped to one Placeholder_Screen that names the Parth Developer Console and says P0 placeholder.
    - `vite.config.ts` ports with `server.host` and `preview.host` fixed to `127.0.0.1`, `strictPort: true`, and the port read from `CONSOLE_PORT`.
    - **Do not port `vite-proxy.ts`.** Do not create `src/stream/`, `src/log/`, `src/matrix/`, `src/control/`, `src/devices/`, `src/hmi/` or `src/latency/`.
    - Pin the same `react`, `react-dom` and `@types/react` as the app (task 1.2).
    - One test asserting the placeholder renders its title.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 2.4_

- [ ] 6. Parth app placeholder
  - [ ] 6.1 Create `apps/app`
    - `@parth/app`, private, Expo with Expo Router and NativeWind at the SDK resolved in task 1.2, every Expo-managed dependency pinned exactly.
    - `app/_layout.tsx` is the router root. `app/index.tsx` is the one Placeholder_Screen, naming Parth and saying P0 placeholder, with its title marked as a heading for assistive technology.
    - **Create no `src/` directory.** No UI kit, no theme tokens, no Supabase client, no orb, no illustrations, no feature folders.
    - Read no environment variable. Depend on no native module outside the Expo Go runtime. No `expo-dev-client`, no Rive.
    - Port `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `jest.config.js`, `nativewind-env.d.ts` and `global.css` from the reference's `apps/parent-app`, renamed.
    - `build` is `tsc --noEmit`. `test` runs jest-expo with one test asserting the placeholder renders its title.
    - _Requirements: 12.1-12.11, 2.5_
- [ ] 7. Install, build and the lockfile
  - [ ] 7.1 Run the first install and commit the lockfile
    - `pnpm install` on the pinned Node and pnpm. Rewrite every `~` or `^` any tool wrote to the exact version resolved in `pnpm-lock.yaml`, then install again until the lockfile is stable.
    - `pnpm build`. Confirm the shared package builds before the two services.
    - Confirm `pnpm install --frozen-lockfile` is a no-op on the committed lockfile.
    - _Requirements: 1.12, 1.13, 1.14, 2.1, 2.6, 2.7, 2.12_

- [ ] 8. The connection panel
  - [ ] 8.1 Create `.env.example`
    - Byte-identical to Appendix A of `requirements.md`. Comment-above-key form throughout: no line has text after a `KEY=`.
    - Every key empty. Every box labelled `[cloud]`, `[app]` or `[device]`, every backend-only secret marked SECRET, every P12.5 box marked P12.5, every policy default marked DEFAULT.
    - No OTA signing key beyond `OTA_SIGNING_KEY_ID`. No phone-companion push credential.
    - _Requirements: 6.1-6.7_
  - [ ] 8.2 Generate `tooling/fixtures/approved-panel.txt`
    - Copy `.env.example` byte for byte. Do **not** port Xelulu's approved panel and do not hand-write this file.
    - _Requirements: 6.8_
  - [ ] 8.3 Create `.env.local.example`
    - The reference's file with Parth's dev values: broker at the `emqx` Compose service, empty broker credentials, the audio URL at the `gateway` service, a `prt_` dev device id, a plainly-fake token, `APP_ENV=local`, `DEVICE_BIND_HOST=127.0.0.1`, and the three local ports.
    - Every value is a visible placeholder. This file is git-tracked, so Secret_Check will read it.
    - _Requirements: 6.13, 7.3_

- [ ] 9. Ported repo checks
  - [ ] 9.1 Port the ten check modules into `tooling/checks/`
    - `audio-retention.ts`, `contract-use.ts`, `contrast.ts`, `env-reads.ts`, `exact-version.ts`, `kebab-case.ts`, `panel.ts`, `secret-scan.ts`, `service-sources.ts`, `url-scan.ts`. Byte-identical apart from the rename rule and a `platform` header naming the Port_Origin.
    - Keep every one pure: text in, findings out, no filesystem access, no finding carrying a value or source text.
    - `contrast.ts` and `contract-use.ts` have no P0 target. Port them anyway and report them as present and unexercised.
    - _Requirements: 5.1, 5.2, 5.3, 5.7, 5.8, 5.9_
  - [ ] 9.2 Port `compose-acceptance.ts`, the EMQX bootstrap and the six fixtures
    - `tooling/compose/compose-acceptance.ts`, `tooling/emqx/auth-bootstrap.json` (with Parth's dev credential names), and `contract-use-banned.txt`, `contract-use-clean.txt`, `gateway-boundaries-banned.txt`, `gateway-boundaries-clean.txt`, `service-sources-banned.txt`, `service-sources-clean.txt`.
    - The bootstrap file must be a BOM-free single JSON array. Assert that, because EMQX fails closed silently on a BOM.
    - _Requirements: 5.4, 5.5, 15.3_

- [ ] 10. The layer check — the one new check
  - [ ] 10.1 Create `tooling/fixtures/banned-strings.json`
    - Document A-P section 8's two tiers, verbatim, as the design states them. Lowercase, non-empty, no string in both arrays.
    - **Tier A**: `parth`, `gmail`, `outlook`, `todoist`, `notion`, `spotify`, `sarvam`, `elevenlabs`, `whisperx`, `pyannote`, `googleapis`, `microsoft-graph`, `matter.js`.
    - **Tier B**: `council`, `ledger`, `mentor`, `rehearsal`, `proactivity`.
    - Do **not** add `focus`, `confirm`, `matter`, `brief`, `meeting`, bare `google` or bare `microsoft`. A-P took them out on purpose and a check that fires on them gets deleted.
    - Add a sibling comment in `layer.test.ts` (JSON cannot carry one) recording that the membership is A-P section 8's and that this file is replaced verbatim when A-P amends it - which has happened once already.
    - _Requirements: 4.9, 4.14, 4.17_
  - [ ] 10.2 Write `tooling/checks/layer.ts`
    - Pure module, same shape as `panel.ts`. Exports `parseLayerHeader`, `portOrigin`, `spans` and `checkLayer`, and the `LayerRule`, `LayerFinding`, `LayerHatch` and `BannedStrings` types.
    - Four rules in order: the header, the Port_Origin, the Import_Rule, the banned strings.
    - The Import_Rule reads specifiers only, with no filesystem resolution. A specifier is in-repository when it is relative or begins `@parth/`; everything else is ignored entirely.
    - `spans` splits the text into disjoint comment, string-literal and code spans covering every offset exactly. Conservative and line-based: a template literal with an embedded expression is one literal span; a regex literal is code.
    - Tier A matches case-insensitively over the raw text. Tier B matches whole-word inside identifier and literal spans only, never inside a comment span. Both apply to `platform` files only.
    - An Escape_Hatch on the line above a finding suppresses it and emits a hatch record. An empty reason suppresses nothing.
    - **A module specifier is never scanned by either tier** (design D15). Collect specifiers for the Import_Rule, then exclude their spans from the tier scan.
    - **Write out the Infrastructure_Exclusion list literally in this file** (design D16): exactly `eslint.config.mjs` and `tooling/eslint/parth-plugin.mjs`. A file on it is excluded from labelling entirely - no label, no tier, no Import_Rule. `tooling/eslint/no-cross-package-import.mjs` is not on it.
    - **This file must contain no banned string**, which is the reason the tiers are a fixture.
    - _Requirements: 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.12_
  - [ ] 10.3 Write the layer property tests (Properties 11-14)
    - Property 11: `spans` is a total disjoint partition, over random interleavings including unterminated forms at end of file. 300 cases.
    - Property 12: `parseLayerHeader` is total, never throws, and never guesses from a label word elsewhere in the line. 200 cases.
    - Property 13: the full tier × placement × case × layer cross-product — Tier A in all five placements for every case variant, Tier B in exactly the literal and whole-identifier placements and never in a comment or as a substring, and neither tier on a `contract` or `product` file. Plus 200 random strings.
    - Property 14: the full layer × specifier cross-product, with every external specifier a non-finding under every layer; plus 200 random hatch subsets asserting exactly `n − k` findings and `k` hatches.
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.10, 4.12_
  - [ ] 10.4 Write the layer real-repository assertions and the hatch cap
    - Load `banned-strings.json`, validate it, and fail the test if it is invalid or overlapping.
    - Run `checkLayer` over every git-tracked file: zero findings.
    - Assert every tracked `.ts`, `.tsx` and `.mjs` file has a layer header on line 1.
    - Sum the hatch records across every tracked file and fail above five, reporting the count and the paths.
    - Assert every Port_Origin resolves to a file that exists in `.reference/xelulu`. This is the only P0 test that reads the Reference_Repo, and it only checks that a path exists.
    - _Requirements: 4.1, 4.3, 4.11, 4.13, 4.14, 18.1, 18.2, 18.3_

- [ ] 11. ESLint config and the local plugin
  - [ ] 11.1 Port `eslint.config.mjs`, `no-cross-package-import.mjs` and `parth-plugin.mjs`
    - The rule file is byte-identical. `xelulu-plugin.mjs` becomes `parth-plugin.mjs` with `meta.name: "parth"`.
    - The root config keeps its load-time package-table scan, registers the plugin as `parth`, enables `parth/no-cross-package-import` as an error, and swaps `apps/parent-app/` for `apps/app/` in the ignore list while adding `.reference/`.
    - `pnpm lint` must pass **before** `pnpm build` has ever run, so no type-aware rule may be enabled.
    - _Requirements: 3.1, 3.2, 3.5, 3.8, 8.1_
  - [ ] 11.2 Write the dependency-direction property test (Property 9)
    - The full 5 × 5 × 4 × 3 cross-product of owner package, target package, import form and specifier style, under both path separators. Exactly one error iff the target is a different `apps/*` or `services/*` package.
    - _Requirements: 8.2, 8.3, 8.4_

- [ ] 12. Ported tooling tests
  - [ ] 12.1 Port the property tests for the ten checks (Properties 1-8, 10)
    - `panel-check.test.ts` (Properties 1-4), `secret-check.test.ts` (5), `file-names.test.ts` (6), `manifests.test.ts` (7), `env-reads.test.ts` (8), `url-scan.test.ts` (10), `service-sources.test.ts`, `audio-retention.test.ts`.
    - Paths change from `apps/parent-app` to `apps/app`. Nothing else changes.
    - `manifests.test.ts` gains one assertion: every pin that the Reference_Repo also declares equals the Reference_Repo's value.
    - _Requirements: 5.10, 1.9, 6.9-6.12, 7.3-7.8_
  - [ ] 12.2 Port the deterministic repository tests
    - `gitignore.test.ts`, `tsconfig.test.ts`, `lint-format.test.ts`, `placeholder.test.ts`, `supabase.test.ts`, `lan-bind.test.ts`, `compose-static.test.ts`, `compose-acceptance.test.ts`.
    - `compose-static.test.ts` gains the P0 assertions: exactly three services, no published port and no healthcheck on the gateway or the simulator, the EMQX tag, `restart: "no"`, the bootstrap file BOM-free.
    - `lan-bind.test.ts` asserts that only the two EMQX device-facing ports follow `DEVICE_BIND_HOST`.
    - _Requirements: 1.6, 3.5, 3.6, 7.1, 14.1-14.6, 15.1-15.9, 15.13, 15.14_
  - [ ] 12.3 Port `layout.test.ts` and `readme.test.ts` with their contract assertions removed
    - Remove every assertion that `packages/shared/src/gateway-contract/` exists or holds files, and replace it with the inverse: the directory **must not** exist, and neither must `hmi-contract`.
    - Add the P0 contract-absence assertions: no tracked file imports a path containing `gateway-contract` or `hmi-contract`; no tracked file outside the panel, the approved fixture, `.env.local.example`, `docker-compose.yml` and `README.md` contains `parth/` or `prt_`.
    - `readme.test.ts` gains the three Parth statements: the layer labels, the contract absence, and the read-only reference.
    - Record both narrowings in the Deferral Register with P1 as the restoring phase.
    - _Requirements: 9.4, 9.5, 9.7, 9.9, 17.1-17.9, 18.7_

- [ ] 13. Supabase scaffold
  - [ ] 13.1 Port `supabase/`
    - `config.toml`, `seed.sql` and `.gitignore` ported; `migrations/.gitkeep` and nothing else in `migrations/`.
    - Keep the first-line comment naming the Supabase CLI version. Every secret stays `env(NAME)`. No Parth table, column, policy or role.
    - _Requirements: 14.1-14.6, 7.7_

- [ ] 14. The Compose stack
  - [ ] 14.1 Port the two Dockerfiles
    - Base image tag equal to `.nvmrc` exactly. Filtered install per service, build, then `node dist/index.js`.
    - _Requirements: 15.6_
  - [ ] 14.2 Port `docker-compose.yml` with the four P0 changes
    - `name: parth`, the gateway dev credential renamed, a `prt_` dev device id default, EMQX at `5.8.9`.
    - **No published port and no healthcheck on the gateway or the simulator.** Keep `depends_on: emqx: condition: service_healthy` on both.
    - Drop the gateway `command` flags for surfaces that do not exist.
    - Keep every long comment verbatim: the BSL warning, the BOM warning, the `${VAR:-default}` reasoning, `env_file required: false`, the simulator's bare `${MQTT_USERNAME}`, `restart: "no"`, and loopback-only for everything not device-facing.
    - _Requirements: 15.1-15.9, 15.13, 15.14_
  - [ ] 14.3 Write the Compose acceptance test
    - `docker compose up --build -d` with no `.env`. Wait for EMQX healthy. Assert both service containers are `running`, each log holds exactly one `service_start` line, and no log line mentions a broker connection, a subscription, a publish or an audio socket.
    - `docker compose stop`: exactly one `service_stop` line from each, exit 0 from each, and no kill-after-timeout in Compose's output. Then `docker compose down -v`.
    - _Requirements: 15.10, 15.11, 15.12, 15.15_

- [ ] 15. Root README
  - [ ] 15.1 Write `README.md`
    - What Parth is in two sentences; the three layer labels and where the steering files live; prerequisites with the exact Node and pnpm versions and the Compose floor; the commands for install, build, lint, format check, test and `docker compose up`.
    - The `.env.local.example` copy step in both PowerShell and POSIX form, and the statement that `.env.example` is the panel and is never filled in place.
    - The EMQX licence warning and the dashboard-credential warning, kept from the reference.
    - That the wire contract does not exist yet, arrives at P1 from Document B-P, and that `packages/shared/src/gateway-contract/` is deliberately absent.
    - That `.reference/xelulu` is read-only and is never edited or imported from.
    - No secret and no Panel_Key value anywhere.
    - _Requirements: 17.1-17.9_

- [ ] 16. CI
  - [ ] 16.1 Port `.github/workflows/ci.yml`
    - Node from `.nvmrc`, pnpm from `packageManager`. In order: install frozen, lockfile-unchanged assertion, lint, format check, build, test, Compose acceptance. Fail on the first non-zero exit. No repository secret.
    - _Requirements: 16.1-16.6_

- [ ] 17. Full verification
  - [ ] 17.1 Walk the seven Done when rows
    - Clean clone. `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `docker compose up` then `stop`. Record each exit code.
    - Confirm no test is skipped, marked `todo` or weakened for a missing contract.
    - _Requirements: all of Done when_
  - [ ] 17.2 Confirm the contract is absent
    - `packages/shared/src/gateway-contract/` and `packages/shared/src/hmi-contract/` do not exist as directories. `@parth/shared` built namespace is empty. No tracked file names a B-P value or begins a literal with `parth/` or `prt_` outside the five allowed files.
    - _Requirements: 9.3-9.11_
  - [ ] 17.3 Check the Deferral Register for completeness
    - Walk `reuse.md`'s port manifest entry by entry. Each one must appear either in the P0 file tree or in the Deferral Register below. Report every entry that appears in neither — each is a P0 defect, not a documentation gap.
    - Report the hatch count and every hatch path.
    - _Requirements: 18.4, 18.5, 18.6, 18.7_

## Notes

- Every task is required. P0 has no optional tasks, because the gate is "a clean checkout is green" and there is no partial version of that.
- Each task references specific requirements for traceability.
- Property tests validate universal correctness properties; the deterministic repository tests validate fixed facts about this repository. Both are needed and neither substitutes for the other.
- The one genuinely new logic in P0 is `layer.ts`. It gets four of the fifteen properties, which is proportionate: it is the file that has to be right before any product code exists to mislabel.
- P0-F1 is resolved: A-P v1.3 carries the two tiers and `banned-strings.json` holds them verbatim. Every property is still written over "any string in tier A" rather than over a literal list, which is why the membership changing cost no test change. Keep it that way.
- No git commits without Omar's explicit request. Results go in the task result.
- The production broker licence decision is out of scope. The pin is 5.8.9 and does not move.
## Deferral Register

This is the complete list of everything in `reuse.md`'s port manifest that P0 does **not** deliver. It is the input to the P1 spec. A port-manifest entry appearing in neither the P0 file tree nor this table is a gap and a P0 defect (Req 18.5).

**Reason codes.** `CONTRACT` imports the contract · `B-P` needs Document B-P before it can be written · `SERVICE` needs a product service that does not exist yet · `SCHEMA` needs the Parth database schema · `HMI` needs the HMI token set · `DESIGN` needs the app design system · `NEVER` never ported.

**Status codes** for entries that *are* at P0 but incompletely: `PRESENT-UNEXERCISED` ported and committed, with no P0 target · `NARROWED` ported with reduced scope, restored later.

### packages/shared

| Path | Reason | Deferred to |
|---|---|---|
| `src/gateway-contract/` — all 14 modules and all 22 fixtures | B-P | **P1**. Not a port: written from Document B-P. The reference's directory is read for its *shape* only. |
| `src/hmi-contract/` | B-P | **P1**. New. Arrives with the contract. |
| `src/gateway-log/constants.ts` | CONTRACT | **P1**. Imports `../gateway-contract/index.js`. |
| `src/gateway-log/safe-issues.ts` | CONTRACT | **P1**. Imports `../gateway-contract/index.js`. |
| `src/gateway-log/stream.ts` | CONTRACT | **P1**. Imports both `../gateway-contract/` and `../domain/`. |
| `src/gateway-log/entries.ts` | CONTRACT | **P1**. Imports `../domain/index.js`, which gateway-log's own types need. |
| `src/gateway-log/contract-field-names.ts` | CONTRACT | **P1**. Contract-free in itself (imports only `zod`), but ships with its directory rather than alone. |
| `src/gateway-log/index.ts` | CONTRACT | **P1**. |
| `src/domain/` — `common`, `language`, `device`, `session`, `event`, `consent`, `retention`, `index` | SCHEMA | **P4**. Parth's own models, with the schema. |
| `src/domain/` — `child-profile`, `age-stage`, `grandma-asset`, `report`, `report-summary`, `activity`, `content-item`, `household`, `user` | NEVER | Child-product models. `reuse.md` do-not-port. Parth's `User`, `Household` and `Connection` are new at P4. |
| `src/mock-audio/index.ts` | SERVICE | **P5**. Needs the audio turn and the mock providers. |
| `src/starter-content/` — all 9 files | NEVER | Curated child content library. `reuse.md` do-not-port. |
| `test/arbitraries.ts`, `test/mutations.ts` | CONTRACT | **P1**. Generators over contract messages. |
| `test/codec-roundtrip`, `codec-rejection`, `codec-rules`, `fixtures`, `constants`, `contract-types`, `errors`, `topics`, `generator-coverage` | CONTRACT | **P1**. |
| `test/gateway-log.test.ts` | CONTRACT | **P1**. |
| `test/domain-types.test.ts` | SCHEMA | **P4**. |
| `test/mock-audio.test.ts` | SERVICE | **P5**. |
| `test/age-stage.test.ts`, `report-summary.test.ts`, `starter-content.test.ts` | NEVER | |

### services/gateway

| Path | Reason | Deferred to |
|---|---|---|
| `src/config.ts` topic fields and its `buildTopic` import | CONTRACT, **NARROWED** | **P1**. The file ships at P0 without `statusTopic`, `eventTopic`, `cmdTopic`, `ackTopic`. P1 adds them to the existing `buildConfig`. |
| `src/env.ts` topic-dependent reads | CONTRACT, **NARROWED** | **P1**. Reduced with `config.ts`. |
| `src/index.ts` (the reference's form) | CONTRACT | **P2**. Imports the MQTT connector, the audio listener and the operator listener. P0 ships a new `index.ts` that P2 replaces. |
| `src/gateway.ts` | CONTRACT + SERVICE | **P2** onward. Forty imports, almost all contract- or product-dependent. P0's `lifecycle.ts` is deleted when this lands. |
| `src/cli.ts` | SERVICE | **P2**. Imports `operator/transport/http-client.js`. |
| `src/log/gateway-log.ts` | CONTRACT | **P1**. Imports `@parth/shared` for Log_Entry types. |
| `src/mqtt/` — `ack-tracker`, `broker-session`, `command-sender`, `inbound-pipeline`, `mqtt-transport`, `transport/mqtt-js-connector` | CONTRACT | **P2**. |
| `src/audio/` — `audio-server`, `audio-transport`, `audio-turn`, `synthetic-frame`, `transport/ws-audio-listener` | CONTRACT | **P2**. Turn resume is added here at P2. |
| `src/devices/` — `dedupe-store`, `device-session`, `event-log-data`, `pairing-code`, `presence`, `registry` | CONTRACT | **P2**. Document C's session and Pairing_Code land with these. |
| `src/operator/` — all 8 files | CONTRACT | **P2**. The console at P3 reads this surface. |
| `src/brain/` — `turn-pipeline`, `turn-responder`, `turn-latency`, `voice-brain`, `filler` | SERVICE | **P5**. |
| `src/brain/providers/` — the 10 interface and adapter files and the mocks | SERVICE | **P5**. |
| `src/brain/providers/provider-declaration.ts`, `provider-gate.ts` | SERVICE | **P5**, as **adaptations**: both gain `data_region` and the residency boot check (A-P C19). |
| `src/brain/safety/` — `input-guard`, `output-guard`, `safe-text`, `forbidden-spans` | SERVICE | **P5**, as adaptations: the adult policy replaces the child policy. |
| `src/brain/safety/age-shape.ts` | NEVER | Deleted, not relaxed. |
| `src/brain/tools/` — `tool-catalogue`, `tool-router`, `device-action` | SERVICE | **P5**, as adaptations. Every write tool routes through `confirm/` and `ledger/`. |
| `src/brain/tools/content-library.ts`, `routines.ts` | NEVER | Child content and child routines. |
| `src/brain/state/` — `memory-store`, `transcript-store`, `conversation-view` | SERVICE | **P5**. `memory-store` gains provenance; `transcript-store` gains per-user retention. |
| `src/brain/state/alerts.ts`, `child-context.ts` | NEVER | |
| `src/brain/story/` — `story-session`, `word-of-the-day` | NEVER | |
| `src/content/` — `content-gate`, `content-store` | NEVER | |
| `src/grandma/` — `consent-store`, `grandma-call`, `grandma-store`, `household` | NEVER | The `household` concept returns at P4 as intercom scoping only, written new. |
| `src/routines/` — `routine-behaviours`, `routine-scheduler`, `routine-store`, `schedule-time` | SERVICE | **P6**, renamed `src/schedules/`. |
| `src/routines/charge-reminders.ts`, `play-time.ts` | NEVER | |
| `src/reports/` — `activity-store`, `report-builder` | SERVICE | **P8**, renamed `src/review/`: the owner's own weekly review, never a report about another person. |
| `test/` — all 56 test files except `start.test.ts`, `lifecycle.test.ts` and `config.test.ts` | CONTRACT / SERVICE | **P1-P8**, each with its subsystem. |
| `test/support/` — `fake-device`, `memory-broker`, `gateway-harness`, `operator-http`, `sse-reader`, `arbitraries`, `self-signed`, `no-remote-sockets`, `env-cases` | CONTRACT | **P2**. The fake device and the in-memory broker speak the wire format. |
| `test/support/` — `brain-harness`, `stub-providers`, `stub-responder` | SERVICE | **P5**. |
| `test/support/` — `content-stack`, `routine-stack` | NEVER / **P6** | `content-stack` never; `routine-stack` with `schedules/`. |

### services/simulator

| Path | Reason | Deferred to |
|---|---|---|
| `src/config.ts`, `src/env.ts` topic fields | CONTRACT, **NARROWED** | **P1**, with the gateway's. |
| `src/log/logger.ts` (the reference's form) | CONTRACT, **NARROWED** | **P1**. The reference's simulator logger imports `@xelulu/shared`; P0 ships a reduced no-import logger with the identical line format. |
| `src/index.ts` (the reference's form), `src/simulator.ts` | CONTRACT | **P2**. P0's `lifecycle.ts` and `index.ts` are deleted when these land. |
| `src/cli.ts` | SERVICE | **P2**. Imports `control/transport/http-client.js`. |
| `src/device/` — `ack-policy`, `command-handler`, `device-state`, `event-factory`, `heartbeat`, `outbox` | CONTRACT | **P2**, as adaptations: Parth events, the BT-call state machine, Matter acks, and capability flags in `hello`. |
| `src/mqtt/` — `device-link`, `mqtt-transport`, `transport/mqtt-js-connector` | CONTRACT | **P2**. |
| `src/audio/` — `audio-transport`, `audio-turn-client`, `synthetic-frame`, `test-utterances`, `transport/ws-audio-client` | CONTRACT | **P2**. |
| `src/control/` — `control-routes`, `panel-assets`, `request-guard`, `transport/http-client`, `transport/http-listener` | SERVICE | **P2**. The Control_Surface the panel talks to. |
| `panel/` — `index.html`, `panel.css`, `panel.js` | SERVICE | **P2**, as an adaptation: Parth's event buttons plus the mock HMI pane. |
| `src/hmi/` | B-P + HMI | **P2**. New. Renders the nine pages from the `hmi-contract`. |
| `test/` — all 19 files except `start.test.ts`, `lifecycle.test.ts`, `config.test.ts` | CONTRACT / SERVICE | **P2**. |
| `test/support/` — `fake-gateway`, `memory-broker`, `control-http`, `sim-harness`, `arbitraries`, `self-signed`, `env-cases` | CONTRACT | **P2**. |
| The simulator's unexercised Local_Mode null-credential rule | — , **PRESENT-UNEXERCISED** | **P2**. The rule is carried forward in `config.ts` at P0; nothing connects, so nothing exercises it. |

### apps/admin — the Parth Developer Console

| Path | Reason | Deferred to |
|---|---|---|
| `src/stream/` — `console-state`, `stream-client`, `use-console-stream` | CONTRACT | **P3**. |
| `src/log/entry-label.ts` | CONTRACT | **P3**. |
| `src/matrix/` — `test-matrix`, `matrix-state` | CONTRACT | **P3**. The runtime-derivation property ports exactly, over B-P's lists. |
| `src/control/` — `command-data`, `control-client` | CONTRACT | **P3**. |
| `src/devices/zone-activity.ts` | CONTRACT | **P3**, as an adaptation: touch zones become HMI page targets. |
| `src/components/` — `live-log`, `stream-status`, `device-health-table` | CONTRACT | **P3**. |
| `src/pages/` — `dashboard-page`, `devices-page`, `live-log-page`, `matrix-page`, `control-page` | CONTRACT | **P3**. |
| `src/routing/use-hash-page.ts` | SERVICE | **P3**. Contract-free, but there is nothing to route between at P0. |
| `src/hmi/`, `src/latency/` | B-P + HMI | **P3** (latency), **P3/P9** (HMI preview). New. |
| `vite-proxy.ts` | SERVICE | **P3**. Proxies the Operator_Surface, which does not exist until P2. |
| `test/` — all 19 files except one placeholder test | CONTRACT / SERVICE | **P3**. |
| `src/content/`, `components/content-editor`, `content-table`, `conversation-list`, `grandma-list`, `pages/content-page`, `conversation-page` | NEVER | Child-product console pages. |

### apps/app — the Parth app

| Path | Reason | Deferred to |
|---|---|---|
| `src/components/` — all 24 UI-kit files | DESIGN | **P11**. The design system and the reorganised screens land together; porting them now puts files in the repo that P11 moves. |
| `src/theme/theme.ts`, `tokens.json` | DESIGN | **P11**, as an adaptation: the same token shape, dark-first. |
| `src/lib/` — the Supabase client and env access | SCHEMA | **P4**. Needs a project and an anon key to be worth anything. |
| `src/character/` → `src/orb/` | DESIGN | **P11**. |
| `src/features/` — all 11 feature folders | NEVER as ports / DESIGN | Parth's nine areas are new at **P11**. The reference's folder convention and its `strings.ts` / `mock-*.ts` split are read, not ported. |
| `src/illustrations/` — all 6 files | NEVER | Child illustrations. |
| `src/lib/stores/`, `src/lib/battery.ts`, `mock-identity.ts`, `text.ts` | NEVER / **P11** | Child mocks never; the app's own stores are new at P11. |
| `app/` routes beyond `_layout.tsx` and `index.tsx` | DESIGN | **P11**. |
| `test/` — all 18 files except one placeholder test | DESIGN | **P11**. |
| `docs/design-system.md` | DESIGN | **P11**. |

### tooling

| Path | Reason | Deferred to |
|---|---|---|
| `checks/contract-use.ts` | **PRESENT-UNEXERCISED** | **P1**. Ported and committed at P0, called with an empty contract surface, so it reports nothing. P1 gives it the real surface. |
| `checks/contrast.ts` | **PRESENT-UNEXERCISED** | **P9**. Its real target is the HMI token set; secondarily the app theme at P11. At P0 it runs against its own fixtures only. |
| `checks/audio-retention.ts` | **PRESENT-UNEXERCISED** | **P7**. Fixture-only at P0; its real target is the meeting session. |
| `fixtures/contract-use-banned.txt`, `contract-use-clean.txt` | **PRESENT-UNEXERCISED** | **P1**. Committed at P0; their test does not exist until P1. |
| `test/contract-use.test.ts` | CONTRACT | **P1**. Reads `packages/shared/src/gateway-contract/index.ts` and imports value lists from the built shared package. |
| `test/matrix-derivation.test.ts` | CONTRACT + SERVICE | **P3**. Needs both the contract lists and the console's matrix. |
| `test/intern-guide.test.ts` | SERVICE | **P13**. Needs `docs/intern-integration-guide.md` and the console's matrix. |
| `test/no-direct-send.test.ts` | CONTRACT | **P2**. Asserts every send goes through `command-sender`. |
| `test/gateway-boundaries.test.ts` real-repository half | CONTRACT, **NARROWED** | **P2**. The fixture-driven half ships at P0 against the two `gateway-boundaries-*.txt` fixtures; the half that asserts boundaries between gateway modules waits for those modules. |
| `test/layout.test.ts` contract-directory assertions | CONTRACT, **NARROWED** | **P1**. At P0 the assertions are inverted: the directory must **not** exist. P1 restores the positive form. |
| `test/readme.test.ts` contract-directory assertions | CONTRACT, **NARROWED** | **P1**. Same inversion. |
| `test/contrast.test.ts` real-repository half | HMI, **NARROWED** | **P9**. Fixture half at P0; the token-set half at P9. |
| `test/style-props.test.ts` | DESIGN | **P11**. Asserts style-prop conventions across app components that do not exist at P0. |
| `compose-acceptance.ts` service-port and healthcheck expectations | **NARROWED** | **P2**. Narrowed to EMQX's ports plus "both services reach `running`" (P0-F3). P2 restores the published-port and healthcheck assertions when the Operator_Surface and the Control_Surface exist. |
| `eval/` — the promptfoo golden set | SERVICE | **P5**. New. |

### docs

| Path | Reason | Deferred to |
|---|---|---|
| `docs/intern-integration-guide.md` | SERVICE | **P13**. The template is read from the Reference_Repo; Parth's version is written when the matrix and the contract exist to describe. |

### Nothing is deferred from

The root toolchain, the ten ported check modules, `parth-plugin`, the EMQX bootstrap, the six ported fixtures, the Supabase scaffold, CI, the two Dockerfiles, `docker-compose.yml`, `.env.example`, `.env.local.example` and `README.md` are all delivered in full at P0.

## Waves

P0 runs as four waves. Each ends with a commit, a wave report and an update to `docs/founder-steps.md` in the same commit. Every wave report opens with how many DO NOW rows are outstanding, then the choices made in one line each, marked reversible.

| Wave | Tasks | Needs Docker | Gate at the end of the wave |
|---|---|---|---|
| **A - the machine and the skeleton** | 1-7, **11.1** | no | `pnpm install`, `pnpm build`, `pnpm lint` and `pnpm format:check` are all green on a clean clone; five packages exist and each builds; the contract directories do not exist |
| **B - the panel and the checks** | 8-10, 11.2, 12-13 | no | `pnpm test` is green; the layer check reports zero findings over every tracked file and the hatch count is zero |
| **C - the stack** | 14 | **yes** | `docker compose up` on a fresh clone with no `.env` brings EMQX to healthy and leaves both services `running`; `docker compose stop` gets one Shutdown_Line and exit 0 from each |
| **D - the seams** | 15-17 | no | README, CI, the seven Done when rows walked, and the Deferral Register confirmed complete |

**Task 11.1 (the ESLint flat config and `parth-plugin`) is pulled forward from wave B into wave A**, so that `pnpm lint` and `pnpm format:check` return a real exit code at wave A's boundary rather than failing for want of a config. Its property test, 11.2, stays in wave B with the other property tests. Reversible.

Wave C is the only one that needs a container runtime. If Docker is unavailable when the time comes, A, B and D still run and C is held - it blocks nothing else in P0 and nothing at all in P1.

The toolchain the waves run on is already in place: Node 24.21.0 at `.tools/node-v24.21.0-win-x64` (git-ignored, first on PATH), pnpm 10.34.6 via corepack, Docker Compose past the 2.24 floor. The README's prerequisites section records all three.

## Task Dependency Graph

The waves above are the commit boundaries. The graph below is the execution order inside them, and it is finer: wave A is graph waves 0-7, wave B is 8-9 plus task 10, wave C is 11, wave D is 10-13.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.2"] },
    { "id": 1, "tasks": ["1.1", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["3.1", "4.1", "5.1", "6.1", "8.1", "9.1", "9.2", "13.1"] },
    { "id": 4, "tasks": ["4.2", "8.2", "8.3", "10.1", "11.1", "14.1"] },
    { "id": 5, "tasks": ["4.3", "10.2", "14.2"] },
    { "id": 6, "tasks": ["4.4"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["3.2", "4.5", "10.3", "11.2", "12.1"] },
    { "id": 9, "tasks": ["4.6", "10.4", "12.2", "12.3"] },
    { "id": 10, "tasks": ["15.1"] },
    { "id": 11, "tasks": ["14.3", "16.1"] },
    { "id": 12, "tasks": ["17.1"] },
    { "id": 13, "tasks": ["17.2", "17.3"] }
  ]
}
```
