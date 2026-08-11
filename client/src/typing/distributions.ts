import { RunEvent } from './types';

export interface TimingStats {
    mean: number;
    median: number;
    stdDev: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    samples: number;
}

export function interKeyIntervals(events: RunEvent[]): number[] {
    const out: number[] = [];
    for (let i = 1; i < events.length; i++) out.push(events[i].t - events[i - 1].t);
    return out;
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
}

export function computeTimingStats(intervals: number[]): TimingStats {
    if (intervals.length === 0) {
        return { mean: 0, median: 0, stdDev: 0, p50: 0, p90: 0, p95: 0, p99: 0, samples: 0 };
    }
    const sorted = [...intervals].sort((a, b) => a - b);
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length;
    return {
        mean: Math.round(mean),
        median: percentile(sorted, 50),
        stdDev: Math.round(Math.sqrt(variance)),
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        samples: sorted.length,
    };
}

/** Returns frequency % per character (one decimal place). */
export function keyFrequencies(text: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const ch of text) counts[ch] = (counts[ch] ?? 0) + 1;
    const total = text.length;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) {
        result[k] = Math.round((v / total) * 1000) / 10;
    }
    return result;
}
