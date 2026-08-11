import { describe, it, expect } from 'vitest';
import { normalizeText } from './typing/normalization';
import { computeRawMetrics, computeEffectiveMetrics } from './typing/metrics';
import { interKeyIntervals, computeTimingStats, keyFrequencies } from './typing/distributions';
import type { RunEvent, CharState } from './typing/types';

// ── normalizeText ─────────────────────────────────────────────────────────────

describe('normalizeText', () => {
    it('strips leading/trailing whitespace', () => {
        expect(normalizeText('  hello  ')).toBe('hello');
    });

    it('converts CRLF to LF', () => {
        expect(normalizeText('a\r\nb')).toBe('a\nb');
    });

    it('converts bare CR to LF', () => {
        expect(normalizeText('a\rb')).toBe('a\nb');
    });

    it('preserves internal spaces and tabs', () => {
        expect(normalizeText('a\t b')).toBe('a\t b');
    });

    it('trims then preserves internal newlines', () => {
        expect(normalizeText('\nfoo\nbar\n')).toBe('foo\nbar');
    });
});

// ── computeRawMetrics ─────────────────────────────────────────────────────────

function makeEvents(keys: string[]): RunEvent[] {
    return keys.map((key, i) => ({ t: i * 200, type: 'keydown' as const, key, code: key }));
}

describe('computeRawMetrics', () => {
    it('counts meaningful keystrokes correctly', () => {
        const events = makeEvents(['a', 'b', 'Backspace', ' ', 'Delete', 'ArrowLeft', 'Shift']);
        const m = computeRawMetrics(events, 6000, 0);
        expect(m.totalKeystrokes).toBe(6); // Shift excluded
        expect(m.backspaceCount).toBe(1);
        expect(m.deleteCount).toBe(1);
        expect(m.navKeyCount).toBe(1);
        expect(m.whitespaceKeystrokes).toBe(1);
        expect(m.charKeystrokes).toBe(2);
    });

    it('computes rawWPM from totalKeystrokes / 5 / minutes', () => {
        const events = makeEvents(Array(100).fill('a'));
        const m = computeRawMetrics(events, 60_000, 0);
        expect(m.rawWPM).toBe(20); // 100 / 5 / 1 min
    });

    it('returns 0 WPM for zero elapsed time', () => {
        const m = computeRawMetrics(makeEvents(['a']), 0, 0);
        expect(m.rawWPM).toBe(0);
    });
});

// ── computeEffectiveMetrics ───────────────────────────────────────────────────

describe('computeEffectiveMetrics', () => {
    it('counts correct and incorrect chars', () => {
        const states: CharState[] = ['correct', 'correct', 'incorrect', 'untyped'];
        const m = computeEffectiveMetrics(states, [false, false, true, false], 60_000);
        expect(m.correctChars).toBe(2);
        expect(m.incorrectChars).toBe(1);
        expect(m.correctedErrors).toBe(0); // was incorrect but now incorrect, not corrected
        expect(m.uncorrectedErrors).toBe(1);
    });

    it('detects corrected errors', () => {
        const states: CharState[] = ['correct', 'correct'];
        const wasEver = [false, true]; // position 1 was once wrong, now correct
        const m = computeEffectiveMetrics(states, wasEver, 60_000);
        expect(m.correctedErrors).toBe(1);
        expect(m.uncorrectedErrors).toBe(0);
    });

    it('accuracy is 100 when no chars attempted', () => {
        const m = computeEffectiveMetrics([], [], 60_000);
        expect(m.accuracy).toBe(100);
    });

    it('computes effectiveWPM', () => {
        const states: CharState[] = Array(100).fill('correct');
        const m = computeEffectiveMetrics(states, Array(100).fill(false), 60_000);
        expect(m.effectiveWPM).toBe(20);
    });
});

// ── distributions ─────────────────────────────────────────────────────────────

describe('interKeyIntervals', () => {
    it('returns differences between consecutive event timestamps', () => {
        const events: RunEvent[] = [
            { t: 0, type: 'keydown', key: 'a', code: 'KeyA' },
            { t: 150, type: 'keydown', key: 'b', code: 'KeyB' },
            { t: 400, type: 'keydown', key: 'c', code: 'KeyC' },
        ];
        expect(interKeyIntervals(events)).toEqual([150, 250]);
    });

    it('returns empty array for single event', () => {
        expect(interKeyIntervals([{ t: 0, type: 'keydown', key: 'a', code: 'KeyA' }])).toEqual([]);
    });
});

describe('computeTimingStats', () => {
    it('handles empty input', () => {
        const s = computeTimingStats([]);
        expect(s.samples).toBe(0);
        expect(s.mean).toBe(0);
    });

    it('computes correct mean and p50', () => {
        const s = computeTimingStats([100, 200, 300, 400, 500]);
        expect(s.mean).toBe(300);
        expect(s.p50).toBe(300);
    });
});

describe('keyFrequencies', () => {
    it('returns percentage per character', () => {
        const f = keyFrequencies('aab');
        expect(f['a']).toBeCloseTo(66.7, 0);
        expect(f['b']).toBeCloseTo(33.3, 0);
    });
});
