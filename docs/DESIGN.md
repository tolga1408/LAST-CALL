# LAST CALL — Vertical Slice Game Design

## The promise

**Read a monster, poison a glass, and decide whether the lie is worth drinking.**

LAST CALL is an intimate occult strategy game built around one object: the glass moving between two people at a closed bar. The fantasy is not cocktail crafting. It is information warfare performed through hospitality.

The intended first audience is players who enjoy short, expressive horror games, card deduction, and decisions that make good stories to retell. A full night should take roughly 8–12 minutes once animations, additional beats, and authored encounters are added. The present prototype resolves faster and is tuned for iteration.

## Core loop

Each round has two asymmetric halves:

1. **Your pour:** choose two ingredients from five. Read the expected interaction. Make a public claim—Clean, Restorative, Strong, or silence—then drink it or offer it.
2. **His answer:** the Stranger estimates danger from visible residue, your claim, your historical bluff rate, and any Bitters glimpse. He drinks or spends a Return to force it back.
3. **His pour:** the Stranger chooses two cards from his actual hand. He drinks useful mixtures or offers dangerous ones.
4. **Your read:** study the residue, his physical tell, his claim, and the finite discard history. Spend Nerve to reveal an ingredient, drink, or spend a Return.
5. **Reveal:** both cards and the resolved recipe become public. Correct reads restore Nerve. At zero Tolerance, the night ends.

### Why the choice stays alive

- Honey can hide poison's trace but never cancel its damage.
- Ice reduces both danger and evidence, making a weak poison more believable.
- Bitters converts a current sacrifice into future information.
- Wormwood corrupts one future physical tell.
- Blood hurts both participants and makes the drink impossible to return.
- Moonshine copies a single resolved effect, producing high-stakes but legible volatility.
- There are only two copies of every ingredient. Discards turn memory into advantage.

No ingredient is created for the AI. Both players obey the same recipe and deck rules.

## Resources

- **Tolerance — 7:** health represented as the body's remaining capacity. At zero, the actor dies.
- **Nerve — 0–3:** information currency. Spend one to expose an ingredient in an incoming offer. A correct accept/return read restores one.
- **Returns — 2:** scarce vetoes. A Return sends an offered glass back to its maker. Blood oaths cannot be returned.
- **Foresight — 0–2:** Bitters automatically reveals one ingredient in the next incoming offer.
- **Distortion — 0–1:** Wormwood reverses the next generated physical signal applied to that actor.

## Information contract

The game must be mysterious, never arbitrary.

| Signal | Reliability | Player-facing form |
| --- | --- | --- |
| Ingredient text | Exact | Cards in hand |
| Resolved recipe | Exact | Reveal after a drink |
| Discard history | Exact | Marked evidence strip |
| Glass residue | Exact trace band | Napkin description and meter |
| Physical tell | Usually truthful | Stranger portrait and prose |
| Spoken claim | Unreliable | One of four named claims |
| Inspect/Foresight | Exact | One exposed ingredient |

A fair loss should produce “I ignored that clue” or “I spent my Returns too early,” not “the game invented damage.”

## Content grammar

Twelve ingredients create 78 unordered two-card combinations, including doubles. Named recipes are reserved for memorable mechanical or narrative pairings; ordinary combinations retain both ingredient names. Discovery is persisted locally.

The implemented named set includes:

- **Sweet Funeral:** Hemlock + Grave Honey
- **Cold Grave:** Hemlock + Black Ice
- **Closing Time:** Hemlock + Nightshade
- **The Kindly Lie:** Grave Honey + Nightshade
- **The Green Prophet:** Absinthe + Moonshine
- **Red Moon:** Blood + Moonshine
- **Last Rites:** Black Bitters + Whiskey
- **White Static:** Moonshine + Moonshine

## Difficulty and balance target

The September 2026 vertical-slice baseline uses seven Tolerance, two Returns, and two starting Nerve. A 10,000-night heuristic simulation is expected to land near an even contest, with a small Stranger advantage appropriate to the fiction. Current automated results should be recorded in release notes whenever rules change.

Automation validates obvious domination and card integrity. Human tests must answer the real questions:

- Can a new player explain Honey after one reveal?
- Can players predict what residue means by the third round?
- Does a wrong decision feel attributable?
- Are Returns tense now and regrettable later?
- Do players form a story about the Stranger's behavior?
- Does “one more night” happen without being requested?

## Commercial product direction

The next sellable format is a focused premium game, not an endless live-service shell:

1. **Vertical slice:** this duel, polished to festival-demo quality.
2. **The occult night:** six to eight patrons, each changing one information rule, across a branching 45–70 minute run.
3. **The cellar:** unlock alternative ingredient sets, bartender burdens, keepsakes, and endings. Avoid raw power progression; unlock new problems.
4. **Daily tab:** a shared seed with local results first. Server leaderboards only after an authoritative backend exists.
5. **Full release:** 20+ patrons, three bar locations, challenge contracts, accessibility modes, platform achievements, and strong run history.

The commercial hook should be stated as **“occult bartending information warfare.”** The moving glass, readable tells, and finite-deck deduction are the identity. Cocktail decoration is atmosphere, not the central verb.

## Production gates

Before store launch:

- measure first-night completion, immediate replay, decision time, recipe comprehension, and death attribution;
- add a tutorial that teaches through a rigged opening hand rather than a modal;
- commission a coherent portrait, hand, glass, card, and environmental art set;
- build layered glass/room/heartbeat audio with calibrated silence;
- author patron-specific tells and dialogue with localization budgets;
- add save versioning, content validation, automated browser flows, and crash telemetry with consent;
- test keyboard-only, screen readers, contrast, reduced motion, mobile layouts, gamepads, Steam Deck, and suspended/resumed state;
- complete store capsule testing, trailer capture, pricing research, and wish-list funnel validation;
- define platform authentication and entitlements before any paid online feature.

Revenue is an outcome of product quality, discoverability, timing, and execution; no design can guarantee it. This slice is built to make the central bet testable before expensive content production.
