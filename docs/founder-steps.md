# Founder steps

**This is the only place a genuine manual step may appear.** Everything else Kiro does itself: installing a toolchain, fixing a PATH, creating a folder, moving a file, pinning a version. A row here that Kiro could have done itself is a defect in the wave, not a task for Omar.

A step belongs here **only** if it needs a credit card, a legal identity, an account, a signature, an administrator prompt Kiro cannot satisfy, a physical device, or another human being.

**Outstanding DO NOW rows: 3.** None of them blocks P0, P1, P2 or P3.

Seeded from Document A-P section 15 (v1.3), which closed seven of the nine items that used to stand there. The seven below are what remains. Updated at the end of every wave.

**Last updated at the end of P0 wave A.** No row was added and none was closed: wave A needed nothing from you. Node, pnpm and Docker were all handled from the terminal, and the one thing wave A could not verify - that the placeholder app opens in Expo Go on your phone - is not part of P0's gate and is not worth a row until the app has something on it worth looking at.

---

## DO NOW

| # | What to do | Why it matters | What breaks if you skip it |
|---|---|---|---|
| F-1 | **Check your Kiro plan has headroom for the remaining waves.** Open Kiro, click your account avatar (top right), open the plan or usage panel, and look at the credits remaining for this month. If it is low, upgrade there. | The build is roughly fifteen phases and each runs several waves. Running out mid-wave leaves the repository half-built. | Kiro stops mid-task. Nothing is lost, but the wave has to be re-run, which costs more than the upgrade. |
| F-2 | **Ask the hardware engineer for two things.** (a) His own BOM file, `Parth_BOM_ESP32S3_v4.xlsx`. (b) His written answers to questions 1, 2 and 3 on that file's "To confirm" tab: the Bluetooth module's exact part number and whether it accepts AT commands and supports the hands-free profile; whether TTP223 touch pads are in the build; whether microphone-array direction of arrival works on the ESP32-S3. Forward the file and the answers. | The copy of the BOM in `docs/` is a reconstruction from order screenshots and is explicitly **not** an authority. His file wins. The three answers are wanted before the wire contract freezes. | Nothing stops: capability flags absorb all three unknowns, so the software is built either way. But the contract freezes with three capability flags whose exact wire shape was guessed rather than confirmed, and changing it afterwards needs a signed version bump. |
| F-3 | **Move both GitHub repositories into an organisation you own.** Go to https://github.com/organizations/plan, choose the free plan, name the organisation, and create it. Then for each repository (`parth` and `xelulu`): open it, click **Settings**, scroll to the bottom **Danger Zone**, click **Transfer ownership**, and enter the new organisation name. Then add the engineer as a collaborator. | The product's entire codebase currently sits in one person's personal account. This is decision D7. | Nothing breaks today, and that is exactly the problem. It costs an afternoon now. After a disagreement, a lost password or a departure, it costs the codebase. |

---

## BEFORE THE NEXT PHASE

These two are needed before **P4** (identity, persistence and the token vault). P1, P2 and P3 do not touch them.

| # | What to do | Why it matters | What breaks if you skip it |
|---|---|---|---|
| F-4 | **Create a Supabase project in the Mumbai region.** Go to https://supabase.com/dashboard/new, sign in, click **New project**. Name it `parth`. For **Region** choose exactly **South Asia (Mumbai) `ap-south-1`** — not Singapore, not any other region. Set a database password and save it in your password manager. When it finishes, open **Project Settings → API** and send Kiro the **Project URL**, the **anon public** key and the **service_role** key. | Mumbai is the answer to the DPDP Act's data-residency question, and decision D1 is that no processing leaves India. The region cannot be changed after the project is created. | P4 cannot start. And a project created in the wrong region has to be deleted and rebuilt, losing anything already in it. |
| F-5 | **Create a Google Cloud project and OAuth client, and start app verification the same day.** Go to https://console.cloud.google.com/projectcreate and create a project named `parth`, **under an account you own** — not the engineer's. Then open **APIs & Services → OAuth consent screen**, fill it in, and **submit it for verification**. Then **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**, and send Kiro the **Client ID** and **Client secret**. | Reading a user's Gmail needs a *restricted* scope, and Google will not grant one without app verification plus an independent security assessment. That process runs for **weeks**. Starting it at P4 is why it is not the thing holding up P6. | P6's mail features are built and then cannot be switched on for a real user until verification completes. Every week of delay here is a week added to the pilot date. |

---

## LATER

| # | What to do | Blocks | Why it matters | What breaks if you skip it |
|---|---|---|---|---|
| F-6 | **Open provider accounts and send Kiro the keys**: the language model, the speech provider (Sarvam, at https://dashboard.sarvam.ai), and a web-search backend for the research agent. Each needs billing on a card. Kiro will tell you exactly which vendors to open **before P5 starts** — decision D1 restricts the shortlist to vendors that can process in India, so the list is shorter than the obvious one and choosing it is a cost decision that comes to you. | **P5** (the brain, confirmation and the Ledger) | Every one of these is a paid API, and nothing in the brain runs without them. | P5 can be built and tested against the mock providers, but no real conversation happens until the keys exist. |
| F-7 | **Get expert sign-off on the crisis-protocol wording.** Kiro will give you one page of exact wording: what Parth says when a user expresses distress, and how it offers the Tele-MANAS helpline on 14416. Have a qualified mental-health professional practising in India read it and confirm it in writing. | **the pilot** | Parth is an adult companion that people will talk to at 2 a.m. The words it uses in that moment are not an engineering decision and cannot be signed off inside this build. | The pilot cannot ship. This is non-negotiable and it is in the safety model, which is one of the four things Kiro is not allowed to decide. |

---

## DONE

| # | What was done | Date |
|---|---|---|
| — | Nothing yet. Rows move here with the date they were completed, and never get deleted. | — |

---

## What Kiro did instead of asking you

Recorded here so the list above stays short and so you can see the rule working. These were all setup steps that reached Omar in earlier plans and no longer do.

| Step | How Kiro handled it |
|---|---|
| Node 24.21.0 | Copied the sibling product's portable build into `c:\parth\.tools\`, git-ignored, and put it first on PATH for every command. |
| pnpm 10.34.6 | `corepack enable` and `corepack prepare pnpm@10.34.6 --activate`, with the corepack cache inside `.tools/`. |
| Docker Compose | Checked the installed version against the 2.24 floor. It passes (engine 29.9.1 running), so wave C can run. |
| The Expo SDK | Resolved SDK 58 and its whole peer set from the registry, pinned exactly. No founder step: A-P's method is a command, and commands are mine. |
| `.gitattributes` | Added, pinning `eol=lf`. This machine has `core.autocrlf=true`, which would have broken the panel byte-comparison and anything copied into a Linux container. |
| `.gitignore` | Found it was UTF-16 encoded and did not actually ignore `.env`. Rewrote it as UTF-8 with the full set. |
| The nine HMI pages | Decision D5: the hardware engineer assembles them at P13 from the P9 spec. Not a row for you. |
