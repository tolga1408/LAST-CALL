# LAST CALL — Game Design Document

## Core Loop
1. You and The Stranger each have 5 HP (represented as "tolerance")
2. Each round, you see 5 ingredient cards face-up in the middle
3. You pick 2 ingredients → they become a drink
4. You choose: SERVE it to The Stranger, or DRINK it yourself
5. The Stranger does the same (picks 2, serves or drinks)
6. Drinks deal damage based on ingredients. Poison = damage. Safe = heal/buff.
7. First to 0 HP dies. You lose.

## Ingredient Cards (The Deck)
- **Whiskey** (safe) — Heals 1 HP to drinker
- **Absinthe** (risky) — 50% chance: heal 2 or deal 2 to drinker
- **Bitters** (safe) — Reveals one of Stranger's next cards
- **Nightshade** (poison) — Deals 2 damage to drinker
- **Hemlock** (poison) — Deals 3 damage to drinker
- **Honey** (safe) — Negates one poison in the same drink
- **Ice** (safe) — No effect, dilutes (reduces damage by 1, min 0)
- **Wormwood** (curse) — Next drink the drinker makes deals +1 damage
- **Blood** (dark) — Deals 1 damage to BOTH players regardless of who drinks
- **Moonshine** (wild) — Copies the effect of the other ingredient

## The Stranger's AI
- Has "tells" — dialogue hints at what he'll do
- Early rounds: plays conservatively, tests you
- Mid game: starts bluffing, mixes poison with honey
- Late game: desperate, aggressive, makes mistakes
- Has personality — sardonic, philosophical, unsettling

## Dialogue System
- Stranger speaks before/after each round
- Comments on your choices
- Drops hints about his nature
- Gets more unhinged as HP drops

## Win/Lose Conditions
- Stranger reaches 0 HP → You win → "He smiles. 'Same time tomorrow?'"
- You reach 0 HP → You lose → Screen goes dark, wake up, it's 3 AM again
- Secret: Win 3 times → true ending unlocked

## Visual Design
- Single scene: bar counter from bartender's POV
- Dark wood, amber lighting, rain on windows
- Cards are cocktail napkins with ingredient sketches
- Drinks are rendered as glasses filling with colored liquid
- Stranger is a silhouette with glowing eyes, becomes clearer each round

## Sound Design
- Jazz playing softly (gets distorted as game progresses)
- Rain ambience
- Glass clinking
- Liquid pouring
- Heartbeat when HP is low
