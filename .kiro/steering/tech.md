---
inclusion: always
---
# Parth: Tech

## One language
TypeScript everywhere, in strict mode: the app, the console, the gateway, the simulator, the shared package and Supabase edge functions (Deno). Firmware (C++/Arduino) belongs to the intern and is outside this repo's build.

**Exactly one declared exception**: `services/transcription`, a possible future self-hosted WhisperX diarisation service in Python, behind the same `TranscriptionProvider` interface as every hosted vendor. It is declared here so it is never discovered later. **Do not create it now.**

## Toolchain pins - identical to `.reference/xelulu`
| Thing | Pin | Why not newer |
|---|---|---|
| Node | 24.21.0 (`.nvmrc`, `engines`) | The ported tooling, checks and CI run unchanged. |
| pnpm | 10.34.6 (`packageManager`) | Same. |
| TypeScript | 6.0.3 | Same. |
| Vitest | 5.0.3 | Same. |
| EMQX | **5.8.9** | 5.9+ moved to BSL 1.1, which is not an open-source licence for a product we sell. Pinned, and a repo check enforces exact versions. |
| Package scope | `@parth/*` | |
| Local ESLint plugin | `parth-plugin` | |

Version drift costs more than it buys. `tooling/checks/exact-version.ts` fails the build on a range specifier.

## Stack
| Layer | Choice | Licence | Why this |
|---|---|---|---|
| App | React Native + Expo (TypeScript), Expo Router, NativeWind, Reanimated/Moti | MIT | One codebase for both phones. The shell ports from Xelulu's app, which already works. |
| App components | `react-native-reusables` (shadcn/ui for React Native) | MIT | Parth is dense, data-heavy and dark-first. A component library beats hand-rolled lists. |
| Orb and face in the app | Rive | runtime MIT; **each `.riv` art file carries its own licence** | Already proven in Xelulu. Every art file is licence-checked before it is added. |
| Auth, data, storage, realtime | Supabase (Postgres with RLS, Auth, Storage, Realtime, Edge Functions), region **Mumbai `ap-south-1`** | Apache-2.0 | Identical to Xelulu so the schema patterns port. Mumbai is the DPDP answer. |
| Control plane | MQTT 5 over TLS on **EMQX 5.8.9**; MQTT.js in the gateway and the simulator | Apache-2.0 / MIT | Reliable pub/sub over flaky home Wi-Fi and clean fleet messaging. |
| Audio plane | Per-turn WebSocket over TLS. Opus, 16 kHz mono, 20 ms frames, duplex for barge-in | - | Unchanged from Xelulu. Ported whole. |
| Gateway | Node 24.21.0, TypeScript strict | - | Ported. Carries the control plane, the audio plane, the brain and the trust spine. |
| Tool-calling loop | **Vercel AI SDK** | Apache-2.0 | Streaming, tool calls and provider switching are the backbone of the brain, the Council and Mentor. Hand-writing that is weeks of nothing special. |
| Speech | Sarvam hosted as the fast path, faster-whisper self-host as fallback, both behind `SttProvider` / `TtsProvider` | MIT (faster-whisper) | Ported interfaces. Indian-language quality matters. |
| Transcription and diarisation | A hosted vendor by default; **WhisperX** + `pyannote-audio` as the additive self-host path, both behind `TranscriptionProvider` | BSD-2-Clause / MIT, **pyannote models gated by a Hugging Face agreement** | Diarisation is the one genuinely hard piece of the meeting feature. WhisperX is imperfect by its own README, so the hosted default exists from day one. |
| Smart home | **matter.js** in the gateway | Apache-2.0 | Matter over Wi-Fi from Node with no C++ in our half. Thread is deferred - no radio in the BOM. |
| Connections | `googleapis`, `microsoft-graph-client` | Apache-2.0 / MIT | The two providers we need done well. |
| OAuth token store | **ours** - an envelope-encrypted vault, per-user data key under a cloud-only master key | - | **NOT Nango**, which is Elastic-licensed and therefore not open source for a product we sell. We need two providers done well, not a thousand done badly. |
| Research | **open deep research**, cloned and stripped | MIT | TypeScript, small, and exactly PA-C07. Every claim carries a source link. |
| Evaluation | **promptfoo** | MIT | The golden-set gate runs in CI. "High accuracy" has to be a number that blocks a release. |
| Scheduling | `rrule`, `Luxon`, `Croner` | MIT / Apache-2.0 | Recurrence and timezones are where assistants quietly get things wrong. |
| Validation | **Zod** schemas in `packages/shared` for every B-P and HMI message | MIT | Ported machinery. Nothing crosses the seam unvalidated. |
| Tests | Vitest + fast-check for shared, gateway, simulator and tooling; jest-expo + React Native Testing Library for the app; promptfoo for the brain | MIT | Ported. |
| Console | Vite + React, shadcn/ui components | MIT | Ported. Internal only. |
| Tooling | pnpm workspaces, ESLint + Prettier, the repo checks, the local `no-cross-package-import` rule | - | Ported. Add Turborepo only if builds get slow. |
| UART smart display | **EasyNextionLibrary** (the intern's) | MIT | The SmartElex 3.5" is a Nextion-class smart display. |
| Wake word, VAD, AEC | `esp-sr` (the intern's) | **Espressif licence - check before shipping** | |
| Matter on the device | `esp-matter` (the intern's) | Apache-2.0 | |
| Firmware base, Opus over WSS, OTA | ElatoAI (the intern's) | MIT | Keep its notice wherever its code is copied. |

### Licences that must be re-checked before shipping
Each is re-checked in the phase that introduces it, and again before the pilot.
1. **EMQX stays at 5.8.9.** Any bump past 5.8.x is a licence decision, not a maintenance task.
2. **`esp-sr`** - Espressif's own licence, on the intern's side, but it ships in our product.
3. **Every `.riv` art file** - the Rive runtime is MIT; the art is not automatically.
4. **`pyannote-audio` models** - gated behind a Hugging Face model agreement that must be accepted knowingly, by a named account.
5. **Any voice-clone model**, if one is ever used - several are non-commercial only.
6. **Nango stays reference-only.** Elastic is not permissive. If anyone proposes adopting it, that is a licence decision.
7. **Every hosted vendor's data-processing terms** against DPDP, including the region it processes in - which is now enforced in code, not reviewed by hand. See **Data residency** below. D1 is closed: India-only, so the shortlist is shorter than the obvious one and every candidate must state an Indian region.
8. **`open deep research`** - MIT at clone time; record the commit we stripped it from.

## Languages (C17)
- **Voice: `en-IN`, `hi` and `kn` at P0**, behind `SttProvider` and `TtsProvider`. The catalogue's wider list is a P8 expansion.
- **The face is English-only in v1.** A Nextion-class display renders bitmap fonts with no complex-script shaping, so Devanagari and Kannada on the 3.5" panel would be broken glyphs. The app says so plainly instead of implying the face is localised.
- Reversible: if the display's editor turns out to shape those scripts, the face follows the voice. Until then, the HMI token set carries Latin faces only, and the legibility gate checks Latin metrics only.
- No string that reaches the face is run through the voice translation path. The two surfaces have different language sets, and that is a deliberate asymmetry, not a bug to "fix".

## Data residency, enforced at boot (C19)
- `DATA_REGION` and `ALLOW_PROCESSING_OUTSIDE_INDIA` are **not documentation**.
- **Every provider's `provider-declaration` gains a `data_region` field.** The ported `provider-gate` refuses to start the gateway when a declared provider's region violates `ALLOW_PROCESSING_OUTSIDE_INDIA`.
- **A provider that cannot state its region does not load.** There is no "unknown" that resolves to allowed.
- **Decided (D1, closed).** The flag is **`false`** and the vendor shortlist is **India-only**. This is not an open question and does not appear in any open-items list; `decisions.md` holds it. A vendor's shortlisting is therefore a code-level fact, not a reviewer's memory.
- This reuses the existing `provider-gate` rather than adding a new mechanism, which is why it costs almost nothing.

## The seam: Document B-P
- **Document B-P does not exist yet.** It is the frozen wire contract and the only authority on topics, fields, enums and values. **Write no code from any field name in this file.** The lists below are the intern's spec §3, recorded as context for reasoning, not as a contract.
- **No file in `packages/shared/src/gateway-contract/` is created or edited before B-P is signed off.** The directory arrives in one piece at P1. Nothing is pre-created, not `topics.ts`, not `constants.ts`, not a placeholder.
- Changes to B-P are a `proto_ver` bump signed off by both the software and the hardware sides. No invented fields, no renamed enums, no improved wire format, not once. If code disagrees with B-P, the code is wrong.
- **Document C** (`docs/C-pairing-and-device-session.md`) is reused unchanged except for the topic root: the `hello`-is-pairing rule, the 6-character Pairing_Code derived in the cloud, the six Device_Session states, the 15 s heartbeat, the 45 s Silence_Window, and "acks are final". It is additive to B-P, and B-P wins on any overlap.
- BLE / Wi-Fi provisioning is Document C Part 1 and is **reserved, not yet specified**. It is device-local, before any MQTT connection, so nothing is blocked on it.

### Topics
Four topics only, topic root `parth/`:
- `parth/{device_id}/status` - device to cloud. `hello` on connect, `status` every 15 s.
- `parth/{device_id}/event` - device to cloud.
- `parth/{device_id}/cmd` - cloud to device.
- `parth/{device_id}/ack` - device to cloud. Status is `accepted|done|rejected|failed`, with a `reason`.

Device ids are prefixed **`prt_`**. `proto_ver` is **2**, the same envelope, ack, audio-turn and pairing rules as Xelulu v2, word for word. The topic root is what separates the two products, so one less thing for firmware to special-case and Document C ports unchanged.

### Brokers: one per product in production
A Parth device and a Xelulu device **never share an MQTT broker in production**: separate instances, separate credentials per product. The topic root and the `prt_` id prefix make sharing *safe*, but they do not make it *right* - one broker is one blast radius, one credential rotation and one outage across two products with different firmware fleets.

Sharing a single broker on a developer machine is allowed and expected; that is what the local Compose stack is. The registry binds the `prt_` device-id prefix either way, so a Xelulu id cannot be accepted by Parth's gateway even on a shared dev broker.

### What the intern's spec says changes (context only - B-P rules)
- New or changed events: `screen_touch`, `tap_zone`, `bt_call`, `focus`. `wake` is reused. `motion` and `touch` are **removed**.
- New or changed commands: `screen`, `screen_toast`, `bt_call`, `focus`, `matter`. `say`, `animate`, `play`, `set_mode`, `config`, `stop_audio` and `ota` are reused; `animate` is a lightweight face-expression swap on the HMI. `gesture` and `move` are **removed**.
- `status` gains `bt_module` and `matter_hub`.
- **Capability flags go into `hello`** while the contract is still open: `screen`, `mics`, `speaker`, `touch_pads`, `bt_call`, `matter`, `camera`, `neck`, `doa`. The names are fixed; B-P freezes the wire shape. That is what makes Parth Pro cost no `proto_ver` bump and what turns every unconfirmed hardware fact into an undeclared capability instead of a blocker.

### Message rules (Document C §2.4, unchanged)
Every message carries `proto_ver`. Every upstream message carries `ts` (unix seconds) and `type`. Every event carries `event_id`; every command carries `cmd_id` and is idempotent. Commands use QoS 1; telemetry 0 or 1. A device is offline after 45 s of silence. On a `proto_ver` mismatch the device keeps its last-known-good state and reports the mismatch rather than acting.

### Audio turns
Open the socket at `AUDIO_WSS_URL`; send `audio_start` with a `turn_id`, then binary Opus frames, then `audio_end`. `say` audio streams down the WebSocket, never as a URL. Barge-in: the device sends `interrupt`, the cloud sends `audio_end` for the turn then a `stop_audio` command. There is no WebSocket cancel frame. A device that loses Wi-Fi mid-turn resumes the turn or aborts it cleanly and says which - never a half-executed tool call.

### Where the contract lives
- `packages/shared/src/gateway-contract/` - B-P types, Zod schemas, codec and golden fixtures. Layer label `contract`. **Arrives at P1. Empty until then.**
- `packages/shared/src/hmi-contract/` - the page-and-variable contract: page ids, the variables each page accepts, the stable logical target names for tappable regions, and the HMI token set. Layer label `contract`. It lives inside the frozen contract because the gateway, the simulator and the console must agree on it exactly, and because the contract has a single home. It is **not** in the app and **not** in the firmware.

Everything imports the contract from there and nowhere else. `tooling/checks/contract-use.ts` proves it: a Zod import outside the contract, a `parth/` topic literal, a redeclared contract type name, or a hand-written list of wire values is a build failure.

### The matrix is derived, not written
The console's test matrix builds every row at runtime by walking the contract's own lists out of the shared package, plus the fixed rows that name no wire value. A contract list that gains a member gains its row with no edit, and a repo check proves it. **Port that property exactly.** For Parth the zone list becomes HMI page targets, and a capability a device does not declare drops its rows out of the run.

## OTA
- **The signing key is never in the panel** (C16). Manifests are signed in the **release pipeline**. The gateway holds only `OTA_SIGNING_KEY_ID`; the device holds only the **public** key. A signing key in a service environment would make any compromise of the gateway a compromise of every future update.
- `ota` is a `cmd` action carrying a manifest URL and a `cmd_id`, answered with an `ack` like any other command. There is no OTA topic.
- OTA carries firmware and, optionally, a new HMI asset bundle. Images are signed, with automatic rollback.

## Hosting
- Local dev: Supabase CLI, plus Docker Compose running EMQX 5.8.9, the gateway and the simulator. Loopback by default; `DEVICE_BIND_HOST=0.0.0.0` opens only the broker and the audio socket to the LAN, never the console or the panel.
- Hosted (P12.5, its own phase): Supabase cloud in Mumbai; the gateway containerised in the same region; EMQX Cloud or self-hosted EMQX in-region; TLS on every hop; **per-device certificates replacing the prototype device token**, with the private key generated on the device and never leaving it (see `safety.md`). `MQTT_CA_PATH`, `DEVICE_CERT_PATH`, `DEVICE_KEY_PATH`, `TELEMETRY_ENDPOINT` and `TELEMETRY_API_KEY` all arrive at P12.5.

## Configuration
- Every key, URL and port comes from env vars declared in the root `.env.example`, the single connection panel. **Nothing is hard-coded**; `tooling/checks/env-reads.ts` and `tooling/checks/url-scan.ts` enforce it and `tooling/checks/panel.ts` compares the panel against its approved fixture line by line.
- The panel uses **comment-above-key form, never inline trailing comments** (C15), because `Panel_Check` reads everything after `=` as the declared value.
- **No box for a feature we have not built yet** (C16). A box nobody can fill is an invitation to fill it wrongly; boxes arrive in the phase that needs them.
- **Policy is not configuration** (C18). The confirmation timeout, the undo window, the proactivity budget and every retention number are **defaults** in the panel; the live value is per user, in the rules engine from P4, and visible in the app. See `safety.md`.
- `tooling/checks/secret-scan.ts` fails the build on a committed secret.
- The app only ever receives `EXPO_PUBLIC_*` values. Its Device page shows non-secret values and shows secrets as "set" or "not set", never the value.

## Testing expectations
- Contract round-trip: every B-P and HMI message survives `parse(serialise(x)) === x`, as a property.
- Rejection: unknown fields, a wrong `proto_ver`, an unknown page id and an unknown page variable are all rejected.
- Dedupe by `event_id`, idempotency by `cmd_id`.
- `provider-gate` residency: a provider declaring a region that violates the flag must fail the gateway's start, as a test, not as a convention.
- The simulator drives the gateway end-to-end in CI, over the wire format only, with no shortcuts into gateway internals. At P13 the same tests point at the real device.
- The golden-set eval suite gates every phase from P5 onward: tool choice, confirmation compliance, refusal correctness, latency.
- The face legibility gate: the HMI token set carries minimum type sizes and contrast ratios for a 480x320 panel at arm's length, checked by the ported `contrast` check, with the simulator rendering at true pixel density.
- `tooling/test/layer.test.ts` enforces the three-layer rule and caps the escape hatch at five uses across the repository.
