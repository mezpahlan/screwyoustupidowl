// ==UserScript==
// @name        ScrewYouStupidOwl
// @namespace   Violentmonkey Scripts
// @match       https://*.duolingo.com/*
// @grant       none
// @version     0.1
// @description When you don't want to practice.
// ==/UserScript==

let solvingIntervalId;
let isAutoMode = false;
const debug = true;
const ADD_BUTTON_DELAY = 30
const SOLVE_DELAY = 50

function addButtons() {
    // TODO: This starts practice from the home tree lesson page.
    //       We should extract this to a separate function
    if (window.location.pathname === '/learn') {
        let button = document.querySelector('a[data-test="global-practice"]');
        if (button) {
            button.click();
        }
    }

    // If we detect the existance of a known button that we have added
    // then we can return early.
    const solveAllButton = document.getElementById("solveAllButton");
    if (solveAllButton !== null) {
        return;
    }

    // TODO: What does this mean?
    //       it doesn't look like it activates in normal mode so do we really need it?
    const original = document.querySelectorAll('[data-test="player-next"]')[0];
    if (original === undefined) {
        const startButton = document.querySelector('[data-test="start-button"]');
        console.log(`Wrapper line: ${startButton}`);
        if (startButton === null) {
            return;
        }
        const wrapper = startButton.parentNode;
        const solveAllButton = document.createElement('a');
        solveAllButton.className = startButton.className;
        solveAllButton.id = "solveAllButton";
        solveAllButton.innerText = "COMPLETE SKILL";
        solveAllButton.removeAttribute('href');
        solveAllButton.addEventListener('click', () => {
            solving();
            setInterval(() => {
                const startButton = document.querySelector('[data-test="start-button"]');
                if (startButton && startButton.innerText.startsWith("START")) {
                    startButton.click();
                }
            }, 50);
            startButton.click();
        });
        wrapper.appendChild(solveAllButton);
    } else {
        const wrapper = document.getElementsByClassName('_10vOG')[0];
        wrapper.style.display = "flex";

        const solveCopy = document.createElement('button');
        const pauseCopy = document.createElement('button');

        solveCopy.id = 'solveAllButton';
        solveCopy.innerHTML = solvingIntervalId ? 'PAUSE SOLVE' : 'SOLVE ALL';
        solveCopy.disabled = false;
        pauseCopy.innerHTML = 'SOLVE';

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

        solveCopy.style.cssText = buttonStyle;
        pauseCopy.style.cssText = buttonStyle;

        [solveCopy, pauseCopy].forEach(button => {
            button.addEventListener("mousemove", () => {
                button.style.filter = "brightness(1.1)";
            });
        });

        [solveCopy, pauseCopy].forEach(button => {
            button.addEventListener("mouseleave", () => {
                button.style.filter = "none";
            });
        });

        original.parentElement.appendChild(pauseCopy);
        original.parentElement.appendChild(solveCopy);

        solveCopy.addEventListener('click', solving);
        pauseCopy.addEventListener('click', solve);
    }
}

// TODO: Also trigger startPractice
setInterval(addButtons, ADD_BUTTON_DELAY);

function solving() {
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
        // TODO: Where is next defined?? It isn't.
        if (next) {
            next.click();
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

    // TODO: Refactor ifs to switches
    // TODO: There could be sub types of each of these.
    // TODO: Alphabetise?
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
        case "name":
            solveForm();
            break;
        default:
            logDebug(window.sol.type);
    }

    // // Start of challenge switches.
    // if (document.querySelectorAll('[data-test="challenge-choice"]').length > 0) {
    //     // choice challenge
    //     if (debug)
    //         document.getElementById("solveAllButton").innerText = 'Challenge Choice';
    //     if (window.sol.correctTokens !== undefined) {
    //         correctTokensRun();
    //         nextButton.click()
    //     }
    // } else if (document.querySelectorAll('[data-test$="challenge-tap-token"]').length > 0) {
    //     // match correct pairs challenge
    //     if (window.sol.pairs !== undefined) {
    //         if (debug)
    //             document.getElementById("solveAllButton").innerText = 'Pairs';
    //         let nl = document.querySelectorAll('[data-test$="challenge-tap-token"]');
    //         if (document.querySelectorAll('[data-test="challenge-tap-token-text"]').length
    //             === nl.length) {
    //             window.sol.pairs?.forEach((pair) => {
    //                 for (let i = 0; i < nl.length; i++) {
    //                     const nlInnerText = nl[i].querySelector('[data-test="challenge-tap-token-text"]').innerText.toLowerCase().trim();
    //                     try {
    //                         if (
    //                             (
    //                                 nlInnerText === pair.transliteration.toLowerCase().trim() ||
    //                                 nlInnerText === pair.character.toLowerCase().trim()
    //                             )
    //                             && !nl[i].disabled
    //                         ) {
    //                             nl[i].click()
    //                         }
    //                     } catch (TypeError) {
    //                         if (
    //                             (
    //                                 nlInnerText === pair.learningToken.toLowerCase().trim() ||
    //                                 nlInnerText === pair.fromToken.toLowerCase().trim()
    //                             )
    //                             && !nl[i].disabled
    //                         ) {
    //                             nl[i].click()
    //                         }
    //                     }
    //                 }
    //             })
    //         }
    //     // } else if (window.sol.correctIndices !== undefined) {
    //     //     if (debug)
    //     //         document.getElementById("solveAllButton").innerText = 'Indices Run';
    //     //     correctIndicesRun();
    //     }
    // } else if (document.querySelectorAll('[data-test="challenge-tap-token-text"]').length > 0) {
    //     if (debug)
    //         document.getElementById("solveAllButton").innerText = 'Challenge Tap Token Text';
    //     // fill the gap challenge
    //     correctIndicesRun();
    // } else if (document.querySelectorAll('[data-test="challenge-text-input"]').length > 0) {
    //     if (debug)
    //         document.getElementById("solveAllButton").innerText = 'Challenge Text Input';
    //     let elm = document.querySelectorAll('[data-test="challenge-text-input"]')[0];
    //     let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    //     nativeInputValueSetter.call(elm, window.sol.correctSolutions ? window.sol.correctSolutions[0] : (window.sol.displayTokens ? window.sol.displayTokens.find(t => t.isBlank).text : window.sol.prompt));
    //     let inputEvent = new Event('input', {
    //         bubbles: true
    //     });

    //     elm.dispatchEvent(inputEvent);
    // }

    // Check answer.
    nextButton.click();

    // Move on.
    nextButton.click();
}

function solveTranslate(specificType) {
    logDebug(`Challenge Translate: ${specificType}`);

    // TODO: specifictype tap reverse_tap translate reverse translate???
    // TODO: all four specific types seem to be taken care of by the below code??

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
        // correctIndicesRun();
    }


    // TODO: Remove because we have one at the end of solve()
    // nextButton.click();
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

    // Continue
    // TODO: We have this at the end of solve()???
    // document.querySelectorAll('[data-test="player-next"]')[0].click()
}

function solveName() {
    logDebug('Name');

    // Test if we are article + text or just text.
    let correctAnswer = window.sol.correctSolutions[0].split(" ");

    if (correctAnswer.length == 2) {
        // Split the correct answer into article [0] and text [1].
        let correctArticle = correctAnswer[0]
        let correctText = correctAnswer[1]

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
        let correctText = correctAnswer[0]

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
    if (window.sol.correctIndex) {
        document.querySelectorAll('[data-test="challenge-choice"]')[window.sol.correctIndex].click();
    }
}

function correctIndicesRun() {
    if (window.sol.correctIndices) {
        window.sol.correctIndices?.forEach(index => {
            document.querySelectorAll('div[data-test="word-bank"] [data-test="challenge-tap-token-text"]')[index].click();
        });
        // nextButton.click();
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

window.ss = solving;