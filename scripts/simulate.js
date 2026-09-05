'use strict';

const Core = require('../game-core');

const runs = Math.max(100, Number(process.argv[2]) || 10000);
const outcomes = { win: 0, loss: 0, draw: 0, timeout: 0 };
let totalRounds = 0;
let totalReads = 0;

function allPairs(hand) {
    const pairs = [];
    for (let first = 0; first < hand.length; first += 1) {
        for (let second = first + 1; second < hand.length; second += 1) {
            pairs.push([first, second]);
        }
    }
    return pairs;
}

function playerPlan(match) {
    let best = null;
    allPairs(match.hands.player).forEach((indices) => {
        const recipe = Core.previewRecipe(indices.map((index) => match.hands.player[index]));
        const danger = recipe.damage + recipe.collateral;
        const effectiveHealing = Math.min(recipe.heal, Core.MAX_TOLERANCE - match.player.tolerance);
        const canForce = recipe.cannotReturn || match.stranger.returns === 0;
        const offerScore = danger * 2.45 - recipe.heal * 1.5 - recipe.trace * (canForce ? .08 : .43)
            + recipe.distort * .5;
        const keepScore = effectiveHealing * 2.7 + recipe.nerve * .8 + recipe.foresight * .75
            - danger * 3.2;
        [
            { action: 'offer', score: offerScore, indices },
            { action: 'keep', score: keepScore, indices }
        ].forEach((candidate) => {
            if (!best || candidate.score > best.score) best = candidate;
        });
    });
    return best;
}

function play(seed) {
    const match = Core.createMatch(seed);
    for (let round = 1; round <= 30; round += 1) {
        match.round = round;
        const plan = playerPlan(match);
        const playerRecipe = Core.pour(match, 'player', plan.indices);
        if (plan.action === 'offer') {
            const claim = playerRecipe.damage > playerRecipe.heal ? 'clean' : 'strong';
            Core.recordPlayerOffer(match, claim, playerRecipe);
            const response = Core.aiRespondToOffer(match, playerRecipe, claim);
            Core.applyRecipe(match, response.action === 'return' ? 'player' : 'stranger', playerRecipe);
        } else {
            Core.applyRecipe(match, 'player', playerRecipe);
        }

        let outcome = Core.checkOutcome(match);
        if (outcome) return { outcome, rounds: round, reads: match.profile.correctReads };

        const aiPlan = Core.aiChoosePour(match);
        const aiRecipe = Core.pour(match, 'stranger', aiPlan.indices);
        const tell = Core.createTell(match, aiRecipe, aiPlan.action);
        if (aiPlan.action === 'keep') {
            Core.applyRecipe(match, 'stranger', aiRecipe);
        } else {
            const traceDanger = aiRecipe.trace >= 3;
            const inferredDanger = tell.signalDanger || traceDanger;
            const returnIt = inferredDanger && match.player.returns > 0 && !aiRecipe.cannotReturn;
            if (returnIt) match.player.returns -= 1;
            const actualDanger = aiRecipe.damage + aiRecipe.collateral > aiRecipe.heal;
            Core.rewardRead(match, returnIt ? actualDanger : !actualDanger);
            Core.applyRecipe(match, returnIt ? 'stranger' : 'player', aiRecipe);
        }

        outcome = Core.checkOutcome(match);
        if (outcome) return { outcome, rounds: round, reads: match.profile.correctReads };
    }
    return { outcome: 'timeout', rounds: 30, reads: match.profile.correctReads };
}

for (let index = 1; index <= runs; index += 1) {
    const result = play(index * 7919);
    outcomes[result.outcome] += 1;
    totalRounds += result.rounds;
    totalReads += result.reads;
}

function percent(value) {
    return `${(value / runs * 100).toFixed(1)}%`;
}

console.log(`LAST CALL heuristic simulation · ${runs.toLocaleString()} nights`);
console.log(`Player wins: ${percent(outcomes.win)} · losses: ${percent(outcomes.loss)} · draws: ${percent(outcomes.draw)} · timeouts: ${percent(outcomes.timeout)}`);
console.log(`Average length: ${(totalRounds / runs).toFixed(2)} rounds · correct reads: ${(totalReads / runs).toFixed(2)}`);
