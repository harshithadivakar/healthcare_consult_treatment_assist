# SignBridge + SignSlot: project bundle

Student prototype for the final presentation (Thursday 29 October 2026). All patients, interpreters and clinics are fictional. Not for clinical use.

## What's in this folder

| Folder | What it is |
| --- | --- |
| `signbridge/` | The SignBridge app (React/TypeScript PWA). In-room communication aid for a Deaf patient and a clinician: phrase library, symptoms, BSL education clips, speech captions. Its "Request a qualified BSL interpreter" button now hands off to SignSlot. |
| `signslot/signslot.html` | SignSlot on its own: one file, no install. Shows the patient app, the SignSlot agent, the interpreter app and the clinic portal side by side. |
| `presentation/` | The first slide deck draft (UK/BSL version, made before the switch to the US). |

## How the two fit together

- **SignBridge** helps during the appointment, for short, low-risk exchanges.
- **SignSlot** makes sure a certified human interpreter is booked and actually turns up. It matches interpreters to the patient's needs and the doctor's free time, rebooks automatically when someone cancels, and keeps an audit trail.

SignBridge covers the conversation in the room. SignSlot covers getting a qualified interpreter there. SignBridge's interpreter button links straight to SignSlot.

## Run it

**SignBridge (with the SignSlot link):** install Node.js 20+, then:
- Windows: double-click `signbridge/START-SIGNBRIDGE.bat`
- Mac/Linux: open a terminal in `signbridge/` and run `node tools/serve-dist.mjs`

It opens `http://127.0.0.1:4174/`. Click **Request a qualified BSL interpreter**, then **Open the SignSlot scheduling demo**.

**SignSlot alone:** double-click `signslot/signslot.html`. Use Chrome if you want the interpreter's **Speak** button (voice input) to work.

**Editing the SignBridge code:** in `signbridge/`, run `pnpm install`, then `pnpm test`, `pnpm typecheck` and `pnpm build`. The `dist` folder in this bundle was patched by hand to include the SignSlot link, and those commands rebuild it properly from the source.

## Things to decide as a team before Thursday

- **UK or US.** SignBridge is UK (BSL, NHS). SignSlot is US (ASL, Chicago, ADA, RID certification). Pick one story for the slides. The professor is US-focused, so ASL/US may fit better, but SignBridge's labels and BSL video clips are UK.
- **The deck.** The draft in `presentation/` describes the earlier UK translation idea and needs updating to the final concept.
