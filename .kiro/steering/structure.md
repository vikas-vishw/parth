---
inclusion: always
---
# Parth: Repo structure

```
parth/
├─ .kiro/
│  ├─ steering/          product.md, tech.md, structure.md, safety.md, reuse.md
│  └─ specs/             one folder per spec, one active at a time
├─ .reference/
│  └─ xelulu/            READ-ONLY clone of the sibling product. Never edited, never
│                        imported from, git-ignored. The source of every port.
├─ apps/
│  ├─ app/               @parth/app — Expo (TS) app, Expo Router, dark-first
│  │  ├─ app/            routes: (onboarding), (tabs)/today|meetings|council|research,
│  │  │                  connections, rules, ledger, privacy, device
│  │  ├─ src/components/ UI kit (NativeWind + react-native-reusables)
│  │  ├─ src/features/   today, meetings, council, mentor, research, drafting,
│  │  │                  connections, rules, ledger, privacy, device, setup, shell
│  │  ├─ src/orb/        Rive wrappers and expression mapping
│  │  ├─ src/lib/        supabase client, env access, i18n
│  │  ├─ src/theme/      tokens.json, theme.ts
│  │  ├─ assets/         fonts, .riv (licence noted per file)
│  │  └─ test/
│  └─ admin/             @parth/admin — the Parth Developer Console. Internal only.
│     ├─ src/stream/     Operator_Stream client
│     ├─ src/log/        live log entry labelling
│     ├─ src/matrix/     Test_Matrix, derived from the contract at runtime
│     ├─ src/hmi/        HMI page preview, rendered from the hmi-contract
│     ├─ src/control/    device control surface
│     ├─ src/latency/    per-turn latency panel
│     ├─ src/pages/      dashboard, devices, live-log, matrix, control, hmi, latency
│     └─ test/
├─ services/
│  ├─ gateway/           @parth/gateway — Node TS. MQTT control plane + audio WS + brain.
│  │  ├─ src/            config, env, ids, clock, backoff, crash, deadlines, listen-host
│  │  ├─ src/log/        gateway log, logger (redaction lives here)
│  │  ├─ src/mqtt/       broker session, transport, inbound pipeline, command sender, acks
│  │  ├─ src/audio/      per-turn WSS, Opus framing, audio turns, turn resume
│  │  ├─ src/devices/    registry, presence, device session, pairing code, dedupe
│  │  ├─ src/operator/   the operator surface the console reads
│  │  ├─ src/brain/      turn pipeline, providers/, safety/, tools/, state/
│  │  ├─ src/vault/      envelope-encrypted OAuth token store
│  │  ├─ src/connections/ oauth/, google/, microsoft/, notion/, todoist/, spotify/
│  │  ├─ src/confirm/    the confirmation layer
│  │  ├─ src/ledger/     the Action Ledger
│  │  ├─ src/proactivity/ the interruption budget
│  │  ├─ src/briefs/ calendar/ mail/ tasks/ prep/ admin/
│  │  ├─ src/meetings/   consent, long-form session, transcription, summary, action items
│  │  ├─ src/research/ drafting/ council/ mentor/ rehearsal/ student/
│  │  ├─ src/matter/ btcall/ intercom/
│  │  ├─ src/screen/     the HMI page-and-variable pusher
│  │  ├─ src/schedules/  brief scheduler, follow-up checks, work timers, wind-down
│  │  ├─ src/review/     weekly review and focus stats
│  │  └─ test/           incl. test/support/ (harnesses, memory broker, test clock, arbitraries)
│  └─ simulator/         @parth/simulator — a peer of the device, not a test double
│     ├─ src/device/     state, heartbeat, events, command handling, ack policy, outbox
│     ├─ src/mqtt/ src/audio/ src/control/
│     ├─ src/hmi/        mock HMI driven by the same hmi-contract
│     ├─ panel/          control panel UI (screen_touch, tap_zone, bt_call, focus, offline)
│     └─ test/           incl. test/support/ (fake gateway, in-memory broker, clock, arbitraries)
├─ packages/
│  └─ shared/            @parth/shared
│     ├─ src/gateway-contract/  layer `contract`. Document B-P types + Zod + codec +
│     │                        golden fixtures. ARRIVES AT P1. Empty until B-P is signed off.
│     ├─ src/hmi-contract/     layer `contract`. Page ids, page variables, target names,
│     │                        the HMI token set. Arrives at P1 with B-P.
│     ├─ src/gateway-log/      Gateway_Log types, constants, Safe_Issue helper (not the contract)
│     ├─ src/domain/           User, Device, Connection, Meeting, Transcript, ActionItem,
│     │                        Goal, DecisionEntry, CouncilMemo, MatterDevice, Rule,
│     │                        LedgerEntry, MemoryItem, Consent, Session, Event
│     ├─ src/mock-audio/       Mock_Audio_Codec for test utterances (deleted with the mocks)
│     └─ src/index.ts
├─ supabase/
│  ├─ migrations/        SQL, RLS on every table
│  ├─ functions/         Edge Functions (Deno TS)
│  ├─ seed.sql
│  └─ config.toml
├─ docs/                 the source documents (A-P, B-P when it lands, C, the spec,
│                        the catalogue, the BOM, design/)
├─ tooling/              repo checks, the local ESLint rule, EMQX bootstrap, eval set, fixtures
│  ├─ checks/            contract-use, env-reads, exact-version, kebab-case, layer, panel,
│  │                     secret-scan, service-sources, url-scan, contrast, audio-retention
│  ├─ eslint/            no-cross-package-import.mjs, parth-plugin.mjs
│  ├─ compose/           compose-acceptance.ts
│  ├─ emqx/              auth-bootstrap.json
│  ├─ eval/              the promptfoo golden set
│  ├─ fixtures/          approved-panel.txt and the check fixtures
│  └─ test/              the repo-check test suite, incl. layer.test.ts
├─ .github/workflows/    CI
├─ .env.example          the single connection panel
├─ .env.local.example    dev-only local defaults, tracked, never real values
├─ docker-compose.yml    EMQX 5.8.9 + gateway + simulator for local dev
├─ package.json, pnpm-workspace.yaml, tsconfig.base.json, tsconfig.test.json,
│  vitest.config.ts, eslint.config.mjs, .prettierrc.json, .prettierignore,
│  .npmrc, .nvmrc, .dockerignore, .gitignore
└─ README.md
```

## Rules

### The three layers (A-P §8, C14)
Every file carries a one-line header comment whose **first token is its layer**. There are three layers, not two.

| Layer | May contain | May import from |
|---|---|---|
| **`contract`** | the product's wire values, and nothing else about the product | `contract` only |
| **`platform`** | no Parth feature, no provider name, no product string | `contract`, `platform` |
| **`product`** | anything that knows what Parth *is* | all three |

`contract` exists because `topics.ts` has to contain the literal string `parth` while no other non-product file may. Two labels made the check un-writable; three make it one regex.

**Examples of each:** `contract` is `packages/shared/src/gateway-contract/**` and `packages/shared/src/hmi-contract/**`, and nothing else. `platform` is transport, session, codec machinery, repo checks, the operator stream, the simulator's envelope handling, the log plumbing. `product` is services, tools, prompts, screens, the app, the console pages.

### The header format
```
// contract: MQTT topic builder and parser. Four topics, parth/{device_id}/{status|event|cmd|ack}.
// platform: per-turn audio WebSocket listener. Ported from .reference/xelulu/services/gateway/src/audio/transport/ws-audio-listener.ts
// product: the confirmation layer — nothing irreversible reaches a provider without passing here.
```
A ported file names its origin on the same line. See `reuse.md`.

**One exception, written out so it cannot grow.** Where a tool requires its own pragma on line 1,
the layer label takes line 2. The only such pragma in this repository is Vitest's environment
selector, `// @vitest-environment <env>`, which Vitest reads only from the first line. The layer
check accepts a label on line 2 **only** when line 1 matches that exact pragma form, and
`tooling/test/layer.test.ts` asserts that the accepted pragma list has exactly one entry.

### The layer check (A-P section 8)
`tooling/checks/layer.ts` fails the build when a `platform` file imports from a `product` path, or contains a banned string.

**The import rule is the real one**: a platform file reaching into `product/` is the actual failure mode. The string list is the backstop, and it is **two-tiered** (C20), because a list of ordinary English words would fire constantly and be deleted within a week.

**Tier A - anywhere in the file, code and comments, case-insensitive.** These cannot occur innocently:

`parth`, `gmail`, `outlook`, `todoist`, `notion`, `spotify`, `sarvam`, `elevenlabs`, `whisperx`, `pyannote`, `googleapis`, `microsoft-graph`, `matter.js`

**Tier B - identifiers and string literals only, whole-word, never comments.** These are product nouns that also read as ordinary words in prose:

`council`, `ledger`, `mentor`, `rehearsal`, `proactivity`

**Deliberately not on either list:** `focus` (a DOM method and a React concept), `confirm` (a browser API and an ordinary verb), `matter` (as in "does not matter"), `brief`, `meeting`, and bare `google` or `microsoft` (they appear in URLs, licence notices and ported comments). The import rule catches every real leak these would have caught.

Both tiers apply to `platform` files only. A `contract` file and a `product` file are not checked against either.

The membership lives in `tooling/fixtures/banned-strings.json`, read by `layer.ts` the way `approved-panel.txt` is read by `panel.ts`, so an amendment to A-P section 8 is a one-file edit and no code change.

**The specifier rule.** A **module specifier is never scanned by either tier.** The quoted string in an `import`, `export … from`, `import()` or `require()` is governed by the import rule and nothing else. This is a reading of A-P section 8 rather than an exemption from it: section 8 already separates specifiers from content when it says the layer rules govern imports inside this repository only, and that the contract layer importing Zod is not a violation. Without it, `@parth/shared` - the workspace's own scope, which appears in every cross-package import - would trip Tier A in every platform file that uses the contract from P2 onward.

**Infrastructure carries no layer label at all.** Repo infrastructure is not a package, and the rule extends to the layer check: two infrastructure files carry the ESLint namespace, which must equal the package scope, so they are **excluded from layer labelling entirely** - the same way `package.json` and `docker-compose.yml` are. No label, no tier, no import rule.

The exclusion list is **exactly these two paths**, written out in `tooling/checks/layer.ts` and asserted in `tooling/test/layer.test.ts`:

- `eslint.config.mjs`
- `tooling/eslint/parth-plugin.mjs`

**The test asserts the list's length as well as its contents**, so a third entry fails the build and the list cannot grow without someone noticing.

`tooling/eslint/no-cross-package-import.mjs` is **not** on it. It names no package and receives the package table as rule options, so it is labelled `platform` like the ten checks beside it.

**Excluded is not the same as `product`.** Infrastructure is granted nothing: neither of those two files may import from a `product` path. The `product` label would have granted exactly that right, which is why it was the wrong label even where it produced the right outcome.

**The escape hatch.** `// layer-check-allow: <reason>` on the line above, and `tooling/test/layer.test.ts` **caps the number of them in the repository at five**, so the hatch cannot quietly become the rule. If a sixth is genuinely needed, that is a conversation, which is the point.

**One consequence worth stating.** Tier A scans comments, so a `platform` file may not say "Parth" even in prose. A ported platform file's header therefore reads `// platform: <what it does>. Ported from .reference/xelulu/...` with no product name in it. That is the rule working, not the rule being awkward.

After P5, when the shared shape has been seen twice rather than guessed once, extraction is a mechanical move of the `contract` and `platform` files into a `companion-platform` package that both products depend on.

### The contract has a single home, and it arrives whole
- Document B-P types exist **only** in `packages/shared/src/gateway-contract/`. The HMI page-and-variable contract exists **only** in `packages/shared/src/hmi-contract/`.
- **No file in either directory is created or edited before Document B-P is signed off.** They arrive in one piece at P1. Nothing is pre-created or stubbed - not `topics.ts`, not `constants.ts`, not a placeholder `index.ts`.
- Both are frozen once they land. Changing either requires a `proto_ver` bump and sign-off from both the software and the hardware sides. No field is invented, no enum is renamed, no wire format is "improved".
- Nothing outside them declares a contract type, writes a `parth/` topic literal, hand-writes a list of wire values, or imports Zod. `tooling/checks/contract-use.ts` proves it.

### Dependencies point one way
- `apps/*`, `services/*` and `supabase/functions` may import `@parth/shared`.
- Nothing imports from `apps/` or `services/`. Services never import each other. The console never imports the gateway, so when it needs the same answer it derives it the same way from the contract.
- Nothing anywhere imports from `.reference/`.
- `tooling/eslint/no-cross-package-import.mjs`, shipped as `parth-plugin`, enforces this at lint time. The layer table above is the second, finer rule on top of it.

### Repo infrastructure is not a package
`tooling/` and `.github/workflows/` live at the repo root. They are infrastructure, not workspace packages, and carry no `package.json`.

### The app never talks MQTT
`apps/app` talks only to Supabase, over HTTPS and Realtime. Device commands go app → Supabase → gateway → MQTT. The app receives only `EXPO_PUBLIC_*` values.

### The console: path and name deliberately differ
- It lives at **`apps/admin`**, package `@parth/admin`, **for port fidelity with the reference repository** - the port is a straight copy rather than a move, and every ported import path and test still resolves.
- It is called the **Parth Developer Console** in the interface, in documents and in conversation.
- It reads its port from **`CONSOLE_PORT`**.
- **The mismatch between the path and the name is deliberate and is not to be "fixed".** Renaming the directory would re-cost the port for nothing.
- It exposes connection state, raw device logs, the test matrix, the HMI preview and the latency panel. None of that may ever appear in `apps/app`, and it is never shipped to a customer.

### The simulator is a peer of the device
It speaks the wire format only, with no shortcuts into gateway internals, and it renders the nine HMI pages from the same `hmi-contract` the gateway pushes and the console previews. A mock pane that does not match the display teaches the wrong thing.

### Naming
- Files and directories use **kebab-case**. `tooling/checks/kebab-case.ts` enforces it.
- Types use **PascalCase**.
- Wire fields use **snake_case, exactly as Document B-P writes them**. Never camelCase a wire field on the way in or out; the contract's spelling is the contract.
- DB tables use **snake_case plurals**.
- Env keys use `SCREAMING_SNAKE_CASE` and are declared in `.env.example` before they are read anywhere.

### Domain model notes
- **One owner per device.** The owner is a `User`. There is no `ChildProfile`, no `age_stage`, no guardian role and no parent/caregiver/grandma split - see `reuse.md` §do not port.
- Every user-scoped row carries `user_id` and is protected by RLS by user. `household_id` exists from P4 and **scopes the intercom only** - it is never a role boundary and grants nobody sight of another person's data.
- `Connection` holds `provider`, `scopes[]`, `permission_level` (`read|draft|act`, default `draft`), `status` and `last_sync`. The token itself lives in the vault, never in the row as plaintext.
- `LedgerEntry` is append-only: the proposal, the exact diff, who confirmed, when, the outcome, and the undo handle if the provider offers one.
- `MemoryItem` carries provenance (where it came from, when) and is deletable one at a time.
- `Transcript` carries its own retention policy. `Meeting` carries `recording_consent`.
- **Policy numbers live here, per user, not in env.** The confirmation timeout, the undo window, the proactivity budget and every retention number are user rows from P4. The env panel holds only the default a fresh user starts with. See `safety.md`.

### Tests sit next to their package
`test/` inside each package, with shared harnesses in `test/support/`. Contract fixtures live in `packages/shared/src/gateway-contract/fixtures/`. The repo-check suite lives in `tooling/test/`.

### Where a new subsystem goes
A new product capability is a directory under `services/gateway/src/`, not a new service. New services are only created when something must scale or deploy separately - and the one declared candidate, `services/transcription`, is not built now.
