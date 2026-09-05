# LAST CALL

An occult bartending duel about poison, bluffing, and reading the monster across the bar.

It is 3:00 AM. You and the Stranger each draw from the same finite cellar: two copies of twelve ingredients. Mix two cards, name the glass truthfully or lie, then drink it or slide it across the lacquer. When the Stranger offers, his physical tell and the residue on the glass are clues—not answers.

This branch is a complete browser-playable vertical slice. It replaces the original deterministic click demo with a real hidden-information game:

- a 24-card finite deck, visible discard history, five-card hands, and deterministic seeded nights;
- twelve ingredients with poison, healing, masking, antidote, copying, foresight, curses, and blood-oath effects;
- offer, accept, return, inspect, claim, and bluff decisions;
- a Stranger who mixes real cards, chooses an action from the resulting recipe, reacts to residue and learns the player's bluff rate;
- physical tells generated from the drink's actual state, with occasional false reads and mechanically induced distortion;
- persistent non-sensitive night statistics and a three-victory narrative reveal;
- keyboard, focus, responsive-layout, and reduced-motion support;
- no build step, dependencies, tracker, external font, account, or network API.

## Play locally

Serve the directory over HTTP:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Add a numeric seed for a reproducible deal:

```text
http://localhost:8080/?seed=1408
```

Number keys 1–5 select ingredient cards. All other actions use standard buttons and keyboard focus.

## Verify the rules

Node.js 20 or newer is recommended. There are no packages to install.

```sh
npm test
npm run simulate
```

The tests cover deck conservation, deterministic dealing, recipe interactions, blood-oath draws, claims, effects, and the Stranger's use of real hand cards. The simulation runs 10,000 seeded heuristic matches and prints win rate and average length; it is a smoke signal, not a substitute for human playtesting.

## Architecture

```text
index.html          semantic game surface and dialogs
src/styles.css      object-led bar scene, cards, states, responsive layout
src/game.js         browser controller, interaction flow, sound, local statistics
src/game-core.js    pure seeded rules engine used by browser and Node tests
tests/              rule and invariant tests
scripts/            repeatable balance simulation
docs/               game design and authentication architecture
```

The rules engine is deliberately independent from the DOM. A later port can keep the deck, recipes, AI policy, and seeded simulation while replacing the browser controller.

See [docs/DESIGN.md](docs/DESIGN.md) for the game model and production roadmap. See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for the current request/data flow and the boundary required before adding paid entitlements, cloud saves, leaderboards, or multiplayer.

## Status

This is a vertical slice, not a commercially finished game. It still needs observed playtests, authored encounters, production illustration/audio, save migration, store integration, localization, accessibility testing with assistive technology, and platform QA.

No license has been granted yet. Add one before accepting outside contributions or distributing source builds.
