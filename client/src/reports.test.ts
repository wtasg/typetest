import { describe, it, expect, beforeEach } from 'vitest';
import { isLocalhost } from './api/health';
import {
    addRunSummary, loadRunSummaries, updateSummarySync,
    addToSyncQueue, loadSyncQueue, removeFromSyncQueue,
} from './storage/localStorage';
import type { RunSummary, AggregateStats } from './typing/types';

// Mock browser globals for Node test environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, val: string) => mockStorage.set(key, val),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
};

(globalThis as Record<string, unknown>).localStorage = fakeLocalStorage;

function computeAggregates(runs: RunSummary[]): AggregateStats {
    if (!runs.length) {
        return { totalRuns: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0 };
    }
    const wpms = runs.map(r => r.metrics?.effective?.effectiveWPM ?? 0);
    const accs = runs.map(r => r.metrics?.effective?.accuracy ?? 0);
    const avg = (nums: number[]) => Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    return {
        totalRuns: runs.length,
        avgWpm: avg(wpms),
        bestWpm: Math.max(0, ...wpms),
        avgAccuracy: avg(accs),
    };
}

describe('isLocalhost', () => {
    it('returns true for localhost hostnames', () => {
        (globalThis as Record<string, unknown>).window = { location: { hostname: 'localhost' } };
        expect(isLocalhost()).toBe(true);

        (globalThis as Record<string, unknown>).window = { location: { hostname: '127.0.0.1' } };
        expect(isLocalhost()).toBe(true);
    });

    it('returns false for github.io hostnames', () => {
        (globalThis as Record<string, unknown>).window = { location: { hostname: 'wtasg.github.io' } };
        expect(isLocalhost()).toBe(false);
    });
});

describe('addRunSummary localStorage quota cap', () => {
    beforeEach(() => {
        mockStorage.clear();
    });

    it('caps stored summaries to 100 items', () => {
        const sample: RunSummary = {
            id: 'test-1',
            startedAt: new Date().toISOString(),
            durationMs: 5000,
            status: 'COMPLETED',
            syncStatus: 'pending',
            sourceId: 'src-1',
            sourceName: 'test.txt',
            selection: { start: 0, end: 10 },
            fullFile: true,
            gameType: 'normal',
            metrics: {
                raw: { rawWPM: 50, totalKeystrokes: 100 },
                effective: { effectiveWPM: 48, accuracy: 96, correctChars: 96 },
            },
        };

        for (let i = 0; i < 120; i++) {
            addRunSummary({ ...sample, id: `test-${i}` });
        }

        const stored = loadRunSummaries();
        expect(stored.length).toBe(100);
        expect(stored[0].id).toBe('test-119');
    });
});

describe('RunSummary null safety and updates', () => {
    beforeEach(() => {
        mockStorage.clear();
    });

    it('handles runs with undefined or missing selection gracefully', () => {
        const incompleteRun = {
            id: 'legacy-1',
            startedAt: new Date().toISOString(),
            durationMs: 5000,
            status: 'COMPLETED' as const,
            syncStatus: 'pending' as const,
            sourceId: 'src-1',
            sourceName: 'legacy.txt',
            selection: undefined as unknown as { start: number; end: number },
            fullFile: false,
            gameType: 'normal' as const,
            metrics: {
                raw: { rawWPM: 40, totalKeystrokes: 80 },
                effective: { effectiveWPM: 38, accuracy: 95, correctChars: 76 },
            },
        };

        addRunSummary(incompleteRun);
        const stored = loadRunSummaries();
        expect(stored.length).toBe(1);
        expect(stored[0].selection).toBeUndefined();
    });

    it('updates sync status for stored summaries', () => {
        const summary: RunSummary = {
            id: 'sync-run-1',
            startedAt: new Date().toISOString(),
            durationMs: 3000,
            status: 'COMPLETED',
            syncStatus: 'pending',
            sourceId: 'src-1',
            sourceName: 'code.ts',
            selection: { start: 0, end: 50 },
            fullFile: true,
            gameType: 'normal',
            metrics: {
                raw: { rawWPM: 60, totalKeystrokes: 120 },
                effective: { effectiveWPM: 58, accuracy: 98, correctChars: 110 },
            },
        };

        addRunSummary(summary);
        updateSummarySync('sync-run-1', 'synced');
        const updated = loadRunSummaries();
        expect(updated[0].syncStatus).toBe('synced');
    });
});

describe('Sync Queue Operations', () => {
    beforeEach(() => {
        mockStorage.clear();
    });

    it('adds and removes runs from sync queue without duplicates', () => {
        addToSyncQueue('run-1');
        addToSyncQueue('run-1');
        addToSyncQueue('run-2');

        let queue = loadSyncQueue();
        expect(queue).toEqual(['run-1', 'run-2']);

        removeFromSyncQueue('run-1');
        queue = loadSyncQueue();
        expect(queue).toEqual(['run-2']);
    });
});

describe('AggregateStats Calculation', () => {
    it('returns zero defaults for empty run list', () => {
        const stats = computeAggregates([]);
        expect(stats).toEqual({ totalRuns: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0 });
    });

    it('calculates average WPM, best WPM, and average accuracy', () => {
        const runs: RunSummary[] = [
            {
                id: 'r1', startedAt: new Date().toISOString(), durationMs: 1000,
                status: 'COMPLETED', syncStatus: 'synced', sourceId: 's1', sourceName: 'f1',
                selection: { start: 0, end: 10 }, fullFile: true, gameType: 'normal',
                metrics: { raw: { rawWPM: 50, totalKeystrokes: 100 }, effective: { effectiveWPM: 40, accuracy: 90, correctChars: 80 } },
            },
            {
                id: 'r2', startedAt: new Date().toISOString(), durationMs: 1000,
                status: 'COMPLETED', syncStatus: 'synced', sourceId: 's1', sourceName: 'f1',
                selection: { start: 0, end: 10 }, fullFile: true, gameType: 'normal',
                metrics: { raw: { rawWPM: 70, totalKeystrokes: 140 }, effective: { effectiveWPM: 60, accuracy: 100, correctChars: 120 } },
            },
        ];

        const stats = computeAggregates(runs);
        expect(stats.totalRuns).toBe(2);
        expect(stats.avgWpm).toBe(50);
        expect(stats.bestWpm).toBe(60);
        expect(stats.avgAccuracy).toBe(95);
    });
});

describe('Date Cutoff Filtering', () => {
    it('filters runs by cutoff window correctly', () => {
        const now = Date.now();
        const cutoff = (days: number) => now - days * 86_400_000;

        const runs: RunSummary[] = [
            {
                id: 'recent', startedAt: new Date(now - 2 * 86_400_000).toISOString(), durationMs: 1000,
                status: 'COMPLETED', syncStatus: 'synced', sourceId: 's1', sourceName: 'f1',
                selection: { start: 0, end: 10 }, fullFile: true, gameType: 'normal',
                metrics: { raw: { rawWPM: 50, totalKeystrokes: 100 }, effective: { effectiveWPM: 50, accuracy: 100, correctChars: 100 } },
            },
            {
                id: 'old', startedAt: new Date(now - 15 * 86_400_000).toISOString(), durationMs: 1000,
                status: 'COMPLETED', syncStatus: 'synced', sourceId: 's1', sourceName: 'f1',
                selection: { start: 0, end: 10 }, fullFile: true, gameType: 'normal',
                metrics: { raw: { rawWPM: 40, totalKeystrokes: 80 }, effective: { effectiveWPM: 40, accuracy: 90, correctChars: 80 } },
            },
        ];

        const last7 = runs.filter(r => new Date(r.startedAt).getTime() > cutoff(7));
        const last30 = runs.filter(r => new Date(r.startedAt).getTime() > cutoff(30));

        expect(last7.length).toBe(1);
        expect(last7[0].id).toBe('recent');

        expect(last30.length).toBe(2);
    });
});
