(function attachLastCallCore(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LastCallCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLastCallCore() {
    'use strict';

    const MAX_TOLERANCE = 7;
    const MAX_NERVE = 3;
    const STARTING_RETURNS = 2;

    const INGREDIENTS = Object.freeze({
        whiskey: {
            id: 'whiskey', name: 'Whiskey', mark: 'W', kind: 'mercy',
            description: 'Restores 1 tolerance. Leaves a warm oak trace.',
            heal: 1, trace: 1, hue: '#b66b2c'
        },
        absinthe: {
            id: 'absinthe', name: 'Absinthe', mark: 'A', kind: 'volatile',
            description: 'On reveal: restores 2 or deals 2. The result is rolled once.',
            volatile: true, trace: 2, hue: '#9ebd63'
        },
        bitters: {
            id: 'bitters', name: 'Black Bitters', mark: 'B', kind: 'insight',
            description: 'The drinker glimpses an ingredient in the next drink offered to them.',
            foresight: 1, trace: 2, hue: '#87532c'
        },
        nightshade: {
            id: 'nightshade', name: 'Nightshade', mark: 'N', kind: 'toxin',
            description: 'Deals 2 damage. Its violet stain is difficult to hide.',
            damage: 2, trace: 3, hue: '#584078'
        },
        hemlock: {
            id: 'hemlock', name: 'Hemlock', mark: 'H', kind: 'toxin',
            description: 'Deals 3 damage. Potent, bitter, and unmistakable.',
            damage: 3, trace: 4, hue: '#476a47'
        },
        honey: {
            id: 'honey', name: 'Grave Honey', mark: 'Y', kind: 'mask',
            description: 'Masks 2 trace. It conceals danger; it does not cure it.',
            mask: 2, trace: 1, hue: '#d5a43b'
        },
        ice: {
            id: 'ice', name: 'Black Ice', mark: 'I', kind: 'mask',
            description: 'Reduces damage and trace by 1.',
            reduceDamage: 1, mask: 1, trace: 0, hue: '#9eb8bc'
        },
        wormwood: {
            id: 'wormwood', name: 'Wormwood', mark: 'V', kind: 'curse',
            description: 'Distorts one tell on the drinker\'s next incoming offer.',
            distort: 1, trace: 2, hue: '#667646'
        },
        blood: {
            id: 'blood', name: 'Blood', mark: 'X', kind: 'oath',
            description: 'Deals 1 to both players. A blood oath cannot be returned.',
            damage: 1, collateral: 1, cannotReturn: true, trace: 3, hue: '#8e232d'
        },
        moonshine: {
            id: 'moonshine', name: 'Moonshine', mark: 'M', kind: 'wild',
            description: 'Copies the other ingredient\'s resolved effect and trace.',
            copy: true, trace: 0, hue: '#c8c6de'
        },
        rosemary: {
            id: 'rosemary', name: 'Widow\'s Rosemary', mark: 'R', kind: 'antidote',
            description: 'Cancels 2 damage but leaves a sharp herbal trace.',
            antidote: 2, trace: 2, hue: '#718a69'
        },
        salt: {
            id: 'salt', name: 'Bracing Salt', mark: 'S', kind: 'insight',
            description: 'Restores 1 Nerve to the drinker.',
            nerve: 1, trace: 2, hue: '#d1d0c2'
        }
    });

    const INGREDIENT_IDS = Object.freeze(Object.keys(INGREDIENTS));

    const RECIPE_NAMES = Object.freeze({
        'absinthe+moonshine': 'The Green Prophet',
        'bitters+whiskey': 'Last Rites',
        'blood+moonshine': 'Red Moon',
        'hemlock+honey': 'Sweet Funeral',
        'hemlock+ice': 'Cold Grave',
        'hemlock+nightshade': 'Closing Time',
        'honey+nightshade': 'The Kindly Lie',
        'honey+whiskey': 'House Mercy',
        'honey+wormwood': 'Soft Curse',
        'rosemary+salt': 'Clear Conscience'
    });

    const CLAIMS = Object.freeze({
        clean: { id: 'clean', label: 'Clean', description: 'Claim that it will not hurt.' },
        restorative: { id: 'restorative', label: 'Restorative', description: 'Claim that it will heal.' },
        strong: { id: 'strong', label: 'Strong', description: 'Admit that it carries force.' },
        silence: { id: 'silence', label: 'Say nothing', description: 'Let the glass make the claim.' }
    });

    class Random {
        constructor(seed) {
            const normalized = Number(seed) >>> 0;
            this.state = normalized || 0x6d2b79f5;
        }

        next() {
            let value = this.state += 0x6d2b79f5;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        }

        int(max) {
            return Math.floor(this.next() * max);
        }

        pick(values) {
            return values[this.int(values.length)];
        }

        shuffle(values) {
            const result = values.slice();
            for (let index = result.length - 1; index > 0; index -= 1) {
                const swapIndex = this.int(index + 1);
                [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
            }
            return result;
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function createActor() {
        return {
            tolerance: MAX_TOLERANCE,
            nerve: 2,
            returns: STARTING_RETURNS,
            foresight: 0,
            distorted: 0
        };
    }

    function createDeck(rng) {
        const cards = [];
        INGREDIENT_IDS.forEach((id) => {
            cards.push(id, id);
        });
        return rng.shuffle(cards);
    }

    function createMatch(seed) {
        const resolvedSeed = Number(seed) || Date.now();
        const rng = new Random(resolvedSeed);
        const state = {
            seed: resolvedSeed,
            rng,
            round: 1,
            player: createActor(),
            stranger: createActor(),
            hands: { player: [], stranger: [] },
            drawPile: createDeck(rng),
            discard: [],
            history: [],
            profile: {
                offers: 0,
                bluffs: 0,
                returnsMade: 0,
                correctReads: 0
            }
        };
        refillHand(state, 'player');
        refillHand(state, 'stranger');
        return state;
    }

    function drawCard(state) {
        if (state.drawPile.length === 0) {
            state.drawPile = state.rng.shuffle(state.discard);
            state.discard = [];
        }
        return state.drawPile.pop();
    }

    function refillHand(state, actor) {
        while (state.hands[actor].length < 5) {
            const card = drawCard(state);
            if (!card) break;
            state.hands[actor].push(card);
        }
    }

    function consumePair(state, actor, indices) {
        if (!Array.isArray(indices) || indices.length !== 2 || indices[0] === indices[1]) {
            throw new Error('Exactly two different ingredients are required.');
        }
        const hand = state.hands[actor];
        const normalized = indices.map(Number).sort((a, b) => b - a);
        if (normalized.some((index) => index < 0 || index >= hand.length)) {
            throw new Error('Ingredient selection is outside the current hand.');
        }
        const selected = normalized.map((index) => hand[index]).reverse();
        normalized.forEach((index) => hand.splice(index, 1));
        state.discard.push(...selected);
        refillHand(state, actor);
        return selected;
    }

    function evaluateIngredient(ingredient, rng, expected) {
        if (ingredient.volatile) {
            if (expected) {
                return { damage: 1, heal: 1, trace: ingredient.trace, volatileResult: 'unknown' };
            }
            const harmful = rng.next() < 0.5;
            return {
                damage: harmful ? 2 : 0,
                heal: harmful ? 0 : 2,
                trace: ingredient.trace,
                volatileResult: harmful ? 'venom' : 'mercy'
            };
        }
        return {
            damage: ingredient.damage || 0,
            heal: ingredient.heal || 0,
            trace: ingredient.trace || 0,
            mask: ingredient.mask || 0,
            reduceDamage: ingredient.reduceDamage || 0,
            antidote: ingredient.antidote || 0,
            collateral: ingredient.collateral || 0,
            nerve: ingredient.nerve || 0,
            foresight: ingredient.foresight || 0,
            distort: ingredient.distort || 0,
            cannotReturn: Boolean(ingredient.cannotReturn)
        };
    }

    function scaleEffect(effect, amount) {
        const scaled = {};
        Object.entries(effect).forEach(([key, value]) => {
            scaled[key] = typeof value === 'number' ? value * amount : value;
        });
        return scaled;
    }

    function combineEffects(effects) {
        return effects.reduce((total, effect) => {
            ['damage', 'heal', 'trace', 'mask', 'reduceDamage', 'antidote', 'collateral', 'nerve', 'foresight', 'distort']
                .forEach((key) => { total[key] += effect[key] || 0; });
            total.cannotReturn = total.cannotReturn || Boolean(effect.cannotReturn);
            if (effect.volatileResult) total.volatileResults.push(effect.volatileResult);
            return total;
        }, {
            damage: 0,
            heal: 0,
            trace: 0,
            mask: 0,
            reduceDamage: 0,
            antidote: 0,
            collateral: 0,
            nerve: 0,
            foresight: 0,
            distort: 0,
            cannotReturn: false,
            volatileResults: []
        });
    }

    function recipeName(ids) {
        const key = ids.slice().sort().join('+');
        if (key === 'moonshine+moonshine') return 'White Static';
        if (RECIPE_NAMES[key]) return RECIPE_NAMES[key];
        return ids.map((id) => INGREDIENTS[id].name).join(' & ');
    }

    function dominantHue(ids, summary) {
        if (summary.damage > summary.heal) return summary.trace <= 1 ? '#7f9470' : '#596d49';
        if (summary.heal > 0) return '#bd7a31';
        if (summary.distort > 0) return '#655378';
        return INGREDIENTS[ids[0]].hue;
    }

    function describeEffect(summary) {
        const parts = [];
        if (summary.damage) parts.push(`${summary.damage} damage`);
        if (summary.heal) parts.push(`${summary.heal} healing`);
        if (summary.collateral) parts.push(`${summary.collateral} damage to the other drinker`);
        if (summary.nerve) parts.push(`+${summary.nerve} Nerve`);
        if (summary.foresight) parts.push(`${summary.foresight} ingredient glimpse`);
        if (summary.distort) parts.push('distorted next tell');
        if (summary.cannotReturn) parts.push('cannot be returned');
        return parts.length ? parts.join(' · ') : 'No direct effect';
    }

    function resolveRecipe(ids, rng, options) {
        const expected = Boolean(options && options.expected);
        if (!Array.isArray(ids) || ids.length !== 2 || ids.some((id) => !INGREDIENTS[id])) {
            throw new Error('A recipe requires two known ingredients.');
        }

        const [first, second] = ids.map((id) => INGREDIENTS[id]);
        let effects;
        if (first.copy && second.copy) {
            effects = [{ heal: 1, nerve: 1, trace: 3 }];
        } else if (first.copy || second.copy) {
            const source = first.copy ? second : first;
            effects = [scaleEffect(evaluateIngredient(source, rng, expected), 2)];
        } else {
            effects = [evaluateIngredient(first, rng, expected), evaluateIngredient(second, rng, expected)];
        }

        const raw = combineEffects(effects);
        const summary = {
            damage: clamp(raw.damage - raw.reduceDamage - raw.antidote, 0, 4),
            heal: clamp(raw.heal, 0, 4),
            trace: clamp(raw.trace - raw.mask, 0, 4),
            collateral: clamp(raw.collateral, 0, 2),
            nerve: clamp(raw.nerve, 0, 2),
            foresight: clamp(raw.foresight, 0, 2),
            distort: clamp(raw.distort, 0, 1),
            cannotReturn: raw.cannotReturn,
            volatileResults: raw.volatileResults
        };

        return {
            ids: ids.slice(),
            name: recipeName(ids),
            ...summary,
            effectText: describeEffect(summary),
            hue: dominantHue(ids, summary)
        };
    }

    function previewRecipe(ids) {
        return resolveRecipe(ids, new Random(1), { expected: true });
    }

    function pour(state, actor, indices) {
        const ids = consumePair(state, actor, indices);
        const recipe = resolveRecipe(ids, state.rng);
        state.history.push({ type: 'pour', actor, round: state.round, recipe: recipe.name });
        return recipe;
    }

    function applyRecipe(state, target, recipe) {
        const drinker = state[target];
        const otherKey = target === 'player' ? 'stranger' : 'player';
        const other = state[otherKey];
        const before = { target: drinker.tolerance, other: other.tolerance };

        drinker.tolerance = clamp(drinker.tolerance + recipe.heal - recipe.damage, 0, MAX_TOLERANCE);
        other.tolerance = clamp(other.tolerance - recipe.collateral, 0, MAX_TOLERANCE);
        drinker.nerve = clamp(drinker.nerve + recipe.nerve, 0, MAX_NERVE);
        drinker.foresight = clamp(drinker.foresight + recipe.foresight, 0, 2);
        drinker.distorted = clamp(drinker.distorted + recipe.distort, 0, 1);

        const result = {
            target,
            other: otherKey,
            damageTaken: Math.max(0, before.target - drinker.tolerance),
            healingReceived: Math.max(0, drinker.tolerance - before.target),
            collateralTaken: Math.max(0, before.other - other.tolerance),
            recipe
        };
        state.history.push({ type: 'drink', actor: target, round: state.round, recipe: recipe.name, result });
        return result;
    }

    function checkOutcome(state) {
        if (state.player.tolerance <= 0 && state.stranger.tolerance <= 0) return 'draw';
        if (state.stranger.tolerance <= 0) return 'win';
        if (state.player.tolerance <= 0) return 'loss';
        return null;
    }

    function claimIsTrue(claim, recipe) {
        if (claim === 'silence') return true;
        if (claim === 'clean') return recipe.damage === 0 && recipe.collateral === 0;
        if (claim === 'restorative') return recipe.heal > 0;
        if (claim === 'strong') return recipe.damage + recipe.collateral >= 2;
        return false;
    }

    function recordPlayerOffer(state, claim, recipe) {
        state.profile.offers += 1;
        if (!claimIsTrue(claim, recipe)) state.profile.bluffs += 1;
    }

    function traceClue(trace) {
        const clues = [
            'The surface is mirror-still. No scent escapes.',
            'A faint sweetness clings to the rim.',
            'A medicinal halo clouds the glass.',
            'An oily stain gathers where the liquid turns.',
            'Black sediment moves against the pour.'
        ];
        return clues[clamp(Math.round(trace), 0, 4)];
    }

    function ingredientRisk(id) {
        const preview = previewRecipe([id, id]);
        return preview.damage + preview.collateral - preview.heal;
    }

    function aiRespondToOffer(state, recipe, claim) {
        const actor = state.stranger;
        let suspicion = [0.08, 0.22, 0.46, 0.7, 0.88][recipe.trace];
        const bluffRate = state.profile.offers ? state.profile.bluffs / state.profile.offers : 0.35;
        if (claim === 'clean') suspicion += (bluffRate - 0.25) * 0.42;
        if (claim === 'restorative') suspicion -= 0.08;
        if (claim === 'strong') suspicion += 0.17;
        if (claim === 'silence') suspicion += 0.04;

        let glimpse = null;
        if (actor.foresight > 0) {
            actor.foresight -= 1;
            glimpse = recipe.ids[0];
            suspicion += ingredientRisk(glimpse) * 0.18;
        }

        suspicion += (state.rng.next() - 0.5) * 0.28;
        const shouldReturn = actor.returns > 0 && !recipe.cannotReturn && suspicion > 0.56;
        if (shouldReturn) actor.returns -= 1;
        return {
            action: shouldReturn ? 'return' : 'drink',
            suspicion: clamp(suspicion, 0, 1),
            glimpse,
            line: shouldReturn
                ? state.rng.pick([
                    'No. A host should taste the house specialty.',
                    'Your pulse betrayed the garnish.',
                    'After you, bartender.'
                ])
                : state.rng.pick([
                    'I accept the terms.',
                    'A beautiful lie. Perhaps.',
                    'Then let us see what your hands believe.'
                ])
        };
    }

    function pairIndices(hand) {
        const pairs = [];
        for (let first = 0; first < hand.length; first += 1) {
            for (let second = first + 1; second < hand.length; second += 1) {
                pairs.push([first, second]);
            }
        }
        return pairs;
    }

    function aiChoosePour(state) {
        const hand = state.hands.stranger;
        let best = null;
        pairIndices(hand).forEach((indices) => {
            const ids = indices.map((index) => hand[index]);
            const recipe = previewRecipe(ids);
            const lowHealth = state.stranger.tolerance <= 2;
            const playerLow = state.player.tolerance <= 2;
            const keepScore = recipe.heal * (lowHealth ? 3.8 : 1.5)
                + recipe.nerve * 0.8 + recipe.foresight * 0.7
                - recipe.damage * 2.4 - recipe.collateral * 1.1;
            const returnRisk = recipe.cannotReturn ? 0 : recipe.trace * 0.55;
            const offerScore = recipe.damage * (playerLow ? 3.4 : 2.15)
                + recipe.distort * 0.9 + recipe.collateral * 0.45
                - recipe.heal * 1.8 - returnRisk;
            const candidates = [
                { indices, action: 'keep', score: keepScore + state.rng.next() * 0.7 },
                { indices, action: 'offer', score: offerScore + state.rng.next() * 0.7 }
            ];
            candidates.forEach((candidate) => {
                if (!best || candidate.score > best.score) best = candidate;
            });
        });

        const selectedIds = best.indices.map((index) => hand[index]);
        const preview = previewRecipe(selectedIds);
        let claim = 'silence';
        if (best.action === 'offer') {
            if (preview.damage > preview.heal) claim = state.rng.next() < 0.68 ? 'clean' : 'silence';
            else claim = state.rng.next() < 0.6 ? 'strong' : 'restorative';
        }
        return { ...best, claim };
    }

    function createTell(state, recipe, action) {
        const dangerous = recipe.damage + recipe.collateral > recipe.heal;
        const stranger = state.stranger;
        let signalDanger = dangerous;
        let distorted = false;
        const naturallyFalse = state.rng.next() > 0.78;
        if (stranger.distorted > 0) {
            stranger.distorted -= 1;
            signalDanger = !signalDanger;
            distorted = true;
        } else if (naturallyFalse) {
            signalDanger = !signalDanger;
        }

        const offerDanger = [
            { line: 'A clean pour. I would stake your life on it.', tell: 'He watches your hand instead of the glass.' },
            { line: 'You look thirsty.', tell: 'His thumb has left the rim completely dry.' },
            { line: 'No ceremony. Drink.', tell: 'The final word arrives half a beat too quickly.' }
        ];
        const offerSafe = [
            { line: 'Even monsters practice hospitality.', tell: 'One finger remains protectively against the glass.' },
            { line: 'I made this one for myself.', tell: 'His gaze follows the drink as it crosses the bar.' },
            { line: 'There are mercies worse than poison.', tell: 'His shoulders loosen when you reach for it.' }
        ];
        const keepDanger = [
            { line: 'Waste is a mortal superstition.', tell: 'His jaw locks before the first swallow.' },
            { line: 'To our continued acquaintance.', tell: 'He raises the glass without breathing.' }
        ];
        const keepSafe = [
            { line: 'Permit me one small indulgence.', tell: 'He turns the glass to catch every amber reflection.' },
            { line: 'The house keeps its best bottle hidden.', tell: 'The red in his eyes softens for an instant.' }
        ];
        const pool = action === 'offer'
            ? (signalDanger ? offerDanger : offerSafe)
            : (signalDanger ? keepDanger : keepSafe);
        return { ...state.rng.pick(pool), distorted, signalDanger };
    }

    function spendNerve(actor) {
        if (actor.nerve <= 0) return false;
        actor.nerve -= 1;
        return true;
    }

    function rewardRead(state, correct) {
        if (!correct) return;
        state.player.nerve = clamp(state.player.nerve + 1, 0, MAX_NERVE);
        state.profile.correctReads += 1;
    }

    function conserveCardCount(state) {
        return state.drawPile.length
            + state.discard.length
            + state.hands.player.length
            + state.hands.stranger.length;
    }

    return Object.freeze({
        MAX_TOLERANCE,
        MAX_NERVE,
        STARTING_RETURNS,
        INGREDIENTS,
        INGREDIENT_IDS,
        CLAIMS,
        Random,
        createMatch,
        refillHand,
        consumePair,
        resolveRecipe,
        previewRecipe,
        pour,
        applyRecipe,
        checkOutcome,
        claimIsTrue,
        recordPlayerOffer,
        traceClue,
        aiRespondToOffer,
        aiChoosePour,
        createTell,
        spendNerve,
        rewardRead,
        conserveCardCount
    });
});
