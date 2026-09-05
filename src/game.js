(function runLastCall() {
    'use strict';

    // This file owns browser interaction; deterministic rules stay in game-core.js.
    const Core = window.LastCallCore;
    if (!Core) throw new Error('LAST CALL rules engine failed to load.');

    const META_KEY = 'last-call-meta-v2';
    const DEFAULT_META = Object.freeze({
        games: 0,
        wins: 0,
        draws: 0,
        discoveries: {},
        sound: true
    });

    const lines = {
        opening: [
            '“We have until the rain stops.”',
            '“The city sleeps. Our debts do not.”',
            '“Pour carefully. I dislike easy endings.”'
        ],
        playerKeep: [
            '“A professional samples the work.”',
            '“Confidence or desperation? The glass will decide.”'
        ],
        playerOffer: [
            '“Hospitality at this hour is almost suspicious.”',
            '“You have always had an honest pair of hands.”'
        ],
        correct: [
            '“A good read. Keep that nerve.”',
            '“You heard what the glass did not say.”'
        ],
        wrong: [
            '“The eyes are easy to fool. The appetite, easier.”',
            '“Trust is simply poison with better manners.”'
        ]
    };

    const elements = {};
    let meta = loadMeta();
    let match = null;
    let phase = 'title';
    let selected = [];
    let claim = 'clean';
    let activeRecipe = null;
    let nextStep = null;
    let inspected = false;
    let visibleIngredientIds = [];
    let clockStarted = 0;
    let clockTimer = 0;
    let outcomePending = null;

    class SoundEngine {
        constructor(enabled) {
            this.enabled = enabled;
            this.context = null;
        }

        ensure() {
            if (!this.enabled) return null;
            if (!this.context) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) this.context = new AudioContext();
            }
            if (this.context && this.context.state === 'suspended') this.context.resume();
            return this.context;
        }

        tone(frequency, duration, type, volume, slide) {
            const context = this.ensure();
            if (!context) return;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const now = context.currentTime;
            oscillator.type = type || 'sine';
            oscillator.frequency.setValueAtTime(frequency, now);
            if (slide) oscillator.frequency.exponentialRampToValueAtTime(slide, now + duration);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume || 0.035, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(now);
            oscillator.stop(now + duration + 0.02);
        }

        play(name) {
            if (!this.enabled) return;
            if (name === 'card') this.tone(185, .07, 'triangle', .018, 150);
            if (name === 'pour') this.tone(110, .38, 'sine', .025, 72);
            if (name === 'clink') this.tone(1180, .15, 'sine', .035, 740);
            if (name === 'harm') this.tone(82, .42, 'sawtooth', .035, 48);
            if (name === 'mercy') this.tone(320, .3, 'sine', .025, 510);
            if (name === 'reveal') {
                this.tone(170, .28, 'triangle', .025, 260);
                window.setTimeout(() => this.tone(350, .2, 'sine', .018, 520), 90);
            }
        }
    }

    const sound = new SoundEngine(meta.sound);

    function loadMeta() {
        try {
            const stored = JSON.parse(window.localStorage.getItem(META_KEY));
            return {
                ...DEFAULT_META,
                ...(stored || {}),
                discoveries: stored && stored.discoveries ? stored.discoveries : {}
            };
        } catch (error) {
            return { ...DEFAULT_META, discoveries: {} };
        }
    }

    function saveMeta() {
        try {
            window.localStorage.setItem(META_KEY, JSON.stringify(meta));
        } catch (error) {
            // Private browsing may reject storage. The current match remains playable.
        }
    }

    function cacheElements() {
        [
            'title-screen', 'begin-button', 'rules-button', 'title-games', 'title-wins', 'title-recipes',
            'game-shell', 'round-label', 'night-clock', 'sound-button', 'game-rules-button',
            'dialogue', 'physical-tell', 'player-tolerance', 'player-nerve', 'player-returns',
            'stranger-tolerance', 'stranger-nerve', 'stranger-returns', 'ritual-stage',
            'phase-kicker', 'ritual-glass', 'glass-liquid', 'glass-owner', 'trace-clue', 'peek-clue',
            'turn-number', 'decision-title', 'decision-help', 'ingredient-hand',
            'claim-controls', 'claim-options', 'player-actions', 'keep-button', 'offer-button',
            'incoming-actions', 'inspect-button', 'return-button', 'drink-button',
            'reveal-card', 'reveal-sigils', 'recipe-name', 'recipe-effect', 'resolution-line',
            'continue-actions', 'continue-button', 'discard-strip', 'seed-label',
            'rules-dialog', 'result-dialog', 'result-eyebrow', 'result-heading', 'result-copy',
            'result-rounds', 'result-reads', 'result-recipes', 'again-button', 'leave-button',
            'live-region'
        ].forEach((id) => {
            elements[id] = document.getElementById(id);
        });
    }

    function bindEvents() {
        elements['begin-button'].addEventListener('click', startMatch);
        elements['again-button'].addEventListener('click', () => {
            closeDialog(elements['result-dialog']);
            startMatch();
        });
        elements['leave-button'].addEventListener('click', leaveBar);
        elements['rules-button'].addEventListener('click', showRules);
        elements['game-rules-button'].addEventListener('click', showRules);
        elements['sound-button'].addEventListener('click', toggleSound);
        elements['keep-button'].addEventListener('click', () => commitPlayerPour('keep'));
        elements['offer-button'].addEventListener('click', () => commitPlayerPour('offer'));
        elements['inspect-button'].addEventListener('click', inspectOffer);
        elements['return-button'].addEventListener('click', () => answerOffer('return'));
        elements['drink-button'].addEventListener('click', () => answerOffer('drink'));
        elements['continue-button'].addEventListener('click', continueNight);
        document.addEventListener('keydown', handleShortcuts);
    }

    function showRules() {
        showDialog(elements['rules-dialog']);
    }

    function showDialog(dialog) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function closeDialog(dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    function toggleSound() {
        sound.enabled = !sound.enabled;
        meta.sound = sound.enabled;
        saveMeta();
        elements['sound-button'].setAttribute('aria-pressed', String(sound.enabled));
        elements['sound-button'].textContent = sound.enabled ? 'Sound on' : 'Sound off';
        if (sound.enabled) sound.play('clink');
    }

    function seedForNight() {
        const supplied = new URLSearchParams(window.location.search).get('seed');
        if (supplied && Number.isFinite(Number(supplied))) return Number(supplied);
        return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
    }

    function startMatch() {
        sound.ensure();
        match = Core.createMatch(seedForNight());
        phase = 'player-select';
        selected = [];
        claim = 'clean';
        activeRecipe = null;
        nextStep = null;
        inspected = false;
        visibleIngredientIds = [];
        outcomePending = null;
        clockStarted = Date.now();
        window.clearInterval(clockTimer);
        clockTimer = window.setInterval(renderClock, 1000);
        elements['title-screen'].hidden = true;
        elements['game-shell'].hidden = false;
        elements['seed-label'].textContent = `Night #${String(match.seed >>> 0).padStart(10, '0')}`;
        elements.dialogue.textContent = pick(lines.opening);
        elements['physical-tell'].textContent = 'His hands rest beneath the bar.';
        beginPlayerTurn();
        renderClock();
        announce('The bar is open. Choose two ingredients.');
    }

    function leaveBar() {
        closeDialog(elements['result-dialog']);
        window.clearInterval(clockTimer);
        elements['game-shell'].hidden = true;
        elements['title-screen'].hidden = false;
        phase = 'title';
        renderTitle();
        elements['begin-button'].focus();
    }

    function pick(values) {
        if (!match) return values[0];
        return match.rng.pick(values);
    }

    function roman(number) {
        const values = [
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
        ];
        let result = '';
        let remaining = number;
        values.forEach(([value, mark]) => {
            while (remaining >= value) {
                result += mark;
                remaining -= value;
            }
        });
        return result;
    }

    function renderClock() {
        if (!clockStarted) return;
        const elapsed = Math.floor((Date.now() - clockStarted) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        elements['night-clock'].textContent = `03:${minutes}:${seconds}`;
    }

    function renderTitle() {
        elements['title-games'].textContent = String(meta.games);
        elements['title-wins'].textContent = String(meta.wins);
        elements['title-recipes'].textContent = String(Object.keys(meta.discoveries).length);
    }

    function renderMatch() {
        elements['round-label'].textContent = `Round ${roman(match.round)}`;
        renderPips(elements['player-tolerance'], match.player.tolerance, Core.MAX_TOLERANCE);
        renderPips(elements['stranger-tolerance'], match.stranger.tolerance, Core.MAX_TOLERANCE);
        renderPips(elements['player-nerve'], match.player.nerve, Core.MAX_NERVE);
        renderPips(elements['stranger-nerve'], match.stranger.nerve, Core.MAX_NERVE);
        renderTokens(elements['player-returns'], match.player.returns);
        renderTokens(elements['stranger-returns'], match.stranger.returns);
        renderDiscard();
    }

    function renderPips(container, filled, maximum) {
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < maximum; index += 1) {
            const pip = document.createElement('i');
            pip.className = index < filled ? 'pip is-filled' : 'pip';
            fragment.appendChild(pip);
        }
        container.replaceChildren(fragment);
        container.setAttribute('aria-label', `${filled} of ${maximum}`);
    }

    function renderTokens(container, count) {
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < Core.STARTING_RETURNS; index += 1) {
            const token = document.createElement('i');
            token.className = 'token';
            if (index >= count) token.style.opacity = '.16';
            fragment.appendChild(token);
        }
        container.replaceChildren(fragment);
        container.setAttribute('aria-label', `${count} remaining`);
    }

    function renderDiscard() {
        const fragment = document.createDocumentFragment();
        match.discard.forEach((id) => {
            const chip = document.createElement('span');
            chip.className = 'discard-chip';
            chip.textContent = Core.INGREDIENTS[id].mark;
            chip.title = Core.INGREDIENTS[id].name;
            fragment.appendChild(chip);
        });
        elements['discard-strip'].replaceChildren(fragment);
    }

    function resetDecisionPanels() {
        elements['claim-controls'].hidden = true;
        elements['player-actions'].hidden = true;
        elements['incoming-actions'].hidden = true;
        elements['reveal-card'].hidden = true;
        elements['continue-actions'].hidden = true;
    }

    function beginPlayerTurn() {
        phase = 'player-select';
        selected = [];
        claim = 'clean';
        activeRecipe = null;
        nextStep = null;
        inspected = false;
        visibleIngredientIds = [];
        outcomePending = null;
        resetDecisionPanels();
        elements['turn-number'].textContent = 'Your hand';
        elements['decision-title'].textContent = 'Choose two ingredients.';
        elements['decision-help'].textContent = 'Every card exists in the room. Watch what leaves the deck.';
        elements['phase-kicker'].textContent = 'Your pour';
        elements['glass-owner'].textContent = 'Choose two ingredients';
        elements['trace-clue'].textContent = 'Your mixture is private until someone drinks.';
        elements['peek-clue'].textContent = 'Select a pair to study its expected effect.';
        elements['physical-tell'].textContent = 'He waits without blinking.';
        setGlass(null, false);
        renderMatch();
        renderHand();
        renderClaims();
    }

    function renderHand() {
        const fragment = document.createDocumentFragment();
        match.hands.player.forEach((id, index) => {
            const ingredient = Core.INGREDIENTS[id];
            const card = document.createElement('button');
            const isSelected = selected.includes(index);
            const selectionLocked = selected.length === 2 && !isSelected;
            card.type = 'button';
            card.className = `ingredient-card${isSelected ? ' is-selected' : ''}`;
            card.style.setProperty('--card-color', ingredient.hue);
            card.setAttribute('aria-pressed', String(isSelected));
            card.setAttribute('aria-label', `${ingredient.name}. ${ingredient.description}`);
            card.disabled = phase !== 'player-select' || selectionLocked;
            card.dataset.index = String(index);

            const mark = document.createElement('span');
            mark.className = 'card-mark';
            mark.textContent = ingredient.mark;
            const name = document.createElement('strong');
            name.className = 'card-name';
            name.textContent = ingredient.name;
            const detail = document.createElement('span');
            detail.className = 'card-detail';
            detail.textContent = ingredient.description;
            const kind = document.createElement('span');
            kind.className = 'card-kind';
            kind.textContent = ingredient.kind;
            detail.appendChild(kind);
            card.append(mark, name, detail);
            card.addEventListener('click', () => toggleIngredient(index));
            fragment.appendChild(card);
        });
        elements['ingredient-hand'].replaceChildren(fragment);
        elements['ingredient-hand'].hidden = phase !== 'player-select';
    }

    function renderClaims() {
        const fragment = document.createDocumentFragment();
        Object.values(Core.CLAIMS).forEach((option, index) => {
            const wrapper = document.createElement('span');
            wrapper.className = 'claim-option';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'claim';
            radio.id = `claim-${option.id}`;
            radio.value = option.id;
            radio.checked = option.id === claim;
            const label = document.createElement('label');
            label.htmlFor = radio.id;
            label.textContent = option.label;
            label.title = option.description;
            radio.addEventListener('change', () => {
                claim = option.id;
                sound.play('card');
            });
            wrapper.append(radio, label);
            fragment.appendChild(wrapper);
            if (index === 0) claim = option.id;
        });
        elements['claim-options'].replaceChildren(fragment);
    }

    function toggleIngredient(index) {
        if (phase !== 'player-select') return;
        sound.play('card');
        if (selected.includes(index)) {
            selected = selected.filter((value) => value !== index);
        } else if (selected.length < 2) {
            selected.push(index);
        }
        renderHand();
        const ready = selected.length === 2;
        elements['claim-controls'].hidden = !ready;
        elements['player-actions'].hidden = !ready;
        if (ready) {
            const ids = selected.map((handIndex) => match.hands.player[handIndex]);
            const preview = Core.previewRecipe(ids);
            elements['decision-title'].textContent = 'Name the glass—or lie.';
            elements['decision-help'].textContent = `Expected: ${preview.effectText}. Volatile outcomes resolve only when revealed.`;
            elements['glass-owner'].textContent = ids.map((id) => Core.INGREDIENTS[id].name).join(' + ');
            elements['trace-clue'].textContent = Core.traceClue(preview.trace);
            elements['peek-clue'].textContent = 'The Stranger sees only your claim and the residue.';
            setGlass(preview, false);
            elements['keep-button'].focus();
        } else {
            elements['decision-title'].textContent = 'Choose two ingredients.';
            elements['decision-help'].textContent = 'Every card exists in the room. Watch what leaves the deck.';
            elements['glass-owner'].textContent = selected.length ? Core.INGREDIENTS[match.hands.player[selected[0]]].name : 'Choose two ingredients';
            elements['trace-clue'].textContent = 'Your mixture is private until someone drinks.';
            elements['peek-clue'].textContent = 'Select a pair to study its expected effect.';
            setGlass(null, false);
        }
    }

    function setGlass(recipe, offered) {
        const glass = elements['ritual-glass'];
        glass.classList.toggle('is-empty', !recipe);
        glass.classList.toggle('is-offered', Boolean(offered));
        glass.classList.remove('is-revealed');
        if (recipe) {
            elements['glass-liquid'].style.setProperty('--liquid', recipe.hue);
            elements['glass-liquid'].style.setProperty('--trace-level', String(recipe.trace));
            elements['ritual-stage'].dataset.trace = String(recipe.trace);
        } else {
            delete elements['ritual-stage'].dataset.trace;
        }
    }

    function commitPlayerPour(action) {
        if (phase !== 'player-select' || selected.length !== 2) return;
        sound.play('pour');
        activeRecipe = Core.pour(match, 'player', selected);
        selected = [];
        renderMatch();
        elements['ingredient-hand'].hidden = true;
        elements['claim-controls'].hidden = true;
        elements['player-actions'].hidden = true;
        elements['phase-kicker'].textContent = action === 'offer' ? 'Your offer' : 'Your choice';
        setGlass(activeRecipe, action === 'offer');

        if (action === 'keep') {
            elements.dialogue.textContent = pick(lines.playerKeep);
            elements['physical-tell'].textContent = 'A thin smile appears as you lift the glass.';
            resolveDrink('player', 'stranger');
            return;
        }

        Core.recordPlayerOffer(match, claim, activeRecipe);
        elements.dialogue.textContent = pick(lines.playerOffer);
        const response = Core.aiRespondToOffer(match, activeRecipe, claim);
        elements.dialogue.textContent = `“${response.line}”`;
        elements['physical-tell'].textContent = response.glimpse
            ? `His earlier glimpse found ${Core.INGREDIENTS[response.glimpse].name}.`
            : 'He reads the residue, then your face.';
        resolveDrink(response.action === 'return' ? 'player' : 'stranger', 'stranger');
    }

    function beginStrangerTurn() {
        phase = 'stranger-pour';
        resetDecisionPanels();
        elements['ingredient-hand'].hidden = true;
        const plan = Core.aiChoosePour(match);
        activeRecipe = Core.pour(match, 'stranger', plan.indices);
        const tell = Core.createTell(match, activeRecipe, plan.action);
        renderMatch();
        elements['turn-number'].textContent = 'The Stranger pours';
        elements['phase-kicker'].textContent = plan.action === 'offer' ? 'His offer' : 'His choice';
        elements['glass-owner'].textContent = plan.action === 'offer' ? `Claim: ${Core.CLAIMS[plan.claim].label}` : 'The Stranger keeps the glass';
        elements.dialogue.textContent = `“${tell.line}”`;
        elements['physical-tell'].textContent = tell.tell;
        elements['trace-clue'].textContent = Core.traceClue(activeRecipe.trace);
        setGlass(activeRecipe, plan.action === 'offer');
        sound.play('pour');

        if (plan.action === 'keep') {
            elements['decision-title'].textContent = 'He drinks his own work.';
            elements['decision-help'].textContent = 'Even the immortal pays for a careless pour.';
            resolveDrink('stranger', 'advance');
            return;
        }

        phase = 'incoming-offer';
        inspected = false;
        visibleIngredientIds = [];
        if (match.player.foresight > 0) {
            match.player.foresight -= 1;
            visibleIngredientIds.push(activeRecipe.ids[0]);
            elements['peek-clue'].textContent = `Bitters-memory: one ingredient is ${Core.INGREDIENTS[activeRecipe.ids[0]].name}.`;
        } else {
            elements['peek-clue'].textContent = 'Spend 1 Nerve to expose one ingredient.';
        }
        elements['decision-title'].textContent = `He calls it “${Core.CLAIMS[plan.claim].label}.”`;
        elements['decision-help'].textContent = 'Residue is reliable. His body usually is. The claim may be a lie.';
        elements['incoming-actions'].hidden = false;
        elements['inspect-button'].disabled = match.player.nerve <= 0 || visibleIngredientIds.length > 0;
        elements['return-button'].disabled = match.player.returns <= 0 || activeRecipe.cannotReturn;
        elements['return-button'].textContent = activeRecipe.cannotReturn ? 'Blood oath · no return' : 'Return the glass';
        announce('The Stranger offers a drink. Inspect, return, or drink.');
    }

    function inspectOffer() {
        if (phase !== 'incoming-offer' || inspected || !Core.spendNerve(match.player)) return;
        inspected = true;
        const hidden = activeRecipe.ids.find((id, index) => !visibleIngredientIds.includes(id) || activeRecipe.ids.indexOf(id) !== index);
        visibleIngredientIds.push(hidden || activeRecipe.ids[0]);
        const names = visibleIngredientIds.map((id) => Core.INGREDIENTS[id].name);
        elements['peek-clue'].textContent = `Inspection reveals: ${names.join(' + ')}.`;
        elements['inspect-button'].disabled = true;
        renderMatch();
        sound.play('reveal');
        announce(elements['peek-clue'].textContent);
    }

    function answerOffer(action) {
        if (phase !== 'incoming-offer') return;
        const dangerous = activeRecipe.damage + activeRecipe.collateral > activeRecipe.heal;
        const correct = action === 'return' ? dangerous : !dangerous;
        if (action === 'return') {
            if (match.player.returns <= 0 || activeRecipe.cannotReturn) return;
            match.player.returns -= 1;
        }
        Core.rewardRead(match, correct);
        elements.dialogue.textContent = pick(correct ? lines.correct : lines.wrong);
        elements['physical-tell'].textContent = correct
            ? 'For the first time, he looks away.'
            : 'The corner of his mouth lifts.';
        resolveDrink(action === 'return' ? 'stranger' : 'player', 'advance', correct);
    }

    function resolveDrink(target, after, correctRead) {
        phase = 'reveal';
        nextStep = after;
        elements['incoming-actions'].hidden = true;
        const result = Core.applyRecipe(match, target, activeRecipe);
        outcomePending = Core.checkOutcome(match);
        discover(activeRecipe);
        renderMatch();
        revealRecipe(result, correctRead);
    }

    function discover(recipe) {
        meta.discoveries[recipe.name] = true;
        saveMeta();
    }

    function revealRecipe(result, correctRead) {
        elements['turn-number'].textContent = 'Reveal';
        elements['decision-title'].textContent = 'The glass confesses.';
        elements['decision-help'].textContent = 'Both ingredients enter the public discard. Nothing poured is forgotten.';
        sound.play('reveal');
        window.setTimeout(() => {
            if (result.damageTaken || result.collateralTaken) sound.play('harm');
            else if (result.healingReceived) sound.play('mercy');
            else sound.play('clink');
        }, 150);
        const fragment = document.createDocumentFragment();
        activeRecipe.ids.forEach((id) => {
            const ingredient = Core.INGREDIENTS[id];
            const sigil = document.createElement('span');
            sigil.className = 'reveal-sigil';
            sigil.style.color = ingredient.hue;
            sigil.textContent = ingredient.mark;
            const label = document.createElement('small');
            label.textContent = ingredient.name;
            sigil.appendChild(label);
            fragment.appendChild(sigil);
        });
        elements['reveal-sigils'].replaceChildren(fragment);
        elements['recipe-name'].textContent = activeRecipe.name;
        elements['recipe-effect'].textContent = activeRecipe.effectText;
        elements['resolution-line'].textContent = resolutionText(result, correctRead);
        elements['reveal-card'].hidden = false;
        elements['continue-actions'].hidden = false;
        elements['continue-button'].textContent = outcomePending
            ? 'Settle the account'
            : nextStep === 'stranger'
                ? 'Watch him pour'
                : 'Face the next round';
        elements['ritual-glass'].classList.add('is-revealed');
        elements['glass-owner'].textContent = `${activeRecipe.name} · revealed`;
        elements['trace-clue'].textContent = Core.traceClue(activeRecipe.trace);
        announce(`${activeRecipe.name}. ${activeRecipe.effectText}. ${elements['resolution-line'].textContent}`);
        elements['continue-button'].focus();
    }

    function resolutionText(result, correctRead) {
        const targetName = result.target === 'player' ? 'You' : 'The Stranger';
        const parts = [];
        if (result.damageTaken) parts.push(`${targetName} lost ${result.damageTaken} Tolerance`);
        if (result.healingReceived) parts.push(`${targetName} restored ${result.healingReceived} Tolerance`);
        if (result.collateralTaken) {
            const otherName = result.other === 'player' ? 'you' : 'the Stranger';
            parts.push(`the blood oath dealt ${result.collateralTaken} to ${otherName}`);
        }
        if (activeRecipe.nerve) parts.push(`${targetName} recovered Nerve`);
        if (activeRecipe.foresight) parts.push(`${targetName} gained a future glimpse`);
        if (activeRecipe.distort) parts.push(`${targetName}'s next tell will twist`);
        if (!parts.length) parts.push('The glass leaves no wound');
        if (typeof correctRead === 'boolean') parts.push(correctRead ? 'your read was true' : 'your read was false');
        return `${parts.join(' · ')}.`;
    }

    function continueNight() {
        if (phase !== 'reveal') return;
        if (outcomePending) {
            finishMatch(outcomePending);
            return;
        }
        if (nextStep === 'stranger') beginStrangerTurn();
        else {
            match.round += 1;
            beginPlayerTurn();
        }
    }

    function finishMatch(outcome) {
        phase = 'result';
        window.clearInterval(clockTimer);
        meta.games += 1;
        if (outcome === 'win') meta.wins += 1;
        if (outcome === 'draw') meta.draws += 1;
        saveMeta();
        const discoveries = Object.keys(meta.discoveries).length;
        const survivedThree = meta.wins >= 3;

        if (outcome === 'win') {
            elements['result-eyebrow'].textContent = survivedThree ? 'The hidden tab opens' : 'The Stranger folds';
            elements['result-heading'].textContent = survivedThree ? 'Your name was already in the ledger.' : 'You survived the night.';
            elements['result-copy'].textContent = survivedThree
                ? 'Three debts paid. Beneath the bar, a thirteenth bottle waits with your name in the glass. The Stranger was never testing your poison. He was interviewing his replacement.'
                : 'He leaves no body—only a wet coin and the certainty that closing time will come again.';
        } else if (outcome === 'loss') {
            elements['result-eyebrow'].textContent = 'The house collects';
            elements['result-heading'].textContent = 'Your last call was answered.';
            elements['result-copy'].textContent = 'The Stranger closes your eyes, finishes the drink, and turns the sign back to OPEN.';
        } else {
            elements['result-eyebrow'].textContent = 'A blood-red draw';
            elements['result-heading'].textContent = 'Neither debt survives.';
            elements['result-copy'].textContent = 'For one perfect second, mortal and monster fall together. Then the rain begins to laugh.';
        }
        elements['result-rounds'].textContent = String(match.round);
        elements['result-reads'].textContent = String(match.profile.correctReads);
        elements['result-recipes'].textContent = String(discoveries);
        renderTitle();
        showDialog(elements['result-dialog']);
        sound.play(outcome === 'win' ? 'mercy' : 'harm');
    }

    function handleShortcuts(event) {
        if (phase !== 'player-select' || event.altKey || event.metaKey || event.ctrlKey) return;
        const index = Number(event.key) - 1;
        if (index >= 0 && index < match.hands.player.length) {
            event.preventDefault();
            toggleIngredient(index);
        }
    }

    function announce(message) {
        elements['live-region'].textContent = '';
        window.setTimeout(() => {
            elements['live-region'].textContent = message;
        }, 20);
    }

    cacheElements();
    bindEvents();
    renderTitle();
    elements['sound-button'].setAttribute('aria-pressed', String(sound.enabled));
    elements['sound-button'].textContent = sound.enabled ? 'Sound on' : 'Sound off';
}());
