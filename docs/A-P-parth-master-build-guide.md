# Document A-P — Parth Master Build Guide

**Parth — the flagship AI chief-of-staff companion, ages 20–45. Third product in the Companion Intelligence family.**

Version 1.4 · 21 October 2026 · Omar Saud, founder · Claude, CTO / PM / hardware architect

*v1.4 closes P0 and records the four standing build rules it produced. See §20. The amendment log is §18.*

---

## 0. Choices and FLAGs

Every spec in this build opens with its choices and its FLAGs, in the Xelulu format. This document opens the same way.

### Choices made in this document

| # | Choice | Reason |
|---|---|---|
| C1 | **Parth is a new repository built from the Xelulu skeleton**, not a shared platform extracted now. | Extracting a platform today means editing every Xelulu file while the intern is testing firmware against it and its Phase 5 is still open, and it means generalising from one product's experience. Instead every Parth file is labelled `platform` or `product` as it is written, a repo check enforces it, and the extraction happens after P5 when the shared shape has been observed twice. |
| C2 | **Parth gets its own frozen contract, Document B-P**, self-contained, topic root `parth/{device_id}/`, device ids `prt_`. | Xelulu's Document B is frozen under firmware already being built to it. A second product must not be able to break the first. |
| C3 | **Parth keeps `proto_ver` 2**, as the intern's spec wrote it. Envelope, ack, audio-turn and pairing rules are Xelulu v2's word for word. | The topic root separates the products; one less thing for firmware to special-case, and Document C ports unchanged. |
| C4 | **Capability flags go into `hello` now**, while the contract is still open. | The camera-and-neck variant then costs no `proto_ver` bump, and one codebase serves both builds. |
| C5 | **The catalogue's Parth is "Parth Pro", a later variant.** The 5.5" face, 4K camera, on-device NPU and gimbal neck are not physically possible on this BOM and are not in v1. | They stay designed-for behind capability flags. The app calls v1 the *voice edition*, exactly as the intern proposed. |
| C6 | **Toolchain pins are identical to Xelulu**: Node 24.21.0, pnpm 10.34.6, TypeScript 6.0.3, Vitest 5.0.3, EMQX 5.8.9. | The ported tooling, checks and CI then run unchanged. A version drift would cost more than it buys. |
| C7 | **We write our own OAuth token store** rather than adopt Nango. | Nango is Elastic-licensed, which is not an open-source licence for a product we sell. We need two providers done well, not a thousand done badly. |
| C8 | **Meeting transcription sits behind a provider interface with a hosted default from day one**; the self-hosted WhisperX path is additive. | WhisperX diarisation is gated behind a Hugging Face model agreement and is imperfect by its own README. Same discipline Xelulu uses for speech. |
| C9 | **Persistence, accounts and the token vault move to P4, before the first feature.** | Xelulu could demo on mock data because a child never signs in. Every P0 feature Parth has is an authenticated connection to the user's own mail and calendar, so the database and the vault must exist before any feature is real. Useful side effect: Parth builds the persistence layer Xelulu still needs, and Xelulu copies it back. |
| C10 | **One language, TypeScript, with exactly one declared exception**: `services/transcription` (Python, WhisperX) if and when we self-host diarisation. | The house rule holds everywhere else. The exception is declared here rather than discovered later, and it sits behind the same provider interface as every vendor. |
| C11 | **The HMI page-and-variable contract lives inside the frozen contract**, at `packages/shared/src/hmi-contract/`, not in the app or the firmware. | The gateway, the simulator and the console must agree on it exactly, and the contract has a single home. |
| C12 | **A fifth steering file, `reuse.md`**, is added to the Xelulu four. | The single largest risk in this build is Kiro regenerating something that already exists in `.reference/xelulu`. That rule needs to be always-on steering, not a line in a prompt. |
| C14 | **Three layer labels, not two: `platform`, `contract`, `product`.** | Added in v1.1. The contract is neither platform nor product: `topics.ts` must contain the string `parth` and nothing else platform-labelled may. Two labels made the enforcement check un-writable; three make it trivial. |
| C15 | **The `.env` panel uses comment-above-key form**, never inline trailing comments. | Added in v1.1. The ported `Panel_Check` reads everything after `=` as the declared value, so §11's illustrative inline comments would fail the check on every line. |
| C16 | **The OTA signing key never appears in the panel.** Manifests are signed in the release pipeline; the gateway holds only the key id and the device only the public key. | Added in v1.1. A signing key in a service environment means any compromise of the gateway is a compromise of every future update. |
| C17 | **The face is English-only in v1; the voice is not.** Voice supports `en-IN`, `hi` and `kn` at P0 behind the provider interface. | Added in v1.1. A Nextion-class smart display renders bitmap fonts with no complex-script shaping, so Devanagari and Kannada on the 3.5" panel would be broken text, not localisation. Honest English on the face beats broken Kannada. |
| C18 | **Policy numbers live in the database per user; `.env` holds only the default.** Confirmation timeout, undo window, proactivity budget and every retention number. | Added in v1.1. A user-visible setting that only exists in a deploy environment is not user-visible. |
| C19 | **A provider declares its data region, and the gateway refuses to start if a declared region violates the residency flag.** | Added in v1.1. Residency enforced at boot by the existing `provider-gate`, not by a reviewer remembering. |
| C20 | **The layer check's banned list is two-tiered**, and the ordinary English words come out of it. | Added in v1.2. `focus` is a DOM method, `confirm` is a browser API, `matter` and `brief` occur in normal prose. A check that fires on those burns its escape hatch in a day and then gets deleted. |
| C21 | **Recording stops on the face, not on the wake word.** The on-screen stop button is the guarantee; "Parth, stop recording" is additive. | Added in v1.2. PA-M05 is a P0 safety promise, and the custom WakeNet model it would depend on is an unconfirmed hardware item. A safety guarantee may not rest on an open question. |
| C22 | **`tap_zone` freezes as a six-name closed list**, and `touch_pads` declares *which* zones are fitted, not how many. | Added in v1.2. A count tells the cloud nothing about which card to show. The list is the superset; a unit with three pads declares three. |
| C25 | **An artefact and its test ship in the same wave.** | Added in v1.4. P0's Wave B shipped a `docker-compose.yml` missing its entire `simulator` service, and nothing caught it because the file shipped without its four tests. The gate was green over a file that could not run. |
| C23 | **The seven open founder decisions are closed**, and written into §19.1. | Added in v1.3. An open question that nobody is actively answering is a stall with a polite name. Each is decided, each has a reason, each is reversible. |
| C24 | **Kiro has a standing decision mandate** (§19.2): it decides and proceeds by default, and stops only at the contract, the safety model, licences and money, and anything outside the repository. | Added in v1.3. Omar is the founder and does not code; routing implementation choices through him costs a day each and improves nothing. The fences that stay are the ones that cannot be undone by editing a file. |
| C13 | **Hosting becomes its own phase, P12.5**, between the audit and integration. | Everything before it runs on your own machine. Pilot users are not on your Wi-Fi, and per-device certificates, TLS on every hop and a hosted broker are not a day's work bolted onto integration. |

### FLAGs

| # | FLAG | What I need |
|---|---|---|
| F1 | **The setup plan says "Kiro must not start before Document B-P lands".** Prompt P-0.1 in §16 runs *now*, before B-P. | No conflict, and here is why: P-0.1 writes no application code. It writes five steering files and *proposes* a skeleton for my approval. The first code-writing prompt, P-0.2, waits for B-P. Confirm you are happy with that reading. |
| F2 | **The Bluetooth board that was ordered is a generic Bluetooth Audio Receiver with USB/TF and a microphone.** PA-C11 assumes firmware answers and hangs up over AT commands, which needs a serial command set and the hands-free profile. | The intern's answer to question 1 on the BOM "To confirm" tab, before P10. The contract carries `bt_call` either way; the capability flag decides whether the feature exists on a given unit. |
| F3 | **No TTP223 touch pads appear in either order screenshot**, though `tap_zone` depends on them. | The intern's answer to question 2. The contract carries `tap_zone`; without the hardware the device simply does not declare the capability and the row drops out of the test matrix. |
| F4 | **Espressif documents microphone-array direction of arrival for the ESP32-P4, not confirmed for the S3.** | The intern's answer to question 3. If it does not work, PA-M02 becomes an honest listening animation rather than a "looking toward" indicator, and I will say so in B-P. |
| F5 | **The intern's real BOM, `Parth_BOM_ESP32S3_v4.xlsx`, has not been shared.** What is in the Project is my reconstruction from the order screenshots, and it is explicitly not an authority. | Ask him for the file. If it disagrees with the reconstruction, his file wins and mine is deleted. |
| F6 | **Both repositories live in the intern's personal GitHub account.** | One line from you and I will give the steps to move both into an organisation you own and add him as a collaborator. This costs an afternoon now and is very expensive later. |
| F7 | **Google's restricted Gmail scopes need app verification and an independent security assessment** before real users can connect. That runs in weeks. | It has to start at P4, not at P6 when the mail feature is ready. |
| F8 | **The catalogue and the intern's spec disagree on the hardware** (5.5" face, camera, NPU, moving neck versus the 3.5" ESP32-S3 build). | Resolved by C5, not by silently choosing: the spec wins for v1, the catalogue stays because it defines the features and the family, and the deferred items return in Parth Pro. Raised here so it is on the record. |

---

## 1. How to use this document

This is the operating manual for building Parth's software. You do not write code. You run Kiro; I act as CTO, PM and hardware-architecture reviewer; your intern builds the firmware and the hardware. Kiro is our implementation engineer.

Four documents define the build.

- **Document A-P** (this one): the plan, the stack, the reuse policy, the approved open-source list, the phase plan, and the first Kiro prompts.
- **Document B-P**: the Parth Gateway and Hardware Seam — the single frozen contract where the hardware plugs into the software, including the HMI page contract and the capability flags. Written in chat 2. **Nothing is built from it until it is signed off.**
- **Document C** (Xelulu's, reused wholesale): pairing, the Pairing_Code, the six Device_Session states, the 15 s heartbeat and 45 s offline rules. Parth reuses it unchanged; only the topic root differs.
- **Parth Hardware and Order Review**: the document you hand the intern. Written in chat 3.

### Precedence when documents disagree

1. **Document B-P** — the wire contract, including the HMI page contract.
2. **Document C** — pairing and the device session; additive to B-P, which wins on any overlap.
3. **The Parth Hardware and Order Review** — v1 hardware facts.
4. **Document A-P** — this guide.
5. **The intern's Parth Software Team Spec** — the feature floor.
6. **The Companion Intelligence Feature Catalogue** — the family-level feature list and the source of every `PA-*` id.

That order is not a demotion of the intern's spec. His spec is the **floor**: every feature in it is kept, nothing is removed or renegotiated, and §13 of this document is the layer I am adding on top. The precedence list only decides who wins on a *field name or a wire detail*, where there has to be exactly one answer.

Everything in this document is a decision, not a question. Where I made a founder-level call the reason is given, and any of them can be reversed by you.

---

## 2. The one big decision: we stand on the Xelulu platform

For Xelulu, the big decision was to fork ElatoAI rather than start from a blank page. For Parth, the equivalent decision is larger and cheaper: **we stand on Xelulu itself.**

The Xelulu repository is not a prototype. It is a pnpm/TypeScript monorepo with a frozen contract expressed as Zod schemas and golden fixtures, a Node gateway carrying the MQTT control plane and the per-turn audio WebSocket, a voice brain with every vendor behind a provider interface, a device simulator that speaks the contract with no shortcuts into gateway internals, a developer console whose test matrix is *derived from the contract at runtime* so it cannot drift, twenty-five repo checks, a local ESLint rule that enforces package boundaries, Docker Compose with EMQX, and property-based tests. That is the expensive two-thirds of this product, already written and already proven.

| Item | Decision | Reason |
|---|---|---|
| **Base** | Clone `github.com/vikas-vishw/xelulu` into `parth/.reference/xelulu` as a **read-only reference**, and port from it. | Kiro copies proven toolchain, checks, contract machinery, MQTT plumbing, audio WebSocket, simulator and console instead of writing them again. This single step is the difference between a few hundred Kiro credits and a few thousand. |
| **What we port** | The monorepo and toolchain, repo checks and CI, the contract machinery, the gateway's transport and session layers, the operator surface, the whole simulator, the console's stream and matrix, the brain's pipeline and provider interfaces. | These are platform, not product. They carry no child-specific assumption. |
| **What we adapt** | The brain's safety layer, the tool catalogue and router, the memory and transcript stores, the scheduler. | Same shape, adult content. An adult safety model is not a relaxed child one; see §14. |
| **What we build new** | Connections and the token vault, the confirmation layer, the Action Ledger, the chief-of-staff services, meetings, research, drafting, Council and Mentor, Matter, the BT call bridge, the HMI contract and pages, the Parth app, the evaluation harness. | This is the product. Nothing in Xelulu resembles it. |
| **What the intern reuses** | ElatoAI's `firmware-arduino` for Opus-over-WSS and OTA, `esp-sr` for wake word, `EasyNextionLibrary` for the UART smart display, plus his own Xelulu firmware for the MQTT client. | He inherits a working audio client and only adds the screen, the BT module and Matter. |
| **What we never carry over** | Xelulu's child-safety assumptions. | Listed explicitly in §9 as *do not port*. Carrying them silently into an adult product would be a design error; carrying Parth's open capability back into Xelulu would be a safety incident. |

**The simulator is still the trick that makes this work.** The whole product — app, cloud, brain, face, console — is finished and proven against a fake device that behaves exactly like the real one. At P13 the intern clones the repo, runs the stack on his own machine in his own city, points his firmware at his own LAN, and walks the test matrix in the console. No deployment, no access to your machine, no call needed. Two things make that safe: the contract freezes on my rulings rather than on his answers, and capability flags absorb every hardware unknown.

---

## 3. Roles and the working loop

### 3.1 Who does what

| Role | Who | Responsibility |
|---|---|---|
| Founder, owner, approver | Omar | Sets direction, approves decisions, runs Kiro, does the manual steps (accounts, keys, OAuth registrations, folders), tells me when the intern changes something |
| CTO, PM, hardware architect | Me, this chat | The architecture, every spec, every Kiro prompt, review of everything Kiro and the intern produce, licence/privacy/safety flags, keeping the plan coherent, founder-level calls with reasons |
| Firmware and hardware | Intern | The ESP32-S3 device and firmware, built against Document B-P, from his Xelulu firmware and ElatoAI |
| Implementation engineer | Kiro | All the code, from my prompts and specs |

You never need to understand the code. You need to paste what I give you into the right place, paste Kiro's reply back to me, and tell me when something real-world changes.

### 3.2 The loop

1. I write a Kiro prompt in this chat, and state the Kiro **model and mode separately, above** the prompt block.
2. You paste the prompt into Kiro.
3. Kiro produces a spec (requirements / design / tasks) **or** code plus a summary.
4. You paste Kiro's reply back here.
5. I review: approve, or give corrections as the next prompt.
6. Kiro executes the approved tasks; you run the stack or the app; you tell me what you see.
7. Next wave.

**The rule:** Kiro never "just builds everything". One spec at a time, in waves. I approve the spec before Kiro writes code, and I review the summary after. **Commit at the end of every wave** — that is what makes a bad wave cheap to undo.

### 3.3 When to open a new chat

Context is protected by the Project, not by one long chat. One chat per phase, roughly. When I say open a new chat you start a new chat *inside the Build Parth Project*, paste the Chat Starter I give you, and continue — I already have the Project knowledge.

### 3.4 When the intern changes something

Tell me in one line ("intern says the BT board has no AT commands"). I will update the affected spec, tell you exactly which steering file changes, and give you the Kiro prompt to apply it. Never apply an intern change to the software yourself: the contract, the simulator, the console matrix and the app must move together or they drift apart silently.

### 3.5 When the contract changes

A change to Document B-P is a `proto_ver` bump signed off by both the software and the hardware side. No invented fields, no renamed enums, no improved wire format, not once. If code disagrees with B-P, **the code is wrong**.

---

## 4. The Kiro folder and the GitHub repo — what you do by hand

You do five things by hand, once. Kiro creates everything else. **Do not create `apps/`, `services/`, `packages/`, `supabase/`, `tooling/`, `.kiro/`, `.env.example`, `docker-compose.yml` or `README.md` yourself** — prompt P-0.1 proposes them and I approve the proposal before anything is written.

### 4.1 The five manual steps

Run these in the empty `parth` folder you have open in Kiro. Windows commands; on macOS or Linux use `mkdir -p docs/design` and forward slashes.

```
cd <your empty parth folder>

git init
git remote add origin https://github.com/vikas-vishw/parth.git

mkdir docs
mkdir docs\design
mkdir .reference

git clone https://github.com/vikas-vishw/xelulu.git .reference/xelulu

echo .reference/ >> .gitignore
echo .env >> .gitignore
```

**Correction (v1.4): those two `echo` lines do not work in Windows PowerShell.** `>>` writes UTF-16LE, git does not read a UTF-16 ignore file usefully, and the result was a `.gitignore` that silently ignored nothing — including `.env`. Kiro found it and rewrote the file as UTF-8 with LF endings. The repository now owns `.gitignore`, `.gitattributes` (pinning `eol=lf`, because `core.autocrlf=true` would break the panel's byte comparison and the BOM-free EMQX bootstrap) and the toolchain under `.tools/`. Nobody needs to run those two lines again; they are left here with their correction because the mistake is worth seeing.

Step 4 is the highest-value line in this document. If the clone asks you to sign in, sign in with the GitHub account that can read the private Xelulu repo. If it refuses, download the repo as a ZIP from GitHub and unzip it into `.reference/xelulu` — Kiro only needs to read the files. Verify it worked: `.reference/xelulu/packages/shared/src/gateway-contract/` should contain about twenty TypeScript files.

### 4.2 What you drop into `parth/docs/` by hand

| Path | File | When |
|---|---|---|
| `docs/` | `parth-software-team-spec.pdf` (the intern's) | **Now** |
| `docs/` | `companion-feature-catalogue.docx` | **Now** |
| `docs/` | `A-P-parth-master-build-guide.docx` (this document) | **Now** |
| `docs/` | `parth-bom-reconstructed-v0.xlsx` | **Now**, clearly marked not authoritative |
| `docs/` | `parth-bom-esp32s3-v4.xlsx` | When the intern sends it — then delete the reconstruction |
| `docs/` | `B-P-parth-gateway-and-hardware-seam.docx` | After chat 2. **No code is written before this lands.** |
| `docs/` | `parth-hardware-order-review.docx` | After chat 3 |
| `docs/` | `C-pairing-and-device-session.md` | **Now**, copied from `.reference/xelulu/docs/` |
| `docs/design/` | `parth-app-screens-66.png` (the board you sent) | **Now** |
| `docs/design/` | `xelulu-console-reference.png`, `xelulu-app-ux-flow.png` | **Now**, copied from `.reference/xelulu/docs/design/` |
| `docs/design/` | `prototype-photo.jpg`, `hmi-in-enclosure.jpg` | When the intern sends them. The face is a physical object at a viewing distance; the page design depends on it |
| `docs/design/hmi/` | The nine HMI page designs | At P9, after they are designed |

Copying Document C and the two Xelulu design references out of `.reference/` and into `docs/` is deliberate: `.reference/` is git-ignored and read-only, and anything Kiro must *build to* belongs in `docs/`, under version control.

### 4.3 The Project and the Kiro folder hold different sets

Kiro gets what it must build *from*: the two contracts, the spec, the catalogue, the BOM and the images. The Project gets all of that **plus** the Xelulu documents and steering pack, because that is what I reason about when I write your specs. Kiro reads the Xelulu *code* directly from `.reference/` instead of from documents.

### 4.4 Accounts and keys, in the order they are needed

Nothing here blocks P0 or P1.

| When | What |
|---|---|
| Before P4 | A Supabase project in the Mumbai region (`ap-south-1`). A Google Cloud project and OAuth client under **an account you own** — and start app verification the same day (F7). A Microsoft Entra app registration if Microsoft is first. |
| Before P5 | The hosted model key for the brain; Sarvam or your preferred vendor for Indian-language speech; a search provider key for the research agent. |
| Before P7 | A hosted transcription-with-diarisation vendor, and a Hugging Face token only if we self-host WhisperX. |
| Before P10 | Spotify or YouTube Music credentials, if music stays P1. |
| Before P12.5 | EMQX Cloud or a self-hosted EMQX in Mumbai, a container host in the same region, and a certificate authority for per-device certificates. |
| Ongoing | A Kiro plan. Spec mode with a mid model keeps credit burn reasonable, but this build is larger than Xelulu's. |

---

## 5. Which model and mode to use

### 5.1 In this chat

Opus-class with extended thinking on heavy design turns: the contract, the safety model, the confirmation layer, the HMI contract, any subsystem review. Medium thinking is fine for routine turns. The value here is judgement, not speed.

### 5.2 In Kiro

- **Mode: Spec mode for everything non-trivial**, which is every phase in §12. It writes requirements, design and tasks before code, and that is exactly what stops wasted work. Default/vibe mode only for a one-line edit.
- **Model: Sonnet-class for the build.** Escalate to Opus-class for the first architecture spec of a phase, the contract phase (P1), the confirmation and Ledger phase (P5), and any module Sonnet struggles with twice.
- **Avoid "Auto"** for anything that matters. Pick the model so results are predictable.
- **Autopilot:** allowed only to execute tasks from a spec you and I have already approved. Never design and execute in one shot.

I state the model and the mode above every prompt block. The prompt itself never mentions a model, a mode or a tool.

---

## 6. Architecture

Read it bottom-up. The seam is a new contract with the same *shape* as Xelulu's, so everything above it ports almost unchanged and the simulator and console come with it.

```
+---------------------------------------------------------------------+
|  PARTH APP — React Native + Expo (TypeScript)                       |
|  Today · Meetings · Council & Mentor · Research & Drafts            |
|  Connections · Rules · Ledger · Privacy · Device                    |
+---------------------------------------------------------------------+
            |  HTTPS + Realtime (Supabase). The app never talks MQTT.
            v
+=====================================================================+
|  CLOUD — ported Xelulu platform + Parth product services            |
|                                                                     |
|  Supabase: auth · Postgres with RLS · storage · realtime            |
|  Gateway:  MQTT control plane (EMQX)  +  per-turn audio WebSocket   |
|  Brain:    STT -> model with tools -> TTS, barge-in, multi-turn      |
|  TRUST SPINE:  confirmation layer · Action Ledger · token vault      |
|                proactivity budget · memory with provenance          |
|  Product:  connections (Google, Microsoft, Notion, Todoist)         |
|            briefs · calendar · mail · tasks · meeting prep          |
|            meetings (record, transcribe, diarise, summarise)        |
|            research · drafting · Council · Mentor · rehearsal       |
|            Matter controller · BT call control · timers · intercom  |
|  Face:     screen page+variable pusher (the HMI contract)           |
|  OTA:      signed firmware + HMI asset bundles, with rollback       |
+=====================================================================+
            |  THE SEAM = Document B-P.  parth/{device_id}/{status|event|cmd|ack}
            |  up: hello(+capabilities) · status · screen_touch · tap_zone ·
            |      wake · bt_call · focus · interrupt · error · ack
            |  down: screen · screen_toast · say · animate · play · set_mode ·
            |        config · bt_call · focus · matter · stop_audio · ota
            v
+---------------------------------------------------------------------+
|  DEVICE — ESP32-S3 firmware (intern)                                |
|  wake word · 2x INMP441 · I2S speaker · UART to the 3.5" HMI ·      |
|  BT-Classic module (HFP) · Matter over Wi-Fi · MQTT + WS client     |
+---------------------------------------------------------------------+
+---------------------------------------------------------------------+
|  DEVICE SIMULATOR — speaks Document B-P exactly, and renders the    |
|  nine HMI pages from the same page-and-variable contract            |
+---------------------------------------------------------------------+
+---------------------------------------------------------------------+
|  DEVELOPER CONSOLE — live stream · devices · test matrix derived  |
|  from B-P · device control · HMI preview · per-turn latency panel   |
+---------------------------------------------------------------------+
```

---

## 7. Technology stack and why

| Layer | Choice | Why this, as your CTO |
|---|---|---|
| App | React Native + Expo (TypeScript), Expo Router, NativeWind, Reanimated/Moti | One codebase for both phones; ported wholesale from Xelulu's app shell, which already works. |
| App components | `react-native-reusables` (shadcn/ui for React Native) | Parth is a dense, data-heavy, dark-first app. A component library beats hand-rolled lists. MIT. |
| Orb and face in the app | Rive | Already in Xelulu, already proven. Runtime is MIT; **every `.riv` art file carries its own licence and gets checked.** |
| Backend and data | Supabase: auth, Postgres with RLS, storage, realtime, edge functions | Identical to Xelulu so the schema patterns port. Mumbai region. |
| Control plane | MQTT 5 over TLS on **EMQX 5.8.9**, MQTT.js in gateway and simulator | Reliable pub/sub over flaky home Wi-Fi, clean fleet messaging. **Stay on 5.8.9: EMQX 5.9+ moved to BSL.** |
| Audio plane | Per-turn WebSocket over TLS. Opus, 16 kHz mono, 20 ms frames, duplex for barge-in | Unchanged from Xelulu. |
| Gateway | Node 24.21.0, TypeScript strict | Ported. |
| Model orchestration | **Vercel AI SDK** (Apache-2.0) | The tool-calling loop, streaming and provider switching are the backbone of the brain, the Council and Mentor. Writing that by hand is weeks of nothing special. |
| Speech | Sarvam hosted as the fast path, faster-whisper self-host as fallback, both behind `SttProvider` / `TtsProvider` | Ported interfaces. Indian-language quality matters. |
| Transcription and diarisation | A hosted vendor by default, **WhisperX** (BSD-2) + `pyannote-audio` self-host as the additive path, both behind `TranscriptionProvider` | C8. Diarisation is the one genuinely hard piece of the meeting feature. |
| Research | **open deep research** (MIT), cloned and stripped | TypeScript, small, and exactly PA-C07. Every claim carries a source link. |
| Smart home | **matter.js** (Apache-2.0) in the gateway | Matter over Wi-Fi from Node, with no C++ in our half. Thread is deferred — there is no Thread radio in the BOM. |
| Connections | `googleapis` (Apache-2.0), `microsoft-graph-client` (MIT), plus our own token vault | C7. |
| Scheduling | `rrule`, `Luxon`, `Croner` | Recurrence and timezones are where assistants quietly get things wrong. |
| Evaluation | **promptfoo** (MIT) | The golden-set gate in §13 runs in CI. "High accuracy" has to be a number that blocks a release. |
| UART smart display | **EasyNextionLibrary** (MIT), for the intern | The SmartElex 3.5" is a Nextion-class smart display. |
| Wake word, AEC | `esp-sr`, for the intern | Espressif licence — **checked before shipping.** |
| Validation | Zod schemas in `packages/shared` for every B-P message | Ported machinery. |
| Tests | Vitest + fast-check for shared/gateway/simulator; jest-expo + RNTL for the app; promptfoo for the brain | Ported. |
| Tooling | pnpm workspaces, ESLint + Prettier, 25+ repo checks, the local `no-cross-package-import` rule | Ported. Add Turborepo only if builds get slow. |
| Hosting | Supabase Mumbai; the gateway in a container in the same region; EMQX Cloud or self-hosted in-region | P12.5. |

---

## 8. The three layers (amended in v1.1)

This is how we get a shared platform later without paying for it now (C1). Every file Kiro writes carries a one-line header comment naming its layer. **There are three layers, not two** (C14).

| Layer | May contain | May import from | Examples |
|---|---|---|---|
| **`contract`** | the product's wire values, and nothing else about the product | `contract` only | `packages/shared/src/gateway-contract/**`, `packages/shared/src/hmi-contract/**` |
| **`platform`** | no Parth feature, no provider name, no product string | `contract`, `platform` | transport, session, codec machinery, repo checks, the operator stream, the simulator's envelope handling |
| **`product`** | anything that knows what Parth *is* | all three | services, tools, prompts, screens, the app, the console pages |

Two labels were not enough, and Kiro was right to say so: `topics.ts` has to contain the literal string `parth` while no other platform file may, so a banned-string check with two labels cannot be written. With three, the check is one regex.

**The check.** `tooling/checks/layer.ts` fails the build when a `platform` file imports from a `product` path, or contains a banned string. The import rule is the real one: a platform file reaching into `product/` is the actual failure mode. The string list is the backstop, and it is **two-tiered** (C20), because a list of ordinary English words would fire constantly and be deleted within a week.

**Tier A — anywhere in the file, code and comments, case-insensitive.** These cannot occur innocently:

`parth`, `gmail`, `outlook`, `todoist`, `notion`, `spotify`, `sarvam`, `elevenlabs`, `whisperx`, `pyannote`, `googleapis`, `microsoft-graph`, `matter.js`

**Tier B — identifiers and string literals only, whole-word, never comments.** These are product nouns that also read as ordinary words in prose:

`council`, `ledger`, `mentor`, `rehearsal`, `proactivity`

**Deliberately not on either list:** `focus` (a DOM method and a React concept), `confirm` (a browser API and an ordinary verb), `matter` (as in "does not matter"), `brief`, `meeting`, and bare `google` or `microsoft` (they appear in URLs, licence notices and ported comments). The import rule catches every real leak these would have caught.

One escape hatch exists — `// layer-check-allow: <reason>` on the line above — and `tooling/test/layer.test.ts` caps the number of them in the repo at **five**, so the hatch cannot quietly become the rule. If a sixth is genuinely needed, that is a conversation, which is the point.

**The layer rules govern imports inside this repository only.** An external package is governed by the dependency rules, not the layer table: the `contract` layer imports Zod, and that is not a violation.

**As built at P0** (`tooling/checks/layer.ts`), four further rules, each written out literally and each with its list length asserted so it cannot grow quietly:

1. **A module specifier is never scanned** by either tier. What a file *says* and what it *depends on* are different questions, and the import rule answers the second. This replaces the substring exemption for `@parth/` that the first draft of this section used, and it is cleaner: a substring exemption would also have excused a comment that happened to contain the scope.
2. **Infrastructure is excluded from layer labelling entirely**: exactly `eslint.config.mjs` and `tooling/eslint/parth-plugin.mjs`, whose literal content *is* the plugin namespace. They are excluded rather than labelled `product`, because the `product` label would grant them an import right they must never have.
3. **One accepted first-line pragma.** Vitest reads `// @vitest-environment jsdom` only from line 1, which genuinely collides with the label's line-1 rule. After that one pragma the label takes line 2.
4. **Both tiers are exempt under the single prefix `tooling/`.** A detector has to contain the string it detects and a test has to name the value it asserts about. The tiers exist to keep the code that gets extracted at P5 free of product identity, and `tooling/` is never extracted. The import rule still applies there in full, every file still carries its label, the prefix list is asserted at length one, and nothing under `apps/`, `services/` or `packages/` may import from `tooling/`.

After P5, when the shared shape has been seen twice rather than guessed once, the extraction is a mechanical move of the `contract` and `platform` files into a `companion-platform` package that both products depend on.

---

## 9. The reuse policy, file by file

This is the table Kiro works from. `.reference/xelulu` is read-only; nothing is edited in place there.

### 9.1 Port as-is (rename `@xelulu/*` to `@parth/*`, `xelulu-plugin` to `parth-plugin`, and nothing else)

| Area | Paths in `.reference/xelulu` |
|---|---|
| Root toolchain | `package.json` (scripts and pins), `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.test.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.npmrc`, `.nvmrc`, `docker-compose.yml` |
| Repo checks | all of `tooling/checks/` (`contract-use`, `env-reads`, `exact-version`, `kebab-case`, `secret-scan`, `service-sources`, `url-scan`, `panel`, `contrast`, `audio-retention`), `tooling/compose/compose-acceptance.ts`, `tooling/eslint/no-cross-package-import.mjs`, `tooling/eslint/xelulu-plugin.mjs`, all of `tooling/test/` and `tooling/fixtures/` |
| Contract machinery | `packages/shared/src/gateway-contract/` — `primitives.ts`, `envelope.ts`, `errors.ts`, `codec.ts`, `topics.ts`, `constants.ts` and the `index.ts` export discipline. **The machinery ports; every value comes from B-P.** |
| Gateway log | ~~all of `packages/shared/src/gateway-log/`~~ — **corrected in v1.4: it does not port.** Four of its six files import the contract, so the whole directory arrives at P1. Found by Kiro at P0 against this document's own claim |
| Gateway plumbing | `services/gateway/src/` — `backoff`, `clock`, `config`, `config-error-writer`, `crash`, `deadlines`, `env`, `ids`, `listen-host`, `log/`, `mqtt/` (`ack-tracker`, `broker-session`, `command-sender`, `inbound-pipeline`, `mqtt-transport`, `transport/mqtt-js-connector`), `audio/` (`audio-server`, `audio-transport`, `audio-turn`, `synthetic-frame`, `transport/ws-audio-listener`), `devices/` (`dedupe-store`, `device-session`, `pairing-code`, `presence`, `registry`, `event-log-data`), `operator/` (all seven files) |
| Brain skeleton | `services/gateway/src/brain/` — `turn-pipeline`, `turn-responder`, `turn-latency`, `voice-brain`, `filler`, and all of `providers/` including the mocks and `provider-gate` |
| Simulator | effectively all of `services/simulator/`, including `panel/` and the whole of `test/support/` (the fake gateway, the in-memory broker, the test clock, the arbitraries) |
| Console | `apps/admin/src/` — `stream/`, `log/`, `matrix/`, `routing/`, `components/live-log`, `components/stream-status`, `components/device-health-table`, `pages/dashboard-page`, `pages/devices-page`, `pages/live-log-page`, `pages/matrix-page`, `pages/control-page`, `styles.css` |
| App shell | `apps/parent-app/` — the Expo Router setup, `src/theme/`, `src/components/` UI kit, `src/lib/` Supabase client and env access, the jest-expo config |
| Documents | `docs/C-pairing-and-device-session.md`, and `docs/intern-integration-guide.md` as the template for Parth's |

The console's test matrix deserves a line of its own. In Xelulu it builds every row at runtime by walking `CMD_ACTIONS`, `EVENT_KINDS` and `TOUCH_ZONES` out of the shared package, plus two fixed rows, so a contract list that gains a member gains its row with no edit — and a repo check proves it. **Port that property exactly.** For Parth the lists are B-P's, the zone list becomes HMI page targets, and a capability flag the device does not declare drops its rows out of the run. That is what makes F2, F3 and F4 cost nothing.

### 9.2 Adapt — same shape, Parth content

| Area | What changes |
|---|---|
| `brain/safety/` | `input-guard`, `output-guard`, `safe-text`, `forbidden-spans` keep their shape; the policy becomes the adult model in §14. **`age-shape.ts` is deleted, not relaxed.** |
| `brain/tools/` | `tool-catalogue` and `tool-router` keep the allow-listed-internal-tools discipline; the catalogue becomes Parth's, and every write tool routes through the confirmation layer and the Ledger. `device-action` gains `screen`, `screen_toast`, `bt_call`, `focus`, `matter`. |
| `brain/state/` | `memory-store` gains provenance and per-item deletion; `transcript-store` gains retention policy; `conversation-view` ports. |
| `routines/` | becomes `schedules/` — the brief scheduler, follow-up checks, healthy-work timers, wind-down. `charge-reminders` and `play-time` go. |
| `reports/` | becomes `review/` — weekly review and focus stats instead of a parent's activity report. |
| `.env.example` | ported structure, extended per §11. |
| Steering | the four Xelulu files are rewritten for Parth, plus `reuse.md` (C12). |

### 9.3 Build new — no Xelulu equivalent

`services/gateway/src/` gains: `connections/` (`google/`, `microsoft/`, `notion/`, `todoist/`, `spotify/`, plus the OAuth flow and incremental scopes), `vault/` (envelope-encrypted token store), `confirm/` (the confirmation layer), `ledger/` (the Action Ledger), `proactivity/` (the interruption budget), `briefs/`, `calendar/`, `mail/`, `tasks/`, `prep/`, `meetings/`, `research/`, `drafting/`, `council/`, `mentor/`, `rehearsal/`, `student/`, `matter/`, `btcall/`, `screen/` (the page-and-variable pusher), `admin/` (personal admin parsers), `intercom/`.

Also new: `packages/shared/src/hmi-contract/` (C11), `services/transcription/` (C10, only if self-hosted), `apps/app/` (the Parth app's own features and screens), `tooling/eval/` (the promptfoo golden set), and the Supabase migrations for the Parth schema.

### 9.4 Do not port — ever

Cry detection; `move` and `gesture` commands and the body controller; motion events; the `touch`-zone event (replaced by `screen_touch` and `tap_zone`); `age-shape` and the age-stage model; verifiable parental consent and the parent/caregiver/grandma role split; the Grandma subsystem and `grandma-asset`; the curated `starter-content` library; the "no open internet for the child" rule; `led` effects for a pixel-LED visor. Parth has one owner per device, an open capability surface, and a confirmation layer in place of a guardian.

---

## 10. Approved open-source list

The reuse order is **Xelulu first, then this list, then new code.** When a project on this list fits, Kiro clones or installs it rather than generating an equivalent. Every licence is re-checked in the phase that introduces it.

| Need | Project | Licence | What Kiro does |
|---|---|---|---|
| Monorepo, toolchain, checks, CI, contract machinery, MQTT plumbing, audio WS, gateway log, operator surface, simulator, console | the Xelulu repo in `.reference/` | ours | **port** — the largest single saving in the build |
| Firmware base, Opus over WSS, OTA, device registry patterns | ElatoAI | MIT | reference for us, clone for the intern |
| MQTT broker | EMQX **5.8.9** | Apache-2.0 (**5.9+ is BSL — stay on 5.8.9**) | install, same pin as Xelulu |
| MQTT client | MQTT.js | MIT | install |
| Auth, Postgres with RLS, storage, realtime | Supabase | Apache-2.0 | install |
| Tool-calling loop, streaming, provider switching | Vercel AI SDK | Apache-2.0 | install |
| Multi-step research with sources | open deep research | MIT | clone and strip |
| Transcription, word timestamps, speaker separation | WhisperX | BSD-2-Clause | clone as the self-host service |
| Fast Whisper backend | faster-whisper | MIT | install under WhisperX |
| Voice activity, diarisation models | pyannote-audio | MIT, **models gated by a Hugging Face agreement** | install, accept the terms knowingly |
| Google Calendar, Gmail, Tasks, Drive | googleapis | Apache-2.0 | install |
| Outlook, Calendar, To Do, OneDrive | microsoft-graph-client | MIT | install |
| Many-provider OAuth, token refresh, revocation | Nango | **Elastic — not permissive** | **reference only** (C7) |
| Matter controller over Wi-Fi from Node | matter.js | Apache-2.0 | install |
| Matter on the device | esp-matter | Apache-2.0 | reference, the intern's |
| Wake word, VAD, echo cancellation on ESP32-S3 | esp-sr | Espressif licence — **check before shipping** | reference, the intern's |
| UART smart-display driver | EasyNextionLibrary | MIT | clone, the intern's |
| App components | react-native-reusables | MIT | clone the components we use |
| App styling and motion | NativeWind, Reanimated, Moti | MIT | install |
| Orb and face animation in the app | Rive | runtime MIT; **each art file its own licence** | install, licence-check every `.riv` |
| Console UI | shadcn/ui | MIT | clone the components we use |
| Evaluation harness | promptfoo | MIT | install |
| Recurrence, timezones, scheduling | rrule, Luxon, Croner | MIT / Apache-2.0 | install |

Two things on this list are not free lunches, and I will not let us trip over either. WhisperX's diarisation needs a Hugging Face token and acceptance of a model agreement, and is imperfect by its own README — hence C8. Nango is Elastic-licensed, which is not an open-source licence for a product we sell — hence C7.

---

## 11. The connection panel

One place where every hardware and service connection is a labelled box. You paste a value in once and the whole system picks it up. **Nothing is ever hard-coded**; a repo check enforces it, and a second check scans for secrets. The app only ever receives `EXPO_PUBLIC_*` values, and its Device page shows secrets as "set" or "not set", never the value.

```
# PARTH CONNECTION PANEL. Never commit real values. Copy to .env.
# Legend: [cloud]=gateway/edge fns  [app]=Parth app  [device]=device/simulator

# --- Supabase ---
SUPABASE_URL=                  # [cloud]
SUPABASE_ANON_KEY=             # [cloud] RLS-limited
SUPABASE_SERVICE_KEY=          # [cloud] BACKEND ONLY. Bypasses RLS.
EXPO_PUBLIC_SUPABASE_URL=      # [app] same as SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY= # [app] same as SUPABASE_ANON_KEY

# --- Brain providers ---
LLM_PROVIDER=  LLM_MODEL=  LLM_API_KEY=            # [cloud]
STT_PROVIDER=  STT_API_KEY=                        # [cloud] default sarvam
TTS_PROVIDER=  TTS_API_KEY=                        # [cloud] sarvam | elevenlabs
SEARCH_PROVIDER=  SEARCH_API_KEY=                  # [cloud] research agent

# --- Transcription (meetings) ---
TRANSCRIBE_PROVIDER=  TRANSCRIBE_API_KEY=          # [cloud] hosted default
WHISPERX_URL=  HUGGINGFACE_TOKEN=                  # [cloud] self-host path only

# --- Ceilings (the brain refuses past these) ---
USER_DAILY_COST_CAP_USD=  USER_HOURLY_TOOL_CAP=  RESEARCH_COST_CAP_USD=

# --- Connections (OAuth) ---
GOOGLE_CLIENT_ID=  GOOGLE_CLIENT_SECRET=  GOOGLE_REDIRECT_URI=
MS_CLIENT_ID=  MS_CLIENT_SECRET=  MS_TENANT_ID=  MS_REDIRECT_URI=
NOTION_CLIENT_ID=  NOTION_CLIENT_SECRET=
TODOIST_CLIENT_ID=  TODOIST_CLIENT_SECRET=
SPOTIFY_CLIENT_ID=  SPOTIFY_CLIENT_SECRET=

# --- Token vault ---
VAULT_MASTER_KEY=              # [cloud] BACKEND ONLY. Wraps per-user data keys.
VAULT_KEY_VERSION=             # [cloud] rotation marker

# --- Smart home ---
MATTER_STORAGE_PATH=  MATTER_FABRIC_LABEL=  MATTER_COMMISSIONING_MODE=

# --- Device seam (Document B-P) ---
MQTT_BROKER_URL=               # [cloud][device] mqtts://host:8883
MQTT_USERNAME=  MQTT_PASSWORD= # [cloud][device]
AUDIO_WSS_URL=                 # [cloud][device] per-turn audio WebSocket
DEVICE_PROVISION_SECRET=       # [cloud] BACKEND ONLY. Issues device_id + token.
DEVICE_ID=                     # [device] cloud-issued, e.g. prt_000123
DEVICE_TOKEN=                  # [device] prototype auth; cert/key in production
DEVICE_BIND_HOST=              # [cloud][device] 127.0.0.1 closed, 0.0.0.0 for LAN

# --- Local control surfaces ---
GATEWAY_OPERATOR_PORT=  CONSOLE_PORT=  SIMULATOR_PANEL_PORT=

# --- Environment and OTA ---
APP_ENV=                       # local | staging | production
DEFAULT_TZ=                    # e.g. Asia/Kolkata
OTA_MANIFEST_BASE_URL=  OTA_SIGNING_KEY_ID=  HMI_BUNDLE_BASE_URL=
```

**Two rules about this panel, added in v1.1.**

The inline trailing comments above are *illustrative only*. The real `.env.example` uses the reference repo's **comment-above-key** form, because the ported `Panel_Check` treats everything after `=` as the declared value (C15). Once P0 lands, the repo's own `.env.example` is authoritative and this section is the reasoning behind it.

And the panel carries **no OTA signing key** (C16) and **no secret for a feature we have not built yet**. A box nobody can fill is an invitation to fill it wrongly; boxes arrive in the phase that needs them.

**Policy is not configuration** (C18). `CONFIRM_TIMEOUT_SEC`, `UNDO_WINDOW_SEC`, `PROACTIVITY_MAX_PER_HOUR`, `MEETING_AUDIO_RETENTION`, `TRANSCRIPT_RETENTION_DAYS` and `LEDGER_RETENTION_DAYS` are **defaults**. The live value is per user, in the rules engine from P4, and visible and changeable in the app's Privacy and Rules screens. The env box is what a fresh user starts with, not what they are stuck with.

**Residency is enforced at boot** (C19). `DATA_REGION` and `ALLOW_PROCESSING_OUTSIDE_INDIA` are not documentation. Every provider's `provider-declaration` gains a `data_region` field, and the ported `provider-gate` refuses to start the gateway if a declared provider's region violates the flag. A vendor that cannot state its region does not load.

The screen version of the same boxes is the Connections page in the app and the Devices tab in the console.

---

## 12. The build plan

Fifteen phases plus hosting. Each is its own chat and several Kiro specs run in waves, committed before the next. They cover the intern's milestones M0–M11 in the same order, with persistence pulled forward (C9) and the audit pulled out into its own phase.

| Phase | What gets built | Done when |
|---|---|---|
| **P0 Foundations** | Five steering files; the monorepo, toolchain pins, repo checks, the local ESLint rule, CI, Compose and EMQX, all ported; the `.env` panel; the platform/product labelling check | A clean checkout builds, lints and tests green |
| **P1 The contract** | Document B-P in code: `parth/` topics, the new events and commands, `status` with `bt_module` and `matter_hub`, **capability flags in `hello`**, the HMI page-and-variable contract, Zod schemas, codec, golden fixtures, property tests | Round-trip and rejection properties pass; fixtures match B-P exactly; a list that gains a member gains its matrix row |
| **P2 Gateway and simulator** | MQTT bridge, audio WebSocket, presence, ack tracking, the device session; the simulator as a Parth device with BT-call and Matter state, an offline toggle, and an HMI pane driven by the real page contract | The simulator pairs, heartbeats, and a `screen` / `screen_touch` round-trip works |
| **P3 Developer console** | Live stream, devices tab, the matrix derived from B-P, device control, HMI page preview, per-turn latency panel, capability-aware rows | The whole matrix walks green against the simulator |
| **P4 Identity, persistence, vault** | Supabase schema and RLS; accounts and households; the spec's data models; the envelope-encrypted token vault; the connections framework with incremental scopes; permission levels; the rules engine | You sign in, connect a test Google account, set levels, revoke — and the tokens are never readable in a log |
| **P5 Brain, confirmation, Ledger** | Speech in, model with tools, speech out; barge-in; multi-turn planning; **the confirmation layer**; **the Action Ledger**; plan/apply dry-run tools; cost and rate ceilings; the model-input redaction boundary; the golden-set harness in CI | A live tool-calling conversation through the simulator where every write is confirmed and ledgered, and the eval suite is green |
| **P6 Chief of staff** | Google and Microsoft connections; glance screen; morning and evening brief; calendar command; mail triage; tasks and follow-ups; meeting prep packs | Brief, triage and create-an-event run end to end against test accounts |
| **P7 Meeting companion** | Recording consent and announcement; long-form session; transcription with speaker separation; summary, decisions and action items; approve-and-send; retention | A mock meeting yields a reviewed summary and action items inside two minutes |
| **P8 Mentor, Council, Research, Drafting** | Multi-persona orchestration; goals, weekly review, decision journal; research agent with sources; style ingestion and drafting; rehearsal coach; student chief of staff | A Council memo and a sourced research report, end to end |
| **P9 The face** | The nine HMI pages from one grid and one token set; the face-expression sprite set; the asset bundle format; bundle OTA; simulator parity; the legibility gate in CI | Every page and variable reproduces faithfully on the mock HMI |
| **P10 Home, calls, offline** | Matter over Wi-Fi; the BT call bridge over AT commands; music; timers and alarms; household intercom; offline mode and resync with replay receipts | A Matter light toggles, a mock call is answered from the face, and pulling the network degrades honestly |
| **P11 The app** | The design system and the reorganised screens; connections; rules; privacy; the Ledger surface; the device page | You can drive the entire simulator from the app |
| **P12 Safety and security audit** | Revocation; retention; recording consent; confirmation coverage; the DPDP review; the vault review; the full evaluation gate | The safety suite is green and the checklist is signed |
| **P12.5 Hosting** | Supabase Mumbai; the gateway containerised in-region; hosted EMQX; TLS on every hop; **per-device certificates replacing the prototype token**; telemetry | A device outside your network completes a brief, a meeting and a confirmation |
| **P13 Integration** | The simulator is swapped for the real device; the matrix is walked on hardware; firmware conformance is checked; the nine HMI pages are assembled in the vendor editor | The real device does a brief, a meeting, a Matter scene and a BT call |
| **P14 Pilot** | OTA pipeline, field fixes, performance, pilot tooling | Stable multi-day runs on real units |

**Where the intern comes in: nowhere, until P13.** Send him Document B-P the day it is frozen, as a document, not a conversation. He then builds firmware beside us instead of after us, and he has nothing to ask because the document answers it.

### The pilot cut

If the pilot is a handful of people:

| Must be done before anyone gets a device | Can land after the pilot starts |
|---|---|
| P0–P8 — contract, gateway, simulator, console, identity and vault, brain with confirmation and Ledger, chief of staff, meetings, **and Council, Mentor, Research and Drafting**; P9 the face; P11 at Today, Meetings, Connections, Rules, Ledger and Privacy; P12 the audit; P12.5 hosting; P13 integration | **P10** Matter, Bluetooth calls, music; the rest of the app's surfaces; P14 pilot tooling, which can mature while the pilot runs |

P12 is not negotiable in that cut. Pilot users hand Parth their real mail and real meetings on day one, and the DPDP Act applies from the first real user, not the hundredth.

**Decided (v1.3): the pilot answers whether people want it.** Reliability can be demonstrated with five units whichever order we build in; desirability cannot be demonstrated at all without the Council, Mentor and Research, which are the only reasons someone chooses Parth over a smart speaker. **P8 therefore moves ahead of P10**, and P11 ships its six pilot surfaces with the rest following. Reversible: if an early build turns out to drop requests on home Wi-Fi, reliability becomes the question and the order flips back.

---

## 13. Beyond the spec — the world-class layer

Your intern's spec is a good spec: the features are right, the gateway delta is clean, the milestones are sane. **Everything in it stays.** What it does not yet carry is the layer that separates a working assistant from one people trust with their mail. Each addition is additive, lands in a named phase, and exists because of a specific way this product category fails.

| # | Addition | Phase | Why |
|---|---|---|---|
| A1 | **Capability flags in `hello`** — the device declares what it physically has: screen size, mic count, camera, neck, BT, Matter radio, touch pads | P1 | Parth Pro then needs no `proto_ver` bump, one codebase serves both builds, and F2–F4 stop being blockers |
| A2 | **The Action Ledger** — an append-only, user-visible record of everything Parth proposed, confirmed and did, with undo wherever the provider allows | P5 | An assistant inside your mail needs a receipt, not a promise. This is the trust spine, and the spec has nothing like it |
| A3 | **Confirmation as an interaction** — verified wake-phrase, a countdown on the face, tap-to-cancel on the HMI, a short undo window after the act | P5 | The spec requires confirmation; this makes it feel designed rather than a modal dialog read aloud |
| A4 | **Proactivity budget** — interruptions are rationed per hour, decay when ignored, and are scored against the rules engine before being spoken | P5, P6 | The main reason desk assistants get unplugged is nagging. Ration it in the architecture, not in a prompt |
| A5 | **Golden-set evaluation harness** — about 200 scripted turns across calendar, mail, meetings and research, run in CI, scoring tool choice, confirmation compliance, refusal correctness and latency | P5, gated every phase after | This is how "high accuracy" becomes a number that blocks a release instead of a hope |
| A6 | **Engineered latency** — pre-warmed speech socket, speech streamed from the first sentence, an instant on-device earcon at wake, glance data pre-fetched on the heartbeat | P5, P6 | The spec sets 1.2 s wake-to-audio. A budget is met only if every millisecond has an owner, and the console shows the per-turn breakdown |
| A7 | **Memory with provenance** — every remembered fact carries where it came from and when, and is deletable one by one | P5 | It is what makes "user-visible memory" real, and what the DPDP Act actually asks for |
| A8 | **Least-privilege connections** — scopes requested incrementally when a feature first needs them, a per-connection activity log, one-click revoke, visible health | P4 | Asking for full mail access on day one is how onboarding dies, and how a security review fails |
| A9 | **Envelope-encrypted token vault** — a per-user data key; OAuth tokens never in a log line, a stream event or a crash report; device token rotation; signed OTA with rollback | P4, P12.5 | One leaked refresh token is the whole product's trust. Xelulu's log-redaction discipline, ported and tightened |
| A10 | **Offline honesty** — the face states exactly what still works; queued actions replay on reconnect and the user is shown what was queued before it runs | P10 | An assistant that silently drops a request is worse than one that says it cannot |
| A11 | **A designed face, and a simulator that tells the truth** — nine HMI pages from one grid and one token set, a face-expression sprite set, and a simulator rendering those same pages from the same contract | P9 | A 480×320 panel at arm's length is a typographic instrument, not a dashboard. And a mock pane that does not match the display teaches you the wrong thing |

Six more I am adding in this document, beyond the eleven in the setup plan:

| # | Addition | Phase | Why |
|---|---|---|---|
| A12 | **Plan/apply dry-run on every write tool** — each write tool returns an exact diff (this event, these attendees, this recipient list, this body) which is what confirmation shows and what the Ledger stores | P5 | Confirming a paraphrase is not consent. This is also what makes undo possible and the eval harness able to score correctness rather than intent |
| A13 | **Cost and rate ceilings per user per day**, enforced in the tool router and surfaced in the console | P5 | The spec caps the research agent. Every agentic loop needs the same ceiling, or one runaway conversation is a bill and an outage |
| A14 | **A model-input minimisation boundary** — connectors hand the model a scoped, field-allow-listed view, never a raw mail body or a token, and a repo check proves no connector object reaches a prompt directly | P5, P6 | The difference between "we use your mail" and "we sent your mail to a vendor". It is also the cheapest thing to retrofit badly |
| A15 | **Turn resume** — a device that loses Wi-Fi mid-turn either resumes the turn or aborts it cleanly and says which; no half-executed tool calls | P2, P5 | Home Wi-Fi drops. A half-sent mail is the failure that ends a pilot |
| A16 | **A face legibility gate in CI** — the HMI token set carries minimum type sizes and contrast ratios for a 3.5" panel at arm's length, checked by the ported `contrast` check, and the simulator renders at true pixel density | P9 | Xelulu already ships a contrast check. Pointing it at the face costs almost nothing and prevents the single most common smart-display mistake |
| A17 | **A declared degradation ladder** — every provider names its fallback, the console shows which is live, and the brain tells the user when it is running degraded | P5, P12 | Vendors fail. A product that quietly gets worse loses trust faster than one that says "I'm on the backup voice right now" |

### On the app

The 66-screen board is the functional map and **every function on it is kept.** What changes is the structure. Sixty-six peer screens is a filing cabinet; Parth is a thing you glance at between meetings. The app reorganises around three verbs — **glance, act, review** — with one Today spine that carries the day, actions that always land in the Ledger, and everything else reachable but out of the way. Same features, roughly a quarter of the taps, dark-first because it lives on a desk. The screen-by-screen rework comes at P11, mapped against the board so you can see exactly what moved and why.

---

## 14. The safety and privacy model — adult, not child

This is the section where Parth and Xelulu diverge most, and the divergence is deliberate in both directions. **Never carry Xelulu's child-safety assumptions into Parth silently, and never carry Parth's open-capability assumptions back into Xelulu.**

The model is **open capability with a confirmation layer**, not a restricted capability with a guardian.

1. **Explicit consent for every connection.** OAuth scopes shown in plain language, requested incrementally when a feature first needs them, revocable per connection at any time, with a per-connection activity log.
2. **Three permission levels per connection** — Read, Draft, Act. Default is Draft. **Nothing irreversible ever skips confirmation at any level**: send, delete, pay, buy, book, share.
3. **Confirmation is verified and visible.** Spoken aloud *and* shown on the face, a countdown, tap-to-cancel, a verified wake-phrase for voice-only confirmation, and a short undo window after the act. What is confirmed is the exact diff (A12), not a paraphrase.
4. **Every act is ledgered.** Append-only, user-visible, with undo where the provider allows it.
5. **Recording never starts silently.** A spoken announcement and a red-ring page on the face. **Any voice in the room can say "Parth, stop recording"** — the recogniser must honour that phrase from any speaker, not only the owner. Default retention: raw audio deleted after transcription, text kept, both user-configurable.
6. **Memory is user-visible and deletable per item**, with provenance.
7. **Answers carry sources.** The research layer cites; the brain does not present an assertion as a fact where a source exists.
8. **Expert Council carries its disclaimer** — "AI perspectives, not professional advice" — on every memo, in the app and on the face.
9. **Crisis protocol.** Calm response, encourage talking to a trusted person, share helplines (India: Tele-MANAS 14416). No alert to anyone else without the user's explicit choice.
10. **Encryption and least privilege.** Tokens, transcripts and memory encrypted at rest; a per-user data key under a master key that lives only in the cloud environment; access scoped per user; tokens never in a log, a stream event or a crash report.
11. **DPDP Act 2023 and the 2025 Rules** are the compliance baseline, with Mumbai-region storage and a stated answer to whether any processing may leave India. **That answer decides which vendors are even on the list** — I need it from you before P5.
12. **One owner per device.** Household members own their own Parth; devices intercom across the household, permission-gated. `household_id` exists from P4 and scopes the intercom only — it is never a role boundary and grants nobody sight of another person's data.
13. **Retention numbers** (defaults; per-user from P4). Meeting **audio**: deleted after transcription, and a user may opt into keeping it for at most 30 days. **Transcript text**: 365 days, user-settable to 30, 90, 365 or indefinite, with per-item delete always available. **Action Ledger**: 24 months — it is the accountability receipt, and a receipt that expires in a month is not one. **Memory**: indefinite with provenance and per-item delete, because the user owns it.
14. **Languages** (C17). Voice supports `en-IN`, `hi` and `kn` at P0, behind the provider interface, with the catalogue's wider list an expansion at P8. **The face is English-only in v1**, and the app says so, because a Nextion-class display renders bitmap fonts with no complex-script shaping. Broken Kannada on a 3.5" panel is worse than honest English.
15. **Recording stops on the face** (C21). The recording page's stop button is the guarantee that PA-M05 makes, and it is reachable by anyone in the room — which is the point of the promise. The spoken "Parth, stop recording" from any voice is **additive**, and it depends on a custom wake-word model that is still an open hardware question. Recording ships on the button. If the custom model lands, the phrase is a convenience on top; if it does not, the P0 safety promise is unaffected. A safety guarantee never rests on an unconfirmed hardware item.
16. **Meetings contain other people's data.** A transcript is third-party personal data that the owner collected, so: the spoken announcement and the visible red ring are the consent mechanism and are not suppressible; speaker labels are `Speaker 1`, `Speaker 2` until the owner names them, and naming is the owner's act, not an inference; the retention policy applies to the whole transcript, not only the owner's turns; and a stop request from any voice ends the session for everyone, immediately. Under the DPDP Act the owner is answerable for what Parth recorded in their room, and the product's job is to make that obvious while it is happening rather than discoverable afterwards.
17. **Device identity.** The prototype uses a device token. Production uses a per-device certificate whose **private key is generated on the device, inside ESP32-S3 secure storage, and never leaves it** — provisioning sends a CSR, not a key. The CA vendor is a P12.5 detail; that the key never travels is not.

---

## 15. What I need from you (amended in v1.3)

**Seven of the nine items that stood here are now decided** and are recorded in §19.1. What remains is the set that cannot be delegated, because each needs a credit card, a legal identity, an account, a signature or another human being. **None of them blocks P0 through P3.**

| # | What | Blocks | Why only you |
|---|---|---|---|
| 1 | A **Supabase project** in the Mumbai `ap-south-1` region | P4 | An account in your name |
| 2 | A **Google Cloud project and OAuth client** under an account you own — and start app verification the same day | P6 | An account, and the verification runs for weeks |
| 3 | **Provider accounts and keys**: the model, speech, and a search backend | P5 | Billing |
| 4 | A **Kiro plan** with headroom for the remaining waves | the build | Billing |
| 5 | Move **both GitHub repositories into an organisation you own** | nothing, and that is the problem | Your account, your company |
| 6 | The engineer's **own BOM file**, and his answers to questions 1, 2 and 3 | nothing — capability flags absorb all three — but wanted before B-P freezes | Another person |
| 7 | **Expert sign-off on the crisis-protocol wording** | the pilot | A qualified human |

Everything else is Kiro's or mine. If a step appears in a wave report that is not on this list, it was wrongly escalated, and that is a defect in the wave rather than a task for you.

## 16. Phase P0 — the first Kiro prompt

### Before you run it

- The five manual steps in §4.1 are done, and `.reference/xelulu/packages/shared/src/gateway-contract/` has files in it.
- This document is saved as `docs/A-P-parth-master-build-guide.docx`, with the intern's spec, the catalogue, Document C and the BOM beside it.
- **P-0.1 writes no application code** (F1). It writes five steering files and proposes a skeleton. Paste Kiro's whole reply back here before anything else runs.

### Kiro settings for P-0.1

**Mode:** Spec mode.
**Model:** Opus-class (this is the architecture prompt; drop to Sonnet-class from P-0.2 onward).
**Autopilot:** off.

### Prompt P-0.1 — steering pack and the proposed skeleton

```
You are the implementation engineer for "Parth", the flagship AI chief-of-staff
companion device for adults aged 20-45. It is a static desk device with a 3.5 inch
UART smart-display face, two I2S microphones, an I2S speaker, a Bluetooth-Classic
module for phone calls, and Matter over Wi-Fi. No camera, no motors, no wheels.

Before doing anything, read these, in this order:

1. Every file in ./docs. These are the product documents. Document A-P
   (A-P-parth-master-build-guide.docx) is the operating manual and the reuse policy.
   The Parth Software Team Spec is the feature floor: every feature in it is kept.
   Document C (C-pairing-and-device-session.md) is reused unchanged except for the
   topic root. The BOM file present is a reconstruction and is NOT authoritative.
   Document B-P, the frozen wire contract, does not exist yet and arrives before the
   next step.
2. ./.reference/xelulu, which is a read-only clone of our sibling product's
   repository. It is the platform this product is built from. Read at least:
   .kiro/steering/ (all four files), package.json, pnpm-workspace.yaml,
   tsconfig.base.json, eslint.config.mjs, docker-compose.yml, .env.example,
   tooling/ (checks, eslint, compose, test), packages/shared/src/gateway-contract/,
   packages/shared/src/gateway-log/, services/gateway/src/ (especially mqtt/, audio/,
   devices/, operator/, brain/providers/, brain/turn-pipeline.ts),
   services/simulator/ (including panel/ and test/support/), and apps/admin/src/
   (especially stream/, matrix/test-matrix.ts, pages/).

NEVER modify anything inside .reference/. It is read-only reference material.

Governing rules for everything you do in this repository:

- REUSE ORDER: port from .reference/xelulu first; then a named project from the
  approved open-source list in Document A-P section 10; then new code. Never
  regenerate something that already exists in .reference/xelulu. When you port a
  file, say which file it came from.
- The toolchain pins are identical to the reference repo: Node 24.21.0,
  pnpm 10.34.6, TypeScript 6.0.3, Vitest 5.0.3, EMQX 5.8.9 (do not move to 5.9+,
  it is BSL-licensed). Package scope is @parth/*. The local ESLint plugin is
  parth-plugin.
- The wire contract has a single home and is frozen. It will live only in
  packages/shared/src/gateway-contract/, with the HMI page-and-variable contract in
  packages/shared/src/hmi-contract/. Never invent a field, rename an enum, or
  "improve" a wire format. Topic root is parth/{device_id}/ with exactly the four
  suffixes status, event, cmd, ack. Device ids are prefixed prt_. proto_ver is 2.
- SAFETY MODEL IS ADULT, NOT CHILD. Open capability, with an explicit confirmation
  layer before anything irreversible (send, buy, delete, book, share), recording
  consent that any person in the room can revoke by voice, user-visible and
  deletable memory with provenance, and answers that carry sources. Do NOT carry
  over the reference repo's child-safety model: no age stages, no verifiable
  parental consent, no guardian role split, no "no open internet" rule, no cry
  detection. Delete those concepts rather than relaxing them.
- Every file you create carries a one-line header comment labelling it either
  "platform" (knows nothing about Parth features, providers or product strings) or
  "product" (knows what Parth is). A platform file must never import from a product
  path. This will be enforced by a repo check.
- One language, TypeScript in strict mode, everywhere, with exactly one declared
  exception: a possible future self-hosted transcription service in Python, behind
  a provider interface. Do not create it now.
- Nothing is hard-coded. Every key, URL and port comes from the single .env panel.
  The app receives only EXPO_PUBLIC_* values.

In THIS STEP, do not write any application code, do not create any apps, services
or packages, and do not install any dependencies. Produce only the following, as
text, for approval.

1. Create five Kiro steering files under .kiro/steering/, following the format,
   tone and density of the four in .reference/xelulu/.kiro/steering/:

   - product.md   : what Parth is, who it is for, the adult safety and privacy
                    principles, the full PA-* feature list with its P0/P1
                    priorities summarised from the spec and the catalogue, what is
                    explicitly deferred to the later "Parth Pro" variant (camera,
                    bigger face, on-device NPU, moving neck, Matter over Thread,
                    on-device LLM, multi-user profiles), and the capability-flag
                    principle that makes that deferral free.
   - tech.md      : the stack and why, as a table: Expo React Native app;
                    react-native-reusables; Supabase (Mumbai) for auth, Postgres
                    with RLS, storage, realtime; MQTT 5 over TLS on EMQX 5.8.9 for
                    control and a per-turn WebSocket for Opus audio; a Node
                    gateway; the Vercel AI SDK for the tool-calling loop;
                    matter.js for Matter over Wi-Fi; googleapis and
                    microsoft-graph-client for connections; our own
                    envelope-encrypted OAuth token vault (NOT Nango, which is
                    Elastic-licensed); a transcription provider interface with a
                    hosted default and WhisperX as an additive self-host path;
                    open deep research for the research agent; promptfoo for the
                    evaluation harness; rrule, Luxon and Croner for scheduling;
                    Zod for every contract message; Vitest and fast-check.
                    Record every licence and which ones need re-checking before
                    shipping.
   - structure.md : the monorepo layout, the one-way dependency rule, the
                    "contract has a single home" rule, the platform/product
                    labelling rule, kebab-case files, PascalCase types,
                    snake_case wire fields exactly as the contract writes them,
                    snake_case plural DB tables, and tests beside their package.
   - safety.md    : the adult model in full: the three permission levels with
                    Draft as the default; the list of irreversible actions that
                    always confirm regardless of level; confirmation as a verified,
                    visible interaction with an undo window; the Action Ledger;
                    recording consent and the any-voice stop phrase; retention
                    defaults; memory with provenance and per-item deletion;
                    answers with sources; the Expert Council disclaimer; the crisis
                    protocol including Tele-MANAS 14416; secrets and tokens never
                    in logs, stream events or crash reports; model-input
                    minimisation; and DPDP Act 2023 plus the 2025 Rules as the
                    compliance baseline.
   - reuse.md     : the reuse policy as always-on steering. List, by path, what is
                    ported as-is from .reference/xelulu, what is adapted, what is
                    built new, and what must never be ported. Use Document A-P
                    section 9 as the source. State the rule that you check
                    .reference/xelulu before writing any file, and that a ported
                    file names its origin in its header comment.

2. Propose, as text only, the monorepo skeleton: every directory, every workspace
   package with its name, and for each one whether it is ported, adapted or new,
   naming the reference path where it is ported. Cover the app, the developer
   console, the gateway, the simulator, the shared package including both contract
   homes, supabase, tooling, and the root configuration files.

3. Propose the complete .env panel as a commented .env.example, every box labelled
   with which side fills it ([cloud], [app], [device]) and whether it is a secret
   that must never reach the app or the device. Use Document A-P section 11 as the
   source and add any box the stack genuinely needs that it is missing.

4. Propose the port manifest: a table of the specific files and directories you
   intend to copy from .reference/xelulu in the next step, grouped as port-as-is,
   adapt, or reference-only, with a one-line note for each on what changes.

5. List every assumption you made and every question the documents genuinely do
   not answer. Do not ask about anything the documents already answer; make a
   reasonable choice and state it.

Output the five steering files' full content, then items 2 to 5. Write nothing
else to disk.
```

### What I will do with the reply

I will check the steering pack against this document, check the port manifest for anything Kiro intends to regenerate that already exists, check that no child-safety concept survived, and then give you P-0.2 — which creates the skeleton — and P-0.3, which turns Document B-P into the shared contract. **P-0.3 does not run before B-P is signed off.**

---

## 17. Standing rules you can hold me to

- I give you prompts and decisions; I never ask you to write code.
- Every Kiro prompt states its model and mode **separately, above** the block, and the prompt itself names no model, mode or tool.
- I tell you the manual steps — accounts, keys, OAuth registrations, folders — clearly and separately.
- I surface conflicts between your documents rather than silently choosing. Every one of them appears as a FLAG.
- I flag licence, privacy, safety and compliance issues early, before they become rework.
- I reuse before I build: the Xelulu platform, then the approved list, then new code.
- The contract comes first, and it is frozen. A change is a `proto_ver` bump signed off by both sides.
- Nothing in the intern's spec is removed or renegotiated. Where I add, I tell you what I added and why.
- One spec at a time, in waves, committed at the end of each wave.
- I tell you when to open a new chat, and give you the Chat Starter.
- I keep Document A-P, Document B-P and every spec in step whenever anything changes.

---

## 19. Standing decisions and Kiro's authority (added in v1.3)

### 19.1 The seven decisions, closed

Each is mine as CTO, each has a reason, and each can be reversed by you at any time.

| # | Decision | Reason | Reversed by |
|---|---|---|---|
| D1 | **No processing leaves India.** `ALLOW_PROCESSING_OUTSIDE_INDIA` is `false`; the vendor shortlist is India-only, enforced at boot by the provider gate | Pilot users hand Parth real mail on day one, and the DPDP Act applies from the first user, not the hundredth | Flipping the flag and re-running the gate. A leak is not reversible |
| D2 | **The pilot answers whether people want it.** P8 moves ahead of P10 | Reliability is demonstrable with five units in any build order; desirability is not demonstrable at all without the Council, Mentor and Research | Reordering two phases |
| D3 | **Google first at P6**, Microsoft second | Restricted Gmail scopes need verification that runs in weeks and starts at P4 | Swapping which connector is built first |
| D4 | **Retention**: audio deleted after transcription; transcripts 365 days; Ledger 24 months; memory indefinite with per-item delete | The Ledger is the accountability receipt, and a receipt that expires in a month is not one. The rest is purpose limitation | Per-user settings, from P4 |
| D5 | **The engineer assembles the nine HMI pages at P13**, from the P9 spec | He has the display and the vendor's editor, and nothing else in the build depends on it | Paying someone else to do it |
| D6 | **Working cost target: ₹12,000 bill of materials per unit at pilot scale, against ₹29,000 retail** | The plan needs a number to decide what stays P0. The prototype BOM is ₹7,068 before enclosure and assembly, so there is room | One line from you. This is my assumption, not your business plan |
| D7 | **Both repositories move to an organisation you own** | The product's entire codebase currently sits in one person's personal account | Deciding not to, knowingly |

### 19.2 Kiro's standing decision mandate

Omar is the founder and does not write code. Routing an implementation choice through him costs a day and improves nothing. So the default is reversed: **Kiro decides and proceeds.**

**Kiro decides without asking, and simply states what it chose:** file and module layout inside a package; naming; decomposition; test strategy and what to assert; error handling; data structures; which reference file to port and how far to adapt it; anything the documents answer by implication; anything a later edit can undo. When the documents are silent and the choice is internal, **it chooses, states the choice in one line, and marks it reversible.** It never stalls on silence.

**Kiro decides, proceeds, and flags prominently in the wave report:** anything that contradicts a document, as the `gateway-log` finding did; any narrowing of a ported check; any dependency not already on the approved list; anything that costs money at run time; anything that moves a stated phase boundary.

**Kiro stops and asks. Four fences, and only four:**

1. **The wire contract.** No field, enum, topic, page id or value, ever, outside Document B-P and a `proto_ver` bump signed by both sides. A contract mistake freezes under someone else's firmware.
2. **The safety model.** Anything in `safety.md` — the irreversible list, confirmation, consent, recording, retention, memory, residency, the crisis protocol. These are promises to a person, not implementation details.
3. **Licences and money.** Adopting anything not on the approved list, moving past a pinned version that carries a licence implication, or anything that spends Omar's money or signs him up to something.
4. **Anything outside the repository.** User data, a provider account, a published artefact, git history that has already been pushed.

**The manual-step rule.** A step reaches Omar only if it needs a credit card, a legal identity, an account, a signature, an administrator prompt Kiro cannot satisfy, a physical device, or another human being. **Everything else Kiro attempts itself before mentioning it** — installing a toolchain, fixing a PATH, creating a folder, moving a file, pinning a version. `docs/founder-steps.md` is the only place a genuine manual step may appear.

### 19.3 Why two of those fences never move

The contract and the safety model are the two places where a mistake cannot be undone by editing a file. A contract error ships into firmware built in another city by someone who reads the document and not this chat. A safety error reaches a person who trusted the product with their mail. Everything else in this build is recoverable, which is exactly why everything else is delegated.

## 20. P0, closed (added in v1.4)

**Closed 21 October 2026.** Four commits, all pushed. On a clean clone of `cd8492f`: install, lockfile check, build, lint, format check, test and Compose acceptance all exit 0 — 26 test files, 359 passed, 3 skipped, **none skipped for a missing contract.** Zero escape hatches used of five. Both contract directories verifiably do not exist, and `packages/shared/src` holds exactly `index.ts`.

The gate that mattered most was row 4, and it was proved rather than asserted: Compose brought the stack up, both services logged one start line and then stayed silent, and a real `SIGTERM` reached PID 1 in each container and produced one stop line and exit 0. The two Windows-signal tests are `it.runIf(POSIX)`, so CI runs them.

### The four standing rules P0 produced

Each came from something that went wrong, and each applies to every phase from here.

1. **An artefact and its test ship in the same wave** (C25). Wave B shipped a `docker-compose.yml` with no `simulator` service and a `gateway` block that ended mid-definition. The wave went green because the file shipped without its four tests. A file with no test is not delivered, it is merely present.
2. **The rename rule needs an assertion, not discipline.** Two files carried `xlu_ci_sim`, the sibling product's device prefix, one of them seeded as a broker credential — a defect that would have surfaced at P2 as an authentication mystery. `layout.test.ts` now fails if any shipped file carries `xlu_`.
3. **A check that depends on `.reference/` cannot run in CI.** The reference clone is git-ignored, so it exists only on the build machine. Port-origin *shape* is asserted everywhere; port-origin *resolution* only where the clone exists — which means resolution must actually be run locally at every phase close, or header provenance quietly rots.
4. **A deferral register is a claim, and claims are checked.** Four register rows promised a "fixture half at P0" for files that had been deleted whole. The register is reconciled against the tree at every phase close, not written once.

## 18. Amendment log

**v1.1 — 20 October 2026, after reviewing Kiro's P-0.1 reply.**

| Change | Where | Why |
|---|---|---|
| Three layer labels replace two, with the banned-string list and the capped escape hatch written out | §8, C14 | Kiro correctly found that a two-label check cannot be written, because `topics.ts` must contain the product name |
| The panel uses comment-above-key form; §11's inline comments are illustrative only | §11, C15 | Kiro correctly found that the ported `Panel_Check` would fail every line of §11 as literally written |
| No OTA signing key in the panel | §11, C16 | Signing moves to the release pipeline; a signing key in a service environment makes any gateway compromise an update compromise |
| No secret boxes for unbuilt features (the phone-companion push token is removed until its phase) | §11 | A box nobody can fill is an invitation to fill it wrongly |
| Policy numbers are per-user in the database; env holds the default | §11, §14.13, C18 | A user-visible setting that lives only in a deploy environment is not user-visible |
| Providers declare a data region and the gateway refuses to boot on a violation | §11, C19 | Residency enforced by the ported `provider-gate`, not by memory |
| Retention numbers set | §14.13 | Kiro asked; audio had a default, transcripts and the Ledger did not |
| The face is English-only in v1; the voice is not | §14.14, C17 | A Nextion-class display has bitmap fonts and no complex-script shaping. This is a hardware fact, not a scope cut |
| Device private keys are generated on-device and never travel | §14.15 | Kiro asked which CA; the CA is a detail, the key never leaving is not |
| `household_id` scopes the intercom only | §14.12 | Confirming Kiro's assumption 15 in the document, not just in a chat |

**v1.2 — 20 October 2026, after reviewing Kiro's steering pack and BOM v4.**

| Change | Where | Why |
|---|---|---|
| The banned-string list becomes two-tiered, and `focus`, `confirm`, `matter`, `brief`, `meeting`, bare `google` and bare `microsoft` come off it | §8, C20 | They are DOM methods, browser APIs and ordinary English. A check that fires on them is a check that gets deleted |
| Layer rules are stated to govern in-repo imports only; the contract may import Zod | §8 | It would otherwise have blocked P1 on a technicality |
| Recording's P0 guarantee is the on-screen stop button; the voice phrase is additive | §14.15, C21 | The any-voice phrase depends on a custom WakeNet model that is an open hardware item, and a safety promise may not rest on one |
| Third-party data in meetings written out: announcement not suppressible, `Speaker N` until named, retention covers the whole transcript | §14.16 | The owner is answerable under DPDP for what Parth recorded in their room |
| `tap_zone` freezes at six names and `touch_pads` declares which are fitted, not how many | C22 | A count tells the cloud nothing about which card to show |

**v1.3 — 20 October 2026, at the founder's direction: close the open decisions and stop generating manual steps.**

| Change | Where | Why |
|---|---|---|
| The seven open founder decisions are closed, each with a reason and what reverses it | §19.1, C23 | An open question nobody is answering is a stall with a polite name |
| Kiro gets a standing decision mandate: decide and proceed by default, four fences only | §19.2, C24 | The founder does not code; routing implementation choices through him costs a day each |
| The manual-step rule: Kiro attempts anything that does not need a card, an identity, an account, a signature, an admin prompt, a device or another person | §19.2 | Most of what was being handed to Omar was work Kiro could do from its own terminal |
| §15 cut from nine items to seven, all of them accounts, money or people | §15 | What remains is what genuinely cannot be delegated |
| The pilot answers desirability; P8 moves ahead of P10; the pilot cut table updated | §12, D2 | Reliability is demonstrable in any build order; desirability is not |
| A working cost target recorded: ₹12,000 BOM at pilot scale against ₹29,000 retail | D6 | The plan needs a number to decide what stays P0. Overrule it whenever |

**v1.4 — 21 October 2026, at the close of P0.**

| Change | Where | Why |
|---|---|---|
| P0 recorded as closed, with its gate evidence and the four standing rules it produced | §20, C25 | A phase that closes without recording what it taught repeats itself |
| §4.1's two `echo >> .gitignore` lines corrected | §4.1 | PowerShell writes UTF-16LE; git read none of it, so `.env` was never ignored |
| The layer check's four as-built rules written out: specifiers unscanned, infrastructure excluded, one pragma exception, `tooling/` exempt from both tiers | §8 | All four were discovered by building the check rather than specifying it |
| §9.1's claim that `gateway-log` ports as-is is struck | §9.1 | Four of its six files import the contract. Kiro found it against this document |

**Next: chat 2 — Document B-P, the frozen Parth gateway and hardware seam.** Open it after you have pasted Kiro's P-0.1 reply here and I have reviewed it.
