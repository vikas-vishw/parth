---
inclusion: always
---
# Parth: Adult safety, privacy & trust (non-negotiable)

These rules override convenience, feature requests and performance. If a task conflicts with them, stop and flag it.

**The model is open capability with a confirmation layer, not restricted capability with a guardian.** Parth is an adult product holding mail, calendar, meetings, documents and money-adjacent tools. The adult model is **not a relaxed child model**; it is a different model. The sibling product's child-safety concepts are **deleted, not loosened**: no age stages, no `age_shape`, no verifiable parental consent, no parent/caregiver/grandma role split, no "no open internet" rule, no cry detection, no curated-content-only answers. Carrying any of them into Parth silently is a design error. Carrying Parth's open capability back into Xelulu is a safety incident.

**One rule above all the others: a safety guarantee never rests on an unconfirmed hardware item.** Where a promise could be built two ways, it is built on the confirmed way and the unconfirmed way is additive. Section 8 is the worked example.

## 1. Consent for every connection
- OAuth scopes are shown in **plain language** before the user grants them, not as a vendor scope string.
- Scopes are requested **incrementally**, when a feature first needs them. Asking for full mail access on day one is how onboarding dies and how a security review fails.
- Every connection is **revocable per connection at any time**, in one action, and revocation takes effect before the next tool call.
- Every connection carries a **per-connection activity log** and visible health, in the app.

## 2. Three permission levels, with Draft as the default
| Level | What Parth may do |
|---|---|
| `read` | See this data: briefs, triage, prep packs, research context. |
| **`draft`** (default) | Compose, but must ask before anything leaves. |
| `act` | Act without asking - **except** that nothing irreversible ever skips confirmation. |

`act` is additionally bounded by the user's working hours. The default for a new connection is `draft`, always.

## 3. The irreversible list - always confirms, at every level
**Send. Delete. Pay. Buy. Book. Share.**

No permission level, no rule, no working-hours window and no "act" setting skips confirmation for any of these. If a new tool's effect is outside the user's control once it runs - a mail leaves, a calendar invite reaches another person, a file becomes public, money moves, a record is destroyed - it belongs on this list, and the default answer for a new write tool is that it does.

## 4. Confirmation is a verified, visible interaction
- **Spoken aloud and shown on the face**, with a countdown and tap-to-cancel on the HMI.
- Voice-only confirmation requires a **verified wake-phrase** ("Parth, confirm"). An ambient "yeah" is not consent.
- **What is confirmed is the exact diff**, never a paraphrase: this event, these attendees, this recipient list, this body, this amount. Every write tool runs plan/apply and returns that diff; confirming a summary of an action is not confirming the action.
- A **short undo window** follows the act, surfaced on the face and in the app.
- A confirmation that is not answered **expires into "not done"**. Silence is never consent.
- The tap-to-cancel target on the HMI is the confirmed path. The spoken confirm phrase is the convenience path, and it depends on the same wake-word model as section 8; if that model is weak, confirmation still works, by touch.

## 5. Policy is not configuration (C18)
`CONFIRM_TIMEOUT_SEC`, `UNDO_WINDOW_SEC`, `PROACTIVITY_MAX_PER_HOUR`, `MEETING_AUDIO_RETENTION`, `TRANSCRIPT_RETENTION_DAYS` and `LEDGER_RETENTION_DAYS` are **defaults only**.

- The **live value is per user**, held in the database and read through the rules engine **from P4**.
- Every one of them is **visible and changeable in the app** - the retention numbers on the Privacy screen, the confirmation timeout, undo window and proactivity budget on the Rules screen.
- The env box is what a fresh user starts with, not what they are stuck with. **A user-visible setting that only exists in a deploy environment is not user-visible.**
- No code path reads one of these from env after P4. Before P4 the default is the only value there is, and that is the only window in which env is the answer.

## 6. Retention numbers (decided - D4, closed)
Defaults; per-user from P4, per section 5. This is founder decision D4 in `decisions.md`, not an open item.

| What | Default | User may set it to |
|---|---|---|
| Meeting **audio** | **deleted after transcription** | keep for at most **30 days**, by explicit opt-in |
| **Transcript text** | **365 days** | 30, 90, 365 or indefinite - with **per-item delete always available** |
| **Action Ledger** | **24 months** | not shortened below the accountability floor; it is the receipt, and a receipt that expires in a month is not one |
| **Memory** | **indefinite**, with provenance | per-item delete, always; the user owns it |

- No audio is ever written to disk, Storage, logs, analytics or a crash report outside the meeting session's own encrypted store. `tooling/checks/audio-retention.ts` is pointed at this.
- "Delete all" really deletes.
- Voice samples and writing-style samples are **household-locked** and used only for what the user approved them for.
- Provider adapters are configured for **zero retention and no training** wherever the vendor offers it, and the setting is recorded in the adapter.

## 7. Every act is ledgered
The **Action Ledger** is append-only and user-visible. Each entry carries what was proposed, the exact diff, who confirmed it and when, the outcome, and the undo handle where the provider offers one. An assistant inside your mail needs a receipt, not a promise. Nothing writes to a provider without a Ledger entry, and the entry is written before the provider call, not after.

## 8. Recording never starts silently, and it stops on the face
**The stop button on the recording page is the P0 guarantee.** Everything else about stopping a recording is additive to it.

- Recording never starts silently: a **spoken announcement** and the **red-ring recording page** on the face. No silent session, ever, for any reason.
- **The stop control is on the face.** It is physically present in the room, reachable by **anyone in the room** - not only the owner, and not only someone holding the owner's phone.
- **`can_stop` is never false while a session is open.** There is no mode, no setting, no provider state and no network condition in which a recording is running and the stop target is unavailable. If the page cannot show a live stop target, the session does not start.
- The stop is immediate: the session ends, the face leaves the recording page, and what was captured so far follows the retention policy in section 6.
- **The spoken stop phrase is additive.** "Parth, stop recording", honoured from **any voice, not only the owner's**, is the thing we want and it is still the design. But it rides a wake-word model whose cost and accuracy on this hardware are an **open hardware item** (see `product.md`), and a safety promise cannot be owed to an unconfirmed component.
- **Therefore recording ships on the button.** PA-M05 is not gated by the wake-word question. If the custom model lands, the phrase is a second route to the same stop. If it does not, the guarantee is unchanged and the product does not have to apologise for it.
- Nothing here is suppressible. See section 9.

## 9. Meetings contain other people's data
A meeting recording is the only place where Parth holds data about people who never agreed to anything with us. That changes what the product owes.

- **The spoken announcement and the visible red ring are the consent mechanism.** They are not a notification, not a nicety and not a preference. **No setting suppresses either of them** - not a user setting, not an admin setting, not a quiet-hours rule, not a focus mode, not a developer flag. A build in which they can be turned off is a build we do not ship.
- **Speaker labels are `Speaker 1`, `Speaker 2` and so on until the owner names them.** Diarisation separates voices; it does not identify people.
- **Naming a speaker is the owner's act and is never an inference.** Parth does not guess a name from the calendar invite, the voice, the mail thread or anything else. It may offer the attendee list as choices; the owner picks. An identity Parth assigned itself is an identity nobody consented to.
- **The retention policy applies to the whole transcript, not only the owner's turns.** There is no path in which the owner's words are deleted and a guest's words survive, and none in which a guest's words are kept longer because they were useful. One transcript, one policy, one deletion.
- **A stop request ends the session for everyone, immediately** - whether it came from the face's button or from any voice in the room. There is no per-speaker stop, no "stop recording me", no partial session. The room is the unit.
- Under the **DPDP Act** the owner is answerable for what Parth recorded in their room. The product's job is to make that **obvious while it is happening** rather than discoverable afterwards: the ring is lit, the announcement was spoken, the stop target is in reach, and the Ledger says what was kept.

## 10. Memory is user-visible, provenanced and deletable per item
Every remembered fact carries **where it came from and when**. The app lists all of it and deletes it one item at a time. That is what makes "user-visible memory" real, and it is what the DPDP Act actually asks for. A memory item with no provenance is a bug.

## 11. Answers carry sources
- The research layer cites. Every claim in a report carries a source link.
- The brain does not present an assertion as a fact where a source exists.
- This replaces the sibling product's "no open internet" rule. Parth reaches the internet; the discipline is attribution, not prohibition.

## 12. Expert Council carries its disclaimer
Every memo, in the app and on the face, is labelled **"AI perspectives, not professional advice."** The Council does not give medical, legal or financial advice in the professional sense, and the label is not optional, not collapsible and not a settings toggle.

## 13. Crisis protocol
A calm response. Encourage talking to a trusted person. Share helplines - **India: Tele-MANAS 14416**. **No alert to anyone else without the user's explicit choice**: Parth has one adult owner and no guardian to escalate to. The final wording needs expert sign-off before the pilot.

## 14. Secrets and tokens never leave the backend
- `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_PASSWORD`, `DEVICE_PROVISION_SECRET`, `VAULT_MASTER_KEY`, `OAUTH_STATE_SECRET`, every OAuth client secret and every provider key exist **only in backend env**. They never reach the app or the device.
- **There is no OTA signing key anywhere in the panel** (C16). Manifests are signed in the release pipeline. The gateway holds only `OTA_SIGNING_KEY_ID`; the device holds only the public key. A signing key in a service environment would make any compromise of the gateway a compromise of every future update.
- **No secret box exists for a feature we have not built.** The phone-companion push token arrives in the phase that builds PA-C10, not before.
- The app ships only `EXPO_PUBLIC_*` values, and shows secrets as "set" or "not set", never as a value.
- **An OAuth token never appears in a log line, a Gateway_Log entry, an operator stream event, a console row, an analytics event or a crash report.** One leaked refresh token is the whole product's trust. The log layer redacts by construction, not by remembering to.
- Logs carry **ids only** - never names, mail bodies, transcripts, memo text, audio or tokens.
- Tokens are held in the **envelope-encrypted vault**: a per-user data key wrapped by a master key that lives only in the cloud environment, with a rotation marker.
- `tooling/checks/secret-scan.ts` fails the build on a committed secret. Nothing is hard-coded.

## 15. Device identity: the private key never travels
- The prototype uses `DEVICE_TOKEN`, a shared secret issued at provisioning. **It is replaced at P12.5.**
- Production uses a **per-device certificate whose private key is generated on the device, inside ESP32-S3 secure storage, and never leaves it.**
- **Provisioning carries a certificate signing request, not a key.** No private key is ever transmitted, stored in the cloud, written to a log, or held in env. `DEVICE_KEY_PATH` names a file the device creates and reads; nothing else may read it.
- The CA vendor is a P12.5 detail. That the key never travels is not a detail and is not negotiable.
- `MQTT_CA_PATH`, `DEVICE_CERT_PATH` and `DEVICE_KEY_PATH` all arrive at P12.5, with the hosted stack.
- A `device_id` is bound to one owner. Unbinding wipes that owner's data from the device.

## 16. Model-input minimisation
Connectors hand the model a **scoped, field-allow-listed view**. Never a raw mail body, never a full document, never a token, never an unfiltered API response object. A repo check proves that no connector response object reaches a prompt directly.

This is the difference between "we use your mail" and "we sent your mail to a vendor", and it is the cheapest thing to retrofit badly.

## 17. Ceilings and budgets
- **Cost and rate ceilings per user per day**, enforced in the tool router, not in a prompt, and surfaced in the console. The brain refuses past them and says so. One runaway agentic loop is a bill and an outage.
- The research agent has its own per-request step and cost cap.
- The **proactivity budget**: interruptions are rationed per hour, decay when ignored, and are scored against the rules engine (VIPs, urgent rules, focus rules, working hours) before being spoken. Its per-hour number is a per-user setting, not an env constant (section 5).

## 18. Honest degradation
- Every provider names its fallback. The console shows which is live. The brain **tells the user when it is running degraded** ("I'm on the backup voice right now").
- Offline, the face states exactly what still works. Queued actions replay on reconnect and **the user is shown what was queued before it runs**.
- A device that loses Wi-Fi mid-turn resumes the turn or aborts it cleanly and says which. **No half-executed tool calls.** A half-sent mail is the failure that ends a pilot.
- Ack `reason` values are the hardware's truth. The cloud records them and never retries around them.
- A capability the device did not declare makes its feature **report unavailable in the app**, rather than failing quietly or pretending.

## 19. Data residency, enforced at boot (C19)
- `DATA_REGION` and `ALLOW_PROCESSING_OUTSIDE_INDIA` are **not documentation**.
- **Every provider's `provider-declaration` gains a `data_region` field.** The ported `provider-gate` **refuses to start the gateway** when a declared provider's region violates `ALLOW_PROCESSING_OUTSIDE_INDIA`.
- **A provider that cannot state its region does not load.** There is no "unknown" that resolves to allowed.
- **Decided: the flag is `false` and the vendor shortlist is India-only** (D1, closed). Not an open question. `decisions.md` holds it.
- Residency is therefore enforced by a boot-time check in code, not by a reviewer remembering, and a residency violation is a failed start rather than a quiet export.

## 20. Encryption and least privilege
- Tokens, transcripts, memory and ledger entries are **encrypted at rest**. TLS on every hop: HTTPS, MQTTS, WSS.
- Row Level Security on every table, scoped by `user_id`. `household_id` scopes the intercom only and is never a role boundary.
- Storage in **Mumbai (`ap-south-1`)**.
- OTA images are signed, with automatic rollback.

## 21. DPDP Act 2023 and the DPDP Rules 2025 are the compliance baseline
- A clear notice in plain language, per purpose.
- Consent per connection, per purpose, withdrawable as easily as it was given.
- Erasure on withdrawal or when the purpose ends, and a working data export.
- Breach-notification duties understood and wired before the first real user.
- Purpose limitation: data pulled for a brief is not reused for anything else without consent.
- Third parties in a meeting are covered by section 9, and the owner is the answerable party.
- The Act applies from the **first** real user, not the hundredth. P12 (safety and security audit) is not negotiable in any pilot cut.

## 22. When in doubt
Pick the more private and more conservative option, then flag it for Omar. For a new write tool, the conservative answer is that it is irreversible and confirms. For a new safety promise, the conservative answer is the one that does not depend on unconfirmed hardware.

## 23. Open items that must close before the pilot
Recorded here so they are not discovered late. None of them blocks P0.

**Residency and retention are no longer on this list.** Both are closed founder decisions - D1 and D4 in `decisions.md`.

1. **Crisis-protocol wording**, with sign-off from a qualified mental-health professional practising in India. This is `docs/founder-steps.md` row **F-7** and it blocks the pilot. Kiro writes the wording; it cannot sign it off, because it is in the safety model and the safety model is one of the four fences.
2. **Google restricted-scope verification and the independent security assessment.** This runs in weeks and must start at P4, not when the mail feature is ready. `docs/founder-steps.md` row **F-5**.
3. **The exact irreversible-action list per provider**, written per connector rather than assumed, and proven by the golden-set eval's confirmation-compliance score. This one is Kiro's own work, not a founder step.
