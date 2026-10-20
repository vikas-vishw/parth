---
inclusion: always
---
# Parth: Product

## What it is
Parth is an AI chief-of-staff companion for adults. It is a static desk device: a 3.5" resistive-touch UART smart display for a face, two I2S microphones, an I2S speaker, an external Bluetooth-Classic module for phone calls, and Matter over Wi-Fi. It listens, talks, shows glanceable cards, runs the day, sits in meetings, researches, drafts, and acts on the user's own mail, calendar and tasks with permission.

It is the third product in a family that shares one platform: Xelulu (1-12), Sathi/WithU (12-20), **Parth (20-45)** and Sarthi (45+). Parth is built from Xelulu's platform, held read-only in `.reference/xelulu`. Every file carries a one-line header comment naming its layer - `contract`, `platform` or `product` - so the shared package can be extracted after P5 without guessing its shape now. See `structure.md` and `reuse.md`.

The face is a smart display: it renders its own pages from assets on its own micro-SD card, and the cloud pushes a page id and a set of variables, never pixels and never coordinates. The app is where anything long or dense is read.

No camera. No wheels, no arms, no neck, no ToF.

## Who it is for
- Adults aged 20-45: founders, operators, managers, consultants, and students carrying a professional load (PA-E05).
- **One owner per device.** There is no parent, no caregiver, no guardian and no role split. Household members each own their own Parth; devices intercom across the household, permission-gated (PA-H04). `household_id` exists from P4 and scopes the intercom only - it is never a role boundary and grants nobody sight of another person's data.
- India-first, with the limits stated honestly - see **Languages** below.

## Product principles
1. **Open capability, confirmed.** Parth reaches the open internet, the user's mail, calendar, tasks, documents and smart home. The safety model is a confirmation layer, not a restricted surface. See `safety.md`.
2. **Glance, act, review.** Three verbs. The face is for glancing, the voice is for acting, the app is for reviewing. The 66-screen board is the functional map; the structure is these three verbs.
3. **A receipt, not a promise.** Every proposal, confirmation and act lands in the Action Ledger, user-visible, with undo wherever the provider allows it.
4. **Interruption is earned.** Proactivity is rationed per hour, decays when ignored, and is scored against the user's rules before it is spoken. The main reason a desk assistant gets unplugged is nagging.
5. **Sources, not opinions.** Where a source exists, the answer carries it. Expert Council memos carry their disclaimer.
6. **Privacy is a surface, not a policy.** Memory is listed and deletable per item, with provenance. Retention is a setting the user can see and change. Export and account deletion are features, not support tickets.
7. **Honest degradation.** Offline, the face states exactly what still works. On a provider fallback, Parth says it is running degraded.
8. **Latency is a feature.** An earcon fires on-device at wake; speech streams from the first sentence; glance data is pre-fetched on the heartbeat.
9. **The face is a typographic instrument, not a dashboard.** 480x320 at arm's length. One grid, one token set, minimum type sizes and contrast ratios checked in CI.

## Languages (C17)
- **Voice supports `en-IN`, `hi` and `kn` at P0**, behind the `SttProvider` and `TtsProvider` interfaces. The catalogue's wider list is an expansion at P8, not a P0 promise.
- **The face is English-only in version 1.** A Nextion-class smart display renders bitmap fonts with no complex-script shaping, so Devanagari and Kannada on the 3.5" panel would be broken text, not localisation. Honest English on the face beats broken Kannada.
- **The app states this plainly** - "Parth speaks Hindi and Kannada; the screen is English in this version" - rather than implying the face is localised.
- **This is reversible.** If the display's own editor turns out to shape those scripts, the face follows the voice. It is a hardware fact today, not a scope cut.

## v1 hardware facts that override the feature catalogue
- A 3.5" 480x320 resistive-touch UART smart display replaces the catalogue's 5.5" face. It is Nextion-class: pages and variables over UART, assets on its own micro-SD, bitmap fonts.
- **No camera.** Every camera-dependent feature is deleted, not relaxed.
- **No movement.** No wheels, arms, neck, gimbal or ToF. No `move`, `gesture` or motion events exist in Parth's contract.
- Two INMP441 I2S microphones.
- The Bluetooth-Classic module is external and generic. `bt_call` exists in the contract; the capability flag decides whether the feature exists on a unit.
- Matter **over Wi-Fi only**. There is no Thread radio in the BOM.
- Battery is 1S2P; the device is static and desk-powered.
- `docs/Parth_BOM_ESP32S3_v4.xlsx` as present is a reconstruction and is **not authoritative**. The intern's file wins when it arrives.

## Capability flags in `hello`
The device declares what it physically has. **The names are fixed now so Document B-P is not blocked; B-P freezes their exact wire shape.**

| Flag | What it declares |
|---|---|
| `screen` | the face's width and height in pixels |
| `mics` | how many microphones are fitted |
| `speaker` | whether an output path exists |
| `touch_pads` | **which** of the six `tap_zone` names this unit has fitted - a list, not a count |
| `bt_call` | whether the Bluetooth module is fitted and controllable (gates PA-C11) |
| `matter` | whether a Matter radio and stack are present (gates PA-H01) |
| `camera` | false on every v1 unit; true on Parth Pro |
| `neck` | false on every v1 unit; true on Parth Pro |
| `doa` | whether microphone-array direction of arrival works (gates PA-M02's indicator) |

### Touch zones: a six-name closed list
`tap_zone` freezes at exactly six names, and no more are added later:

`head_top`, `head_left`, `head_right`, `head_back`, `base_front`, `base_rear`

The `touch_pads` capability declares **which of those six zones a unit has fitted, not how many**. A count tells the cloud nothing it can use: knowing a unit has three pads does not say whether a tap means "leave a note" or "snooze the brief", so it cannot decide which card to show. A list does. Document B-P freezes the wire shape; the names are fixed now.

Three consequences, and they are the whole reason the Parth Pro deferral costs nothing:
1. **One codebase serves both builds.** Parth Pro declares `camera` and `neck`; the same gateway lights up features that were always there. No `proto_ver` bump.
2. **A feature gates on a flag, never on a build constant.** **A capability the device does not declare makes its feature report unavailable in the app** - stated, not hidden - and the feature does not run.
3. **The console's test matrix drops its rows.** The matrix is derived from the contract at runtime, so a capability a device has not declared drops out of the run rather than failing it.

## Open hardware items
Owned by the hardware side. None of them blocks P0, because each is absorbed by a capability flag; each is named here with the feature it decides.

| Open item | Decides |
|---|---|
| The Bluetooth module's part number, and whether it exposes an AT command set and the hands-free profile | PA-C11 speakerphone, and whether `bt_call` is ever declared |
| Whether TTP223 touch pads are in the build | `tap_zone`, and PA-F02's "tap to leave a note" |
| Whether microphone-array direction of arrival works on the ESP32-S3 | PA-M02 - a direction indicator if yes, an honest listening animation if no |
| Whether the wake word "Parth" requires a custom WakeNet model, and what that takes | wake-word **accuracy**, the **latency budget**, and the **convenience phrases** "Parth, confirm" and "Parth, stop recording". **It does not decide PA-M05.** Recording ships on the face's stop button, and a safety guarantee never rests on an unconfirmed hardware item. |
| Which fonts and scripts the 3.5" display's editor supports | whether the face stays English-only (C17) or follows the voice |

## Launch features (P0)
PA-* ids are the catalogue's. Priorities are the intern's spec, which is the feature floor: nothing in it is removed or renegotiated.

**Chief of staff (PA-C)**
- PA-C01 **Glance screen**: status strip (time, weather, temp) always on, plus rotating main cards - next meeting with countdown, agenda, top tasks, commute, focus timer. Pushed every 15 s or on event.
- PA-C02 **Morning and evening brief**: scheduled, pulls calendar, mail priority, tasks, weather and opted-in news, composes, speaks, and shows cards. User sets time and categories.
- PA-C03 **Calendar command**: Google Calendar and Microsoft 365. Tools to list, create, move, cancel, find a free slot and propose times. Anything touching another person confirms.
- PA-C04 **Mail triage**: Gmail and Outlook. Priority classifier against the user's rules and VIP list, summariser, draft composer. Sending always confirms.
- PA-C05 **Tasks and follow-ups**: Todoist, Notion, Google Tasks, Microsoft To Do. A follow-up tracker that watches sent mail and reminds on the glance screen when no reply arrives.
- PA-C06 **Meeting prep packs**: 15 minutes before a meeting, attendees cross-referenced against recent mail and notes, linked docs fetched, one prep card to the face and the app.
- PA-C07 **Research agent**: multi-step web research with search, open, extract and cite. Produces a report with source links. Step, rate and cost capped per request.
- PA-C08 **Drafting in the user's style**: style-sample ingestion the user approves sample by sample, then a per-user writer. Output to the app or a connected doc tool.

**Connection order: Google first, Microsoft second.** Both are P0, but P6 builds Google end to end before it starts Microsoft. Google's restricted Gmail scopes need app verification and an independent security assessment that runs in **weeks** and starts at **P4** (F7); Microsoft has no equivalent gate, so Microsoft is the one that can wait. Building them in the other order would leave the long pole untouched until the end.

**Meeting companion (PA-M)**
- PA-M01 **In-room notes**: a long-form audio session, the face switches to the recording page with a red ring, and the announcement is spoken. Audio is deleted after transcription by default.
- PA-M02 **Speaker direction** (reduced): mic-array direction estimation only, gated on the `doa` flag. Diarisation happens in the transcription service.
- PA-M03 **Summary and action items**: within two minutes of the meeting ending - decisions, action items with owners and due dates, open questions. The user approves before any resulting mail, task or calendar write.
- PA-M05 **Consent controls**: recording never starts silently. **The stop button on the face is the P0 guarantee** - on the device, reachable by anyone in the room, and never disabled while a session is open. The spoken "Parth, stop recording" from any voice is **additive** and rides a wake-word model that is still an open hardware item, so it does not gate this feature. Retention default is audio deleted after transcription; see `safety.md` for the numbers and for what recording other people obliges us to do.

**Focus (PA-F)**
- PA-F01 **Bird's Eye focus**: a focus session state machine, the focus page on the face, optional phone DND via the companion app, and VIP and urgent rules evaluated per notification before it is relayed.

**Mentor and Expert Council (PA-E)**
- PA-E01 **Expert Council**: up to six named lenses, each with its own system prompt, independent views, then a synthesised memo. Delivered to the app, not read aloud in full. Always labelled "AI perspectives, not professional advice".
- PA-E02 **Mentor mode**: quarterly and weekly goals, a weekly review flow, a decision journal surfaced later for reflection, and a commitment tracker that never shames.
- PA-E03 **Rehearsal coach** (reduced): role-play as interviewer, investor or counterpart, with feedback on structure, pace and filler words. Eye-contact feedback is dropped - no camera.
- PA-E05 **Student chief of staff**: semester planner, deadline tracker, lecture and paper summariser, thesis coach prompts, placement practice, internship tracker. Shares infrastructure with PA-C and PA-E02.

**Home and life (PA-H)**
- PA-H01 **Smart home over Matter** (Wi-Fi only): commissioning, scenes, routines, status cards on the glance screen.
- PA-H03 **Timers, alarms, reminders, lists**: core primitives, and they must work offline.
- PA-H05 **Everyday knowledge**: general Q&A, translation, cooking, units and currency, news explained - in the three P0 voice languages.

**Offline (P0 behaviour)**
Wake word, touch screen and taps, previously synced timers, alarms and reminders, a cached last-known brief with an offline indicator, Bluetooth calls through the paired phone, and local Matter scenes if the stack is on the device. The line is: *"I can't reach the brain right now - your timers, calls and lights still work."* On reconnect, queued events flush, missed briefs are fetched, pending config and OTA apply, and **the user is shown what was queued before it runs**.

**The nine HMI pages (P0)**
`home`, `brief`, `meeting_card`, `focus`, `call`, `council_memo`, `recording`, `offline`, `pairing`. One grid, one token set, stable logical target names per tappable region. No pixel coordinates cross the seam. The page-and-variable contract lives in the frozen contract, not in the app or the firmware.

## The trust spine (P0, and the reason this is a product and not a demo)
Not in the intern's spec; added on top, each in a named phase.
- **The Action Ledger**: append-only, user-visible, undo where the provider allows.
- **Confirmation as an interaction**: a verified wake-phrase, a countdown on the face, tap-to-cancel, and a short undo window after the act.
- **Plan/apply dry-run on every write tool**: what is confirmed is the exact diff, not a paraphrase. The same diff is what the Ledger stores.
- **Proactivity budget**: interruptions rationed per hour, decaying when ignored.
- **Memory with provenance**: every remembered fact carries where it came from and when, and is deletable one by one.
- **Least-privilege connections**: scopes requested incrementally when a feature first needs them, a per-connection activity log, one-click revoke, visible health.
- **Envelope-encrypted token vault**: a per-user data key; tokens never in a log, a stream event or a crash report.
- **Model-input minimisation**: connectors hand the model a scoped, field-allow-listed view, never a raw mail body and never a token.
- **Cost and rate ceilings** per user per day, enforced in the tool router and shown in the console.
- **Turn resume**: a device that loses Wi-Fi mid-turn resumes or aborts cleanly and says which. No half-executed tool calls.
- **Degradation ladder**: every provider names its fallback, the console shows which is live, and Parth says when it is running degraded.
- **Golden-set evaluation harness**: scripted turns across calendar, mail, meetings and research, run in CI, scoring tool choice, confirmation compliance, refusal correctness and latency. "High accuracy" is a number that blocks a release.

## Later (P1 - design for, do not build yet)
- PA-C09 Personal admin: bill, renewal, itinerary and parcel parsers, voice-captured expenses.
- PA-C10 Phone bridge for notifications: companion app, Android first; iOS limited to calendar, mail and reminders. Its push transport and its secret arrive in the phase that builds it, not before.
- PA-C11 Bluetooth speakerphone: one-time pairing from the app, call audio through the module's mic and Parth's speaker, answer and hang up over AT commands, call page on the face. Gated by the `bt_call` flag.
- PA-M04 Live assist: whispered retrieval over the past-meeting index shown on the face, not spoken, plus time-keeping toasts.
- PA-F02 Walk-up handling (simplified): "tap to leave a note" via the touch screen or a TTP223 pad. Camera and ToF detection are gone.
- PA-F03 Healthy work habits (reduced): hydration, 20-20-20 eye rest, stand-and-stretch. The camera posture nudge is gone.
- PA-F04 Wind-down: end-of-day reflection prompts, open loops captured, tomorrow's first task set, good-night face.
- PA-E04 Skill plans: learning plans, resource curation, spaced practice.
- PA-H02 Music and media: Spotify, YouTube Music, podcasts, over I2S or the Bluetooth module.
- PA-H04 Household intercom: voice-only calls to another Companion device, permission-gated. This is the voice-only survivor of PA-W05.

## Deferred to Parth Pro - not in v1, designed for
Parth Pro is a later variant, not a stretch goal of this build. The catalogue describes it; this BOM cannot run it.
| Deferred | Consequence in v1 |
|---|---|
| 4K camera | PA-W01-W04 deleted. Posture nudge, eye-contact feedback, camera walk-up detection and camera speaker tracking deleted. The app marks v1 the **voice edition** and shows these as "coming to Parth Pro". The `camera` flag is false on every unit. |
| A larger 5.5" face | Nine pages are designed for 480x320. The grid and token set carry the size, so a bigger panel is a token change - and a panel with real font shaping is what ends C17. |
| On-device NPU | Everything above the wake word is cloud. |
| A moving (gimbal) neck | PA-M02 is a direction indicator on the face, never a head turn. The `neck` flag is false on every unit. |
| Matter over Thread | Matter over Wi-Fi only. No Thread radio exists in the BOM. |
| On-device LLM | No local model path, no local inference config. |
| Multi-user profiles on one device | One owner per device. The household intercom is how two people share a home. |

## The app
Nine areas on one Today spine. Every function on the 66-screen board is kept; the structure is glance, act, review, dark-first, because it lives on a desk.
| Area | What is in it |
|---|---|
| Today | Agenda, tasks, follow-ups, meeting summaries, focus stats |
| Meetings | Transcripts, summaries, decisions, action items, approve-and-send |
| Council & Mentor | Council memos, goals, weekly reviews, decision journal |
| Research & Drafts | Reports, drafts, sources, export to connected tools |
| Connections | Per-service OAuth, permission levels, scopes in plain language, revoke, activity log |
| Rules | VIPs, urgent rules, focus rules, working hours, act-without-asking defaults, the confirmation timeout, the undo window and the proactivity budget |
| Ledger | Everything proposed, confirmed and done, with undo |
| Privacy | Memory list and per-item delete, retention settings, recording policy, export, account deletion |
| Device | Mic status, Matter hub, Bluetooth pairing, updates, diagnostics, and **which capabilities this unit declared** |

The app never talks MQTT. It talks to Supabase over HTTPS and Realtime, and receives only `EXPO_PUBLIC_*` values. Secrets show as "set" or "not set", never as a value.

## Build order, and the pilot cut (D2)
**The pilot answers whether people want Parth, not whether it stays up.** Reliability is demonstrable with five units in any build order; desirability is not demonstrable at all without the Council, Mentor and Research. So the order moves:

- **P8 (Mentor, Council, Research, Drafting) runs ahead of P10 (Matter, BT calls, music).**
- **P11 ships six areas for the pilot**: Today, Meetings, Connections, Rules, Ledger and Privacy. Council & Mentor, Research & Drafts and Device land after the pilot starts.
- P12 (the safety and security audit) is not negotiable in any cut. Pilot users hand Parth real mail on day one.

| Phase | What it is | Pilot |
|---|---|---|
| P0 | Foundations: the monorepo, the toolchain, the checks, the panel | before |
| P1 | The contract, from Document B-P | before |
| P2 | Gateway and simulator | before |
| P3 | The Parth Developer Console | before |
| P4 | Identity, persistence, the token vault | before |
| P5 | Brain, confirmation, the Ledger | before |
| P6 | Chief of staff - **Google first, Microsoft second** (D3) | before |
| P7 | Meeting companion | before |
| **P8** | **Mentor, Council, Research, Drafting - moved ahead of P10** | **before** |
| P9 | The face: the nine HMI pages | before |
| P11 | The app - Today, Meetings, Connections, Rules, Ledger, Privacy | before |
| P12 | Safety and security audit | before |
| P12.5 | Hosting | before |
| P13 | Integration on real hardware. **The engineer assembles the nine HMI pages here** (D5) | before |
| P10 | Home, calls, offline | after |
| P11+ | The rest of the app's areas | after |
| P14 | Pilot tooling, OTA, field fixes | during |

## Cost target (D6, the founder's working assumption)
**INR 12,000 bill of materials per unit at pilot scale, against INR 29,000 retail.** The prototype BOM is INR 7,068 before enclosure and assembly, so there is room. This is what decides what stays P0 when a feature needs a part. It is a working target and one line from Omar reverses it.

## Latency target
- Wake: an earcon and a listening face immediately, on the device, before the cloud is involved.
- End of the user's speech to first audio: **1.2 s**, as the spec sets it. Every millisecond has an owner and the console shows the per-turn breakdown.
- Long runs (research, drafting, Council) show "working on X" with progress on the glance screen rather than silence.
- Meeting summary within two minutes of the meeting ending.

## How we work
- Omar (founder) approves everything.
- Claude is CTO, PM and hardware-architecture reviewer.
- The intern owns firmware and hardware and is not needed until P13. He builds to Document B-P as a document, not a conversation. At P13 the real device is made to behave like the simulator already does.
- Kiro is the implementation engineer. One spec at a time, in waves, committed at the end of each wave. No code before its spec is approved.
- **Document B-P does not exist yet.** It is the frozen wire contract and the single authority on every field, enum and topic. No application code is written from any field list in this steering pack, and **no file in `packages/shared/src/gateway-contract/` is created before B-P is signed off**. If code disagrees with B-P, the code is wrong.
- **Seven founder decisions are closed, not open** - residency, the pilot's question, the connection order, retention, who assembles the HMI pages, the cost target, and the repository move. They live in `decisions.md` and they are not in any open-items list. Read that file before asking anything.
- **The default is reversed**: Kiro decides and proceeds, states the choice in one line in the wave report, and marks it reversible. Four fences only - the wire contract, the safety model, licences and money, and anything outside this repository.
- Precedence when documents disagree: B-P, then Document C, then the Hardware and Order Review, then Document A-P, then the intern's Parth Software Team Spec, then the Companion Intelligence Feature Catalogue.
