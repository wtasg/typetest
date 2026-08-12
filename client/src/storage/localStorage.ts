import { GameConfig, Source, RunSummary, DEFAULT_CONFIG } from '../typing/types';

const K = {
    settings: 'tt:settings',
    sources: 'tt:sources',
    runSummaries: 'tt:runSummaries',
    syncQueue: 'tt:syncQueue',
} as const;

function get<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch { return fallback; }
}

function set(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export const loadSettings = (): GameConfig => get<GameConfig>(K.settings, { ...DEFAULT_CONFIG });
export const saveSettings = (c: GameConfig): void => set(K.settings, c);

export const loadSourcesMeta = (): Source[] => get<Source[]>(K.sources, []);
export const saveSourcesMeta = (s: Source[]): void => set(K.sources, s);

export const loadRunSummaries = (): RunSummary[] => get<RunSummary[]>(K.runSummaries, []);
export const saveRunSummaries = (s: RunSummary[]): void => set(K.runSummaries, s);

export function addRunSummary(summary: RunSummary): void {
    const cur = loadRunSummaries();
    cur.unshift(summary);
    saveRunSummaries(cur.slice(0, 100));
}

export function updateSummarySync(runId: string, status: 'synced' | 'failed'): void {
    const cur = loadRunSummaries();
    const i = cur.findIndex(s => s.id === runId);
    if (i !== -1) { cur[i].syncStatus = status; saveRunSummaries(cur); }
}

export const loadSyncQueue = (): string[] => get<string[]>(K.syncQueue, []);
export const saveSyncQueue = (ids: string[]): void => set(K.syncQueue, ids);

export function addToSyncQueue(id: string): void {
    const q = loadSyncQueue();
    if (!q.includes(id)) { q.push(id); saveSyncQueue(q); }
}

export function removeFromSyncQueue(id: string): void {
    saveSyncQueue(loadSyncQueue().filter(x => x !== id));
}
