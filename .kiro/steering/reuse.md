---
inclusion: always
---
# Parth: Reuse policy (always on)

## The rule
**Check `.reference/xelulu` before writing any file.** The single largest risk in this build is regenerating something that already exists there. That is why this is steering and not a line in a prompt.

**Reuse order, every time:**
1. Port from `.reference/xelulu`.
2. Then a named project from the approved list below.
3. Then new code.

Three hard constraints:
- **`.reference/` is read-only.** Never edit, move, delete or add a file inside it. Never import from it either; a port is a copy into this repo's tree.
- **A ported file names its origin in its header comment**, on the same line as its layer label:
  `// platform: ack tracking for in-flight commands. Ported from .reference/xelulu/services/gateway/src/mqtt/ack-tracker.ts`
- **When you port, say which file it came from** in the task summary too, not only in the header.

**The rename rule.** When porting as-is, change these and *nothing else*:
| From | To |
|---|---|
| `@xelulu/*` | `@parth/*` |
| `xelulu-plugin` / `xelulu/` ESLint rule prefix | `parth-plugin` / `parth/` |
| device id prefix `xlu_` | `prt_` |
| `name: xelulu` (Compose), `xelulu_gateway_dev` | `parth`, `parth_gateway_dev` |
| `Xelulu` in a comment or doc string | `Parth` |

The topic root is **not** on that list, because the file that holds it is not ported - see the next section.

Do not reformat, do not rename variables, do not "improve" logic, do not change a test's assertions. A port whose diff is larger than the rename rule is an adaptation, and it needs to be called out as one.

---

## The three layers (A-P §8, C14)
Every file carries a one-line header comment whose first token is its layer: **`contract`**, **`platform`** or **`product`**.

| Layer | May contain | May import from |
|---|---|---|
| `contract` | the product's wire values, and nothing else about the product | `contract` only |
| `platform` | no Parth feature, no provider name, no product string | `contract`, `platform` |
| `product` | anything that knows what Parth *is* | all three |

When you port a file, **decide its layer before you copy it**, and label it. Almost everything in the port-as-is list below is `platform`. Nothing ported is `contract`, because the contract is not ported at all.

**The layer check is two rules, not one.** The **import rule is primary**: a `platform` file importing from a `product` path fails, and a `contract` file importing from anything but `contract` fails. The **banned-string list is the backstop**, and it is two-tiered (A-P section 8, C20).

**Tier A - anywhere in the file, code and comments, case-insensitive:** `parth`, `gmail`, `outlook`, `todoist`, `notion`, `spotify`, `sarvam`, `elevenlabs`, `whisperx`, `pyannote`, `googleapis`, `microsoft-graph`, `matter.js`.

**Tier B - identifiers and string literals only, whole-word, never comments:** `council`, `ledger`, `mentor`, `rehearsal`, `proactivity`.

**Deliberately not on either list:** `focus`, `confirm`, `matter`, `brief`, `meeting`, and bare `google` or `microsoft`. They are DOM methods, browser APIs and ordinary English, and they appear in URLs, licence notices and ported comments. A check that fires on them is a check that gets deleted. The import rule catches every real leak they would have caught.

**The layer rules govern imports inside this repository only.** An external package is governed by the dependency rules, so the `contract` layer importing Zod is not a violation, and neither is a `platform` file importing `mqtt` or `ws`. A **module specifier is never scanned by either tier**, which is what keeps `@parth/shared` from tripping Tier A in every platform file that uses the contract.

**Two files are infrastructure and carry no layer label at all**: `eslint.config.mjs` and `tooling/eslint/parth-plugin.mjs`. Their content is the ESLint namespace and it must equal the package scope. Excluded means granted nothing - neither may import from a `product` path. The list is closed at exactly two, written out in `tooling/checks/layer.ts` and length-asserted in `tooling/test/layer.test.ts`. `tooling/eslint/no-cross-package-import.mjs` is not on it and is labelled `platform`. See `structure.md`.

**What this means when you port.** Tier A scans comments, so a ported `platform` file's header must not say "Parth": it reads `// platform: <what it does>. Ported from .reference/xelulu/...`. Tier B does not scan comments, so a ported comment that mentions a vendor in prose is fine - and the vendor names that are on Tier A (`sarvam`, `elevenlabs`, `gmail`, `outlook`, `notion`, `todoist`, `spotify`, `whisperx`, `pyannote`, `googleapis`, `microsoft-graph`) are not words that occur in a platform file innocently. The escape hatch is `// layer-check-allow: <reason>` on the line above, capped at **five uses across the whole repository** by `tooling/test/layer.test.ts`. A sixth is a conversation, not an edit.

---

## The contract is not ported. It arrives whole, at P1, from Document B-P.
`packages/shared/src/gateway-contract/` is **out of the port-as-is group entirely.**

- **No file in that directory is created or edited before Document B-P is signed off.** Not one. The whole directory arrives in one piece at P1, written from B-P.
- **`topics.ts` is not ported and `TOPIC_PREFIX` is not changed.** The file does not exist yet. When it arrives at P1 its prefix is whatever B-P says it is.
- **`constants.ts` is not pre-created.** Neither is a placeholder `index.ts`, an empty `fixtures/` directory, or a stub schema.
- The reference's contract directory is **read for its shape** - the export discipline, the `ParseResult` / `ContractError` pattern, the codec's round-trip and rejection design, how fixtures sit beside the schemas - and that shape is reproduced at P1. Reading it is not porting it.
- `packages/shared/src/hmi-contract/` is new, and arrives at P1 with B-P for the same reason.

Everything the contract *machinery* taught us is carried as a design, not as a file. That is the whole point: a pre-created `topics.ts` with a guessed prefix is exactly the drift the frozen contract exists to prevent.

---

## Port as-is
Layer `platform` unless noted.

### Root toolchain
`package.json` (scripts and pins), `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.test.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.npmrc`, `.nvmrc`, `.dockerignore`, `docker-compose.yml`, `.env.local.example`.

### Repo checks and CI
All of `tooling/checks/` - `contract-use.ts`, `env-reads.ts`, `exact-version.ts`, `kebab-case.ts`, `secret-scan.ts`, `service-sources.ts`, `url-scan.ts`, `panel.ts`, `contrast.ts`, `audio-retention.ts`. Plus `tooling/compose/compose-acceptance.ts`, `tooling/eslint/no-cross-package-import.mjs`, `tooling/eslint/xelulu-plugin.mjs` (becomes `parth-plugin.mjs`), `tooling/emqx/auth-bootstrap.json`, all of `tooling/test/`, and `.github/workflows/ci.yml`.

`tooling/fixtures/` holds seven files. **Six port unchanged**: `contract-use-banned.txt`, `contract-use-clean.txt`, `gateway-boundaries-banned.txt`, `gateway-boundaries-clean.txt`, `service-sources-banned.txt`, `service-sources-clean.txt`. **`approved-panel.txt` is not ported** - it is *generated* from Parth's own `.env.example`, because its whole purpose is to be a byte-for-byte copy of this product's panel. Porting Xelulu's would guarantee a failing check. A new seventh fixture, `banned-strings.json`, carries the two-tier layer list.

`tooling/checks/layer.ts` and `tooling/test/layer.test.ts` are **new** - the reference has no layer rule to port.

### Gateway log
`packages/shared/src/gateway-log/` - but **not at P0**. Four of its six files (`constants.ts`, `safe-issues.ts`, `stream.ts`, and `entries.ts` through `domain/`) import `../gateway-contract/index.js`, so the directory cannot compile until the contract lands. It ports **at P1, with the contract**. Only `contract-field-names.ts` is contract-free, and it ports with the rest rather than alone.

### Gateway plumbing
`services/gateway/src/` - `backoff.ts`, `clock.ts`, `config.ts`, `config-error-writer.ts`, `crash.ts`, `deadlines.ts`, `env.ts`, `ids.ts`, `listen-host.ts`, `cli.ts`, `gateway.ts`, `index.ts`, all of `log/`, all of `mqtt/` (`ack-tracker`, `broker-session`, `command-sender`, `inbound-pipeline`, `mqtt-transport`, `transport/mqtt-js-connector`), all of `audio/` (`audio-server`, `audio-transport`, `audio-turn`, `synthetic-frame`, `transport/ws-audio-listener`), all of `devices/` (`dedupe-store`, `device-session`, `pairing-code`, `presence`, `registry`, `event-log-data`), all seven files of `operator/`.

### Brain skeleton
`services/gateway/src/brain/` - `turn-pipeline.ts`, `turn-responder.ts`, `turn-latency.ts`, `voice-brain.ts`, `filler.ts`, and `providers/` **except** `provider-declaration.ts` and `provider-gate.ts`, which are adaptations and are listed as such below.

### Simulator
Effectively all of `services/simulator/` - `src/` (device, mqtt, audio, control), `panel/`, and the whole of `test/support/`: the fake gateway, the in-memory broker, the test clock and the arbitraries.

### Console
`apps/admin/src/` - `stream/`, `log/`, `matrix/`, `routing/`, `components/live-log`, `components/stream-status`, `components/device-health-table`, `pages/dashboard-page`, `pages/devices-page`, `pages/live-log-page`, `pages/matrix-page`, `pages/control-page`, `styles.css`, `vite.config.ts`, `vite-proxy.ts`. The directory stays `apps/admin` for port fidelity; the product name is the Parth Developer Console.

**`apps/admin/src/matrix/test-matrix.ts` deserves its own line.** It builds every row at runtime by walking contract lists out of the shared package plus two fixed rows that name no wire value, so a contract list that gains a member gains its row with no edit - and `tooling/test/matrix-derivation.test.ts` proves it. **Port that property exactly.** For Parth the lists are B-P's, the zone list becomes HMI page targets, and a capability a device does not declare drops its rows out of the run. That property is what makes the open hardware items cost nothing.

### App shell
`apps/parent-app/` into `apps/app/` - the Expo Router setup, `src/theme/`, the `src/components/` UI kit, `src/lib/` Supabase client and env access, `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `nativewind-env.d.ts`, the jest-expo config.

### Documents
`docs/C-pairing-and-device-session.md` (already copied into `docs/`; reused unchanged except the topic root). `docs/intern-integration-guide.md` as the template for Parth's.

---

## Adapt - same shape, Parth content
A port plus a content change. Call out both.

| Area | What changes |
|---|---|
| `brain/safety/` | `input-guard`, `output-guard`, `safe-text`, `forbidden-spans` keep their shape; the policy becomes the adult model in `safety.md`. **`age-shape.ts` is deleted, not relaxed.** |
| `brain/providers/provider-declaration.ts`, `provider-gate.ts` | gain `data_region`; the gate refuses to start the gateway on a residency violation, and a provider with no stated region does not load (C19) |
| `brain/tools/` | `tool-catalogue` and `tool-router` keep the allow-listed-internal-tools discipline; the catalogue becomes Parth's, and **every write tool routes through the confirmation layer and the Ledger**. `device-action` gains the Parth commands. |
| `brain/state/` | `memory-store` gains provenance and per-item deletion; `transcript-store` gains a retention policy read per user from P4; `conversation-view` ports as-is. |
| `routines/` → `schedules/` | the brief scheduler, follow-up checks, healthy-work timers, wind-down. `charge-reminders` and `play-time` go. |
| `reports/` → `review/` | weekly review and focus stats instead of a parent's activity report. |
| `packages/shared/src/domain/` | Parth's models. `ChildProfile`, `age-stage`, `grandma-asset`, `report` go; `Connection`, `Meeting`, `Transcript`, `ActionItem`, `Goal`, `DecisionEntry`, `CouncilMemo`, `MatterDevice`, `Rule`, `LedgerEntry`, `MemoryItem` arrive. Policy numbers live here, per user. |
| `.env.example` | the ported structure, extended per A-P §11, in **comment-above-key form** (C15), with **no OTA signing key** and **no box for an unbuilt feature** (C16). The Parth panel becomes the new `tooling/fixtures/approved-panel.txt`. |
| `tooling/checks/contrast.ts` | same check, pointed at the HMI token set for a 480x320 panel at arm's length, Latin metrics only while the face is English-only (C17). |
| `README.md`, steering | rewritten for Parth. The four steering files become five (`reuse.md`). |
| Simulator panel | the Xelulu control panel's shape, with Parth's event buttons and a mock HMI pane driven by the real page contract. |

---

## Build new - no Xelulu equivalent
This is the product. Nothing in the reference repo resembles it, so do not go looking.

**`services/gateway/src/`**: `connections/` (`oauth/`, `google/`, `microsoft/`, `notion/`, `todoist/`, `spotify/`, incremental scopes), `vault/`, `confirm/`, `ledger/`, `proactivity/`, `briefs/`, `calendar/`, `mail/`, `tasks/`, `prep/`, `meetings/`, `research/`, `drafting/`, `council/`, `mentor/`, `rehearsal/`, `student/`, `matter/`, `btcall/`, `screen/`, `admin/`, `intercom/`.

**Also new**: `packages/shared/src/gateway-contract/` and `packages/shared/src/hmi-contract/` (both written from B-P at P1, not ported), `apps/app/` features and screens, `tooling/eval/` (the promptfoo golden set), `tooling/checks/layer.ts` and `tooling/test/layer.test.ts`, and the Supabase migrations for the Parth schema.

**Declared but not now**: `services/transcription/` (Python, WhisperX), behind the `TranscriptionProvider` interface. Do not create it.

---

## Do not port - ever
Delete these concepts rather than relax them. If a task seems to need one, the task is wrong.

- Cry detection, and anything downstream of it.
- `move` and `gesture` commands, the body controller, and motion events.
- The `touch`-zone event. Parth has `screen_touch` and `tap_zone` instead.
- `age-shape.ts` and the whole age-stage model (`tiny|little|explorer|maker`).
- Verifiable parental consent, and the parent / caregiver / grandma role split.
- The Grandma subsystem: `grandma/`, `grandma-asset`, grandma calls, grandma recordings.
- The curated `starter-content/` library (Panchatantra, Jataka, Tenali Raman, Akbar-Birbal, songs, words, routines).
- The "no open internet for the child" rule, and content-library-only answers.
- `led` effects for a pixel-LED visor.
- `reports/` as a parent's activity report on another person.
- `ChildProfile`, and any household role that can see another person's data.

Parth has one owner per device, an open capability surface, and a confirmation layer in place of a guardian.

---

## Approved open-source list
When a project here fits, clone or install it; do not generate an equivalent. Every licence is re-checked in the phase that introduces it - see `tech.md`.

| Need | Project | Licence | What to do |
|---|---|---|---|
| Monorepo, toolchain, checks, CI, MQTT plumbing, audio WS, gateway log, operator surface, simulator, console | the Xelulu repo in `.reference/` | ours | **port** - the largest single saving in the build |
| Firmware base, Opus over WSS, OTA, device registry patterns | ElatoAI | MIT | reference for us, the intern clones it |
| MQTT broker | EMQX **5.8.9** | Apache-2.0 (**5.9+ is BSL - stay on 5.8.9**) | install, same pin |
| MQTT client | MQTT.js | MIT | install |
| Auth, Postgres with RLS, storage, realtime | Supabase | Apache-2.0 | install |
| Tool-calling loop, streaming, provider switching | Vercel AI SDK | Apache-2.0 | install |
| Multi-step research with sources | open deep research | MIT | clone and strip |
| Transcription, word timestamps, speaker separation | WhisperX | BSD-2-Clause | clone later, as the self-host service |
| Fast Whisper backend | faster-whisper | MIT | install under WhisperX |
| VAD, diarisation models | pyannote-audio | MIT, **models gated by a Hugging Face agreement** | install, accept the terms knowingly |
| Google Calendar, Gmail, Tasks, Drive | googleapis | Apache-2.0 | install |
| Outlook, Calendar, To Do, OneDrive | microsoft-graph-client | MIT | install |
| Many-provider OAuth, token refresh, revocation | Nango | **Elastic - not permissive** | **reference only.** We write our own vault |
| Matter controller over Wi-Fi from Node | matter.js | Apache-2.0 | install |
| Matter on the device | esp-matter | Apache-2.0 | reference, the intern's |
| Wake word, VAD, AEC on ESP32-S3 | esp-sr | Espressif licence - **check before shipping** | reference, the intern's |
| UART smart-display driver | EasyNextionLibrary | MIT | the intern clones it |
| App components | react-native-reusables | MIT | clone the components we use |
| App styling and motion | NativeWind, Reanimated, Moti | MIT | install |
| Orb and face in the app | Rive | runtime MIT; **each art file its own licence** | install, licence-check every `.riv` |
| Console UI | shadcn/ui | MIT | clone the components we use |
| Evaluation harness | promptfoo | MIT | install |
| Recurrence, timezones, scheduling | rrule, Luxon, Croner | MIT / Apache-2.0 | install |

Two of these are not free lunches. **WhisperX** diarisation needs a Hugging Face token and acceptance of a model agreement, and is imperfect by its own README - which is why the hosted transcription default exists from day one. **Nango** is Elastic-licensed, which is not an open-source licence for a product we sell - which is why the token vault is ours.
