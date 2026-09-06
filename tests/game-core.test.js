'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../src/game-core');

test('a new match deals two five-card hands without creating cards', () => {
    const match = Core.createMatch(1408);
    assert.equal(match.hands.player.length, 5);
    assert.equal(match.hands.stranger.length, 5);
    assert.equal(match.drawPile.length, 14);
    assert.equal(Core.conserveCardCount(match), 24);
});

test('seeded matches are deterministic', () => {
    const first = Core.createMatch(77);
    const second = Core.createMatch(77);
    assert.deepEqual(first.hands, second.hands);
    assert.deepEqual(first.drawPile, second.drawPile);
});

test('pouring consumes real hand cards, refills, and conserves the deck', () => {
    const match = Core.createMatch(12);
    const selected = [match.hands.player[0], match.hands.player[3]];
    const recipe = Core.pour(match, 'player', [0, 3]);
    assert.deepEqual(recipe.ids, selected);
    assert.equal(match.hands.player.length, 5);
    assert.equal(match.discard.length, 2);
    assert.equal(Core.conserveCardCount(match), 24);
});

test('honey masks hemlock residue but never cures its poison', () => {
    const recipe = Core.resolveRecipe(['hemlock', 'honey'], new Core.Random(1));
    assert.equal(recipe.name, 'Sweet Funeral');
    assert.equal(recipe.damage, 3);
    assert.equal(recipe.heal, 0);
    assert.equal(recipe.trace, 3);
});

test('rosemary cancels two points of hemlock damage', () => {
    const recipe = Core.resolveRecipe(['hemlock', 'rosemary'], new Core.Random(1));
    assert.equal(recipe.damage, 1);
    assert.equal(recipe.trace, 4);
});

test('moonshine copies one resolved absinthe outcome, never rerolls it', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
        const recipe = Core.resolveRecipe(['moonshine', 'absinthe'], new Core.Random(seed));
        assert.equal(recipe.volatileResults.length, 1);
        assert.ok(
            (recipe.damage === 4 && recipe.heal === 0)
            || (recipe.damage === 0 && recipe.heal === 4)
        );
    }
});

test('two moonshines form White Static', () => {
    const recipe = Core.resolveRecipe(['moonshine', 'moonshine'], new Core.Random(1));
    assert.equal(recipe.name, 'White Static');
    assert.equal(recipe.heal, 1);
    assert.equal(recipe.nerve, 1);
    assert.equal(recipe.trace, 3);
});

test('bitters grants a future glimpse to its drinker', () => {
    const match = Core.createMatch(3);
    const recipe = Core.resolveRecipe(['bitters', 'salt'], match.rng);
    Core.applyRecipe(match, 'player', recipe);
    assert.equal(match.player.foresight, 1);
    assert.equal(match.player.nerve, 3);
});

test('blood can kill both duelists in a draw', () => {
    const match = Core.createMatch(4);
    match.player.tolerance = 1;
    match.stranger.tolerance = 1;
    const recipe = Core.resolveRecipe(['blood', 'blood'], match.rng);
    Core.applyRecipe(match, 'player', recipe);
    assert.equal(Core.checkOutcome(match), 'draw');
    assert.equal(recipe.cannotReturn, true);
});

test('claims are judged against resolved effects', () => {
    const poison = Core.resolveRecipe(['nightshade', 'honey'], new Core.Random(2));
    const mercy = Core.resolveRecipe(['whiskey', 'honey'], new Core.Random(2));
    assert.equal(Core.claimIsTrue('clean', poison), false);
    assert.equal(Core.claimIsTrue('strong', poison), true);
    assert.equal(Core.claimIsTrue('restorative', mercy), true);
    assert.equal(Core.claimIsTrue('silence', poison), true);
});

test('the Stranger selects two cards that actually exist in its hand', () => {
    const match = Core.createMatch(404);
    const original = match.hands.stranger.slice();
    const plan = Core.aiChoosePour(match);
    assert.equal(plan.indices.length, 2);
    assert.notEqual(plan.indices[0], plan.indices[1]);
    const expected = plan.indices.map((index) => original[index]);
    const recipe = Core.pour(match, 'stranger', plan.indices);
    assert.deepEqual(recipe.ids, expected);
    assert.equal(Core.conserveCardCount(match), 24);
});

test('cards cannot drift across repeated legal pours and reshuffles', () => {
    const match = Core.createMatch(808);
    for (let turn = 0; turn < 80; turn += 1) {
        const actor = turn % 2 ? 'stranger' : 'player';
        Core.pour(match, actor, [0, 1]);
        assert.equal(Core.conserveCardCount(match), 24);
        assert.equal(match.hands.player.length, 5);
        assert.equal(match.hands.stranger.length, 5);
    }
});
