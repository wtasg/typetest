import { RunEvent, RawMetrics, EffectiveMetrics, CharState } from './types';
import { isMeaningfulKeystroke, isCharKey, isWhitespaceKey, isBackspace, isDelete, isNavKey } from './events';

export function computeRawMetrics(
    events: RunEvent[],
    elapsedMs: number,
    incorrectKeystrokeCount: number,
): RawMetrics {
    let totalKeystrokes = 0;
    let charKeystrokes = 0;
    let whitespaceKeystrokes = 0;
    let backspaceCount = 0;
    let deleteCount = 0;
    let navKeyCount = 0;

    for (const e of events) {
        if (!isMeaningfulKeystroke(e.key)) continue;
        totalKeystrokes++;
        if (isCharKey(e.key)) charKeystrokes++;
        else if (isWhitespaceKey(e.key)) whitespaceKeystrokes++;
        else if (isBackspace(e.key)) backspaceCount++;
        else if (isDelete(e.key)) deleteCount++;
        else if (isNavKey(e.key)) navKeyCount++;
    }

    const elapsedMinutes = elapsedMs / 60_000;
    const rawWPM = elapsedMinutes > 0 ? Math.round((totalKeystrokes / 5) / elapsedMinutes) : 0;

    return {
        totalKeystrokes,
        charKeystrokes,
        whitespaceKeystrokes,
        backspaceCount,
        deleteCount,
        navKeyCount,
        incorrectKeystrokes: incorrectKeystrokeCount,
        rawWPM,
        elapsedMs,
    };
}

export function computeEffectiveMetrics(
    charStates: CharState[],
    wasEverIncorrect: boolean[],
    elapsedMs: number,
): EffectiveMetrics {
    let correctChars = 0;
    let incorrectChars = 0;
    let correctedErrors = 0;
    let uncorrectedErrors = 0;

    for (let i = 0; i < charStates.length; i++) {
        const s = charStates[i];
        if (s === 'correct') {
            correctChars++;
            if (wasEverIncorrect[i]) correctedErrors++;
        } else if (s === 'incorrect') {
            incorrectChars++;
            uncorrectedErrors++;
        }
    }

    const totalAttempted = correctChars + incorrectChars;
    const accuracy = totalAttempted > 0 ? (correctChars / totalAttempted) * 100 : 100;
    const elapsedMinutes = elapsedMs / 60_000;
    const effectiveWPM =
        elapsedMinutes > 0 ? Math.round((correctChars / 5) / elapsedMinutes) : 0;

    return {
        targetLength: charStates.length,
        correctChars,
        effectiveChars: correctChars,
        incorrectChars,
        correctedErrors,
        uncorrectedErrors,
        accuracy: Math.round(accuracy * 10) / 10,
        effectiveWPM,
        elapsedMs,
    };
}
