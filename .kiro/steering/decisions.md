---
inclusion: always
---
# Parth: Standing decisions and Kiro's authority

This file holds Document A-P section 19 in full. **It is what you consult when you would otherwise have asked a question.** Section 19.1 is reproduced verbatim. Section 19.2 is prose in A-P; its three decision classes and its four fences are tabulated here with its wording kept intact.

Nothing in this file is a suggestion. The seven decisions are closed, and the mandate is the default.

## 19.1 The seven decisions, closed

Each is the CTO's, each has a reason, and each can be reversed by Omar at any time.

| # | Decision | Reason | Reversed by |
|---|---|---|---|
| D1 | **No processing leaves India.** `ALLOW_PROCESSING_OUTSIDE_INDIA` is `false`; the vendor shortlist is India-only, enforced at boot by the provider gate | Pilot users hand Parth real mail on day one, and the DPDP Act applies from the first user, not the hundredth | Flipping the flag and re-running the gate. A leak is not reversible |
| D2 | **The pilot answers whether people want it.** P8 moves ahead of P10 | Reliability is demonstrable with five units in any build order; desirability is not demonstrable at all without the Council, Mentor and Research | Reordering two phases |
| D3 | **Google first at P6**, Microsoft second | Restricted Gmail scopes need verification that runs in weeks and starts at P4 | Swapping which connector is built first |
| D4 | **Retention**: audio deleted after transcription; transcripts 365 days; Ledger 24 months; memory indefinite with per-item delete | The Ledger is the accountability receipt, and a receipt that expires in a month is not one. The rest is purpose limitation | Per-user settings, from P4 |
| D5 | **The engineer assembles the nine HMI pages at P13**, from the P9 spec | He has the display and the vendor's editor, and nothing else in the build depends on it | Paying someone else to do it |
| D6 | **Working cost target: INR 12,000 bill of materials per unit at pilot scale, against INR 29,000 retail** | The plan needs a number to decide what stays P0. The prototype BOM is INR 7,068 before enclosure and assembly, so there is room | One line from Omar. This is the CTO's assumption, not the business plan |
| D7 | **Both repositories move to an organisation Omar owns** | The product's entire codebase currently sits in one person's personal account | Deciding not to, knowingly |

**None of these is an open item.** They do not appear in any open-items list, any FLAG table, or any spec's open points. If one shows up there, that is a defect.

## 19.2 Kiro's standing decision mandate

> Omar is the founder and does not write code. Routing an implementation choice through him costs a day and improves nothing. So the default is reversed: **Kiro decides and proceeds.**

### The three classes

| Class | What falls in it | What Kiro does |
|---|---|---|
| **Decide silently** | File and module layout inside a package; naming; decomposition; test strategy and what to assert; error handling; data structures; which reference file to port and how far to adapt it; anything the documents answer by implication; **anything a later edit can undo** | Decides and simply states what it chose. When the documents are silent and the choice is internal, **it chooses, states the choice in one line, and marks it reversible. It never stalls on silence.** |
| **Decide, proceed, flag prominently** | Anything that contradicts a document, as the `gateway-log` finding did; any narrowing of a ported check; any dependency not already on the approved list; anything that costs money at run time; anything that moves a stated phase boundary | Proceeds, and flags it at the top of the wave report rather than in a footnote |
| **Stop and ask** | The four fences below, and only those | Stops |

### The four fences, and only four

| # | Fence | Why it does not move |
|---|---|---|
| 1 | **The wire contract.** No field, enum, topic, page id or value, ever, outside Document B-P and a `proto_ver` bump signed by both sides | A contract mistake freezes under someone else's firmware |
| 2 | **The safety model.** Anything in `safety.md` - the irreversible list, confirmation, consent, recording, retention, memory, residency, the crisis protocol | These are promises to a person, not implementation details |
| 3 | **Licences and money.** Adopting anything not on the approved list, moving past a pinned version that carries a licence implication, or anything that spends Omar's money or signs him up to something | |
| 4 | **Anything outside the repository.** User data, a provider account, a published artefact, git history that has already been pushed | |

### The manual-step rule

> A step reaches Omar only if it needs a **credit card, a legal identity, an account, a signature, an administrator prompt Kiro cannot satisfy, a physical device, or another human being.** **Everything else Kiro attempts itself before mentioning it** - installing a toolchain, fixing a PATH, creating a folder, moving a file, pinning a version.

`docs/founder-steps.md` is the **only** place a genuine manual step may appear. A row there that Kiro could have done itself is **a defect in the wave, not a task for Omar**. Every wave report opens with how many DO NOW rows are outstanding.

## 19.3 Why two of those fences never move

> The contract and the safety model are the two places where a mistake cannot be undone by editing a file. A contract error ships into firmware built in another city by someone who reads the document and not this chat. A safety error reaches a person who trusted the product with their mail. Everything else in this build is recoverable, which is exactly why everything else is delegated.

## How this changes the working loop

- **Do not ask a question this file answers.** Read it first.
- **Do not stall on a silent document.** Take the most reasonable reading, say which reading you took, keep building.
- **Do not stall on an ambiguous instruction.** Pick the reading that produces the smaller, more reversible change, and say so.
- **Do not escalate a setup step.** Install it, pin it, add it to the README's prerequisites, report it. Attempt before asking.
- **State every choice once, in the wave report, in one line, marked reversible.** A choice nobody can find is the same as a choice nobody made.
- **The fences are not a style preference.** Three of the four are about things outside this repository or outside a file edit. The fourth, the safety model, is a promise already made to a person.
