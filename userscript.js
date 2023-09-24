// ==UserScript==
// @name        ScrewYouStupidOwl
// @namespace   Violentmonkey Scripts
// @match       https://*.duolingo.com/*
// @run-at      document-start
// @grant       none
// @version     0.1
// @description When you don't want to practice.
// ==/UserScript==

let solvingIntervalId;
let isAutoMode = false;
const debug = true;
const ADD_BUTTON_DELAY = 300
const SOLVE_DELAY = 50

function addButtons() {
    // TODO: This starts practice from the home tree lesson page.
    //       We should extract this to a separate function
    if (/learn/.test (location.pathname) ) {
        var newURL = location.protocol + "//" + location.host + "/practice"
        location.replace(newURL);
    }

    // If we detect the existance of a known button that we have added
    // then we can return early.
    if (document.getElementById("solveAllButton") !== null) {
        return;
    }

    
    const original = document.querySelectorAll('[data-test="player-next"]')[0];
    const wrapper = document.getElementsByClassName('_10vOG')[0];
    wrapper.style.display = "flex";

    const solveAllButton = document.createElement('button');

    solveAllButton.id = 'solveAllButton';
    solveAllButton.innerHTML = solvingIntervalId ? 'PAUSE SOLVE ALL' : 'SOLVE ALL';
    solveAllButton.disabled = false;

    const buttonStyle = `
                            min-width: 150px;
                            font-size: 17px;
                            border:none;
                            border-bottom: 4px solid #58a700;
                            border-radius: 18px;
                            padding: 13px 16px;
                            transform: translateZ(0);
                            transition: filter .2s;
                            font-weight: 700;
                            letter-spacing: .8px;
                            background: #55CD2E;
                            color:#fff;
                            margin-left:20px;
                            cursor:pointer;
                            `;

    solveAllButton.style.cssText = buttonStyle;

    original.parentElement.appendChild(solveAllButton);

    solveAllButton.addEventListener('click', solveAll);

    // Trigger auto solve.
    solveAllButton.click();
}

setInterval(addButtons, ADD_BUTTON_DELAY);

function solveAll() {
    if (solvingIntervalId) {
        clearInterval(solvingIntervalId);
        solvingIntervalId = undefined;
        document.getElementById("solveAllButton").innerText = "SOLVE ALL";
        isAutoMode = false;
    } else {
        document.getElementById("solveAllButton").innerText = "PAUSE SOLVE";
        isAutoMode = true;
        solvingIntervalId = setInterval(solve, SOLVE_DELAY);
    }
}

function solve() {
    // If we are at the end of a lesson, move on.
    const selAgain = document.querySelectorAll('[data-test="player-practice-again"]');
    const practiceAgain = document.querySelector('[data-test="player-practice-again"]');
    if (selAgain.length === 1 && isAutoMode) {
        // Make sure it's the `practice again` button
        //if (selAgain[0].innerHTML.toLowerCase() === 'practice again') {
        // Click the `practice again` button
        selAgain[0].click();
        // Terminate
        return;
        //}
    }
    if (practiceAgain !== null && isAutoMode) {
        practiceAgain.click();
        return;
    }

    // Try and find the solutions using the magic class. If we can't we must be on another page, move on.
    // TODO: This isn't available until after we have selected the first solve. Can we do this on page load?
    try {
        window.sol = findReact(document.getElementsByClassName('_3FiYg')[0]).props.currentChallenge;
    } catch {
        let nextButton = document.querySelector('[data-test="player-next"]');
        if (nextButton) {
            nextButton.click();
        }
        return;
    }

    // If we don't have solutions, we're not practicing, return early.
    if (!window.sol) {
        return;
    }

    // If we don't have a next button, we're not practising, return early.
    // TODO: We have already defined this?? Remove?
    let nextButton = document.querySelector('[data-test="player-next"]');
    if (!nextButton) {
        return;
    } else if (nextButton.textContent === 'Continue') {
        // Defeat motivation interstitial message if it appears.
        nextButton.click();
        return;
    }

    switch (window.sol.type) {
        case "translate":
            solveTranslate(window.sol.challengeGeneratorIdentifier.specificType);
            break;
        case "gapFill":
            solveGapFill()
            break;
        case "partialReverseTranslate":
            solvePartialReverseTranslate();
            break;
        case "assist":
            solveAssist();
            break;
        case "listenIsolation":
            solveListenIsolation();
            break;
        case "listenMatch":
            solveListenMatch();
            break;
        case "name":
            solveName();
            break;
        case "form":
            solveForm();
            break;
        default:
            logDebug(window.sol.type);
    }

    // Check answer.
    nextButton.click();

    // Move on.
    nextButton.click();
}

function solveTranslate(specificType) {
    logDebug(`Challenge Translate: ${specificType}`);

    const nextButton = document.querySelector('[data-test="player-next"]');

    // Do we have a free text box or tokens?
    const elm = document.querySelector('textarea[data-test="challenge-translate-input"]');

    if (elm) {
        // Solve the free text translate.
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(elm, window.sol.correctSolutions ? window.sol.correctSolutions[0] : window.sol.prompt);

        let inputEvent = new Event('input', {
            bubbles: true
        });

        elm.dispatchEvent(inputEvent);
    } else {
        // Solve the token translate.
        correctTokensRun();
    }
}

function solveGapFill() {
    logDebug('Gap Fill');

    correctIndexRun();
}

function solvePartialReverseTranslate() {
    logDebug('Partial Reverse Translate');

    let elm = document.querySelector('[data-test*="challenge-partialReverseTranslate"]')?.querySelector("span[contenteditable]");
    let nativeInputNodeTextSetter = Object.getOwnPropertyDescriptor(Node.prototype, "textContent").set
    nativeInputNodeTextSetter.call(elm, window.sol?.displayTokens?.filter(t => t.isBlank)?.map(t => t.text)?.join()?.replaceAll(',', ''));
    let inputEvent = new Event('input', {
        bubbles: true
    });

    elm.dispatchEvent(inputEvent);
}

function solveAssist() {
    logDebug('Assist');

    correctIndexRun();
}

function solveListenIsolation() {
    logDebug('Listen Isolation');

    skipListenExercise();

}

function solveListenMatch() {
    logDebug('Listen Match');

    skipListenExercise();
}

function skipListenExercise() {
    // Skip exercise
    const buttonSkip = document.querySelector('button[data-test="player-skip"]');
    if (buttonSkip) {
        buttonSkip.click();
    }
}

function solveName() {
    logDebug('Name');

    // Test if we are article + text or just text.
    let correctAnswer = window.sol.correctSolutions[0];
    let judge = document.querySelectorAll('[data-test="challenge-judge-text"]');

    if (judge.length > 0) {
        // Split the correct answer into article [0] and text [1].
        let correctAnswerSplit = correctAnswer.split(" ");
        let correctArticle = correctAnswerSplit[0]
        let correctText = correctAnswerSplit[1]

        // Input the correctText.
        let elm = document.querySelectorAll('[data-test="challenge-text-input"]')[0];
        let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(elm, correctText);
        let inputEvent = new Event('input', {
            bubbles: true
        });
        elm.dispatchEvent(inputEvent);

        // Select the correctArticle.
        document.querySelectorAll('[data-test="challenge-judge-text"]').forEach((article) => {
            if (article.textContent === correctArticle) article.click()
        })
    } else {
        // Just text
        let correctText = correctAnswer;

        // Input the correctText.
        let elm = document.querySelectorAll('[data-test="challenge-text-input"]')[0];
        let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(elm, correctText);
        let inputEvent = new Event('input', {
            bubbles: true
        });
        elm.dispatchEvent(inputEvent);
    }
}

function solveForm() {
    logDebug('Form');

    correctIndexRun();
}

function correctTokensRun() {
    const all_tokens = document.querySelectorAll('[data-test$="challenge-tap-token"]');
    const correct_tokens = window.sol.correctTokens;
    const clicked_tokens = [];
    correct_tokens.forEach(correct_token => {
        const matching_elements = Array.from(all_tokens).filter(element => element.textContent.trim() === correct_token.trim());
        if (matching_elements.length > 0) {
            const match_index = clicked_tokens.filter(token => token.textContent.trim() === correct_token.trim()).length;
            if (match_index < matching_elements.length) {
                matching_elements[match_index].click();
                clicked_tokens.push(matching_elements[match_index]);
            } else {
                clicked_tokens.push(matching_elements[0]);
            }
        }
    });
}

function correctIndexRun() {
    if (window.sol.correctIndex !== undefined) {
        document.querySelectorAll('[data-test="challenge-choice"]')[window.sol.correctIndex].click();
    }
}

function correctIndicesRun() {
    if (window.sol.correctIndices) {
        window.sol.correctIndices?.forEach(index => {
            document.querySelectorAll('div[data-test="word-bank"] [data-test="challenge-tap-token-text"]')[index].click();
        });
    }
}

function findSubReact(dom, traverseUp = 0) {
    const key = Object.keys(dom).find(key => key.startsWith("__reactProps$"));
    return dom.parentElement[key].children.props;
}

function findReact(dom, traverseUp = 0) {
    let reactProps = Object.keys(dom.parentElement).find((key) => key.startsWith("__reactProps$"));
    while (traverseUp-- > 0 && dom.parentElement) {
        dom = dom.parentElement;
        reactProps = Object.keys(dom.parentElement).find((key) => key.startsWith("__reactProps$"));
    }
    return dom?.parentElement?.[reactProps]?.children[0]?._owner?.stateNode;
}

function logDebug(text) {
    // Only log in debug mode and if there is a solve all button available.
    const solveAllButton = document.getElementById("solveAllButton")
    if (debug && solveAllButton) {
        solveAllButton.innerText = text
    }
}

window.findReact = findReact;

window.ss = solveAll;