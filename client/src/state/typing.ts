import { createStore } from 'solid-js/store';
import { CharState, RunStatus, CompletedRun, RunSummary } from '../typing/types';
import { settings } from './settings';
import { TypingEngine, EngineSnapshot } from '../typing/engine';
import { computeRawMetrics, computeEffectiveMetrics } from '../typing/metrics';
import { saveRun } from '../storage/indexedDb';
import { addRunSummary } from '../storage/localStorage';
import { persistAndSync } from '../storage/sync';
import { isServerOnline } from '../api/health';

export interface RunState {
    status: RunStatus;
    target: string;
    charStates: CharState[];
    cursor: number;
    elapsedMs: number;
    effectiveWPM: number;
    rawWPM: number;
    accuracy: number;
}

const [runState, setRunState] = createStore<RunState>({
    status: 'READY',
    target: '',
    charStates: [],
    cursor: 0,
    elapsedMs: 0,
    effectiveWPM: 0,
    rawWPM: 0,
    accuracy: 100,
});

export { runState };

let _engine: TypingEngine | null = null;
let _ticker: ReturnType<typeof setInterval> | null = null;
let _activeSourceId = '';
let _activeSourceName = '';
let _wasEverIncorrect: boolean[] = [];

export function startRun(
    target: string,
    sourceId: string,
    sourceName: string,
    startOffset = 0,
    endOffset = 0,
): void {
    _engine?.reset();
    _activeSourceId = sourceId;
    _activeSourceName = sourceName;
    _wasEverIncorrect = [];

    _engine = new TypingEngine({ ...settings }, {
        onChange: snap => applySnap(snap),
        onComplete: snap => finalizeRun(snap, 'COMPLETED'),
        onTimeLimit: snap => finalizeRun(snap, 'TIME_LIMIT'),
        onGameRule: snap => finalizeRun(snap, 'GAME_RULE'),
    });

    _engine.start(target);

    _ticker = setInterval(() => {
        if (_engine && runState.status === 'RUNNING') {
            setRunState('elapsedMs', _engine.getElapsedMs());
        }
    }, 250);
}

export function sendKey(key: string, code: string): void {
    _engine?.handleKeyEvent(key, code);
}

export function stopRun(): void {
    _engine?.stopManually();
}

export function resetRun(): void {
    clearTicker();
    _engine?.reset();
    _engine = null;
    setRunState({
        status: 'READY', target: '', charStates: [], cursor: 0,
        elapsedMs: 0, effectiveWPM: 0, rawWPM: 0, accuracy: 100,
    });
}

function applySnap(snap: EngineSnapshot): void {
    setRunState({
        status: snap.status,
        target: snap.target,
        charStates: snap.charStates,
        cursor: snap.cursor,
        elapsedMs: snap.elapsedMs,
    });
    if (snap.status !== 'RUNNING') clearTicker();
}

async function finalizeRun(snap: EngineSnapshot, status: RunStatus): Promise<void> {
    clearTicker();
    _wasEverIncorrect = _engine?.getWasEverIncorrect() ?? [];

    const rawMetrics = computeRawMetrics(snap.events, snap.elapsedMs, snap.incorrectKeystrokeCount);
    const effectiveMetrics = computeEffectiveMetrics(snap.charStates, _wasEverIncorrect, snap.elapsedMs);

    setRunState({
        status,
        charStates: snap.charStates,
        cursor: snap.cursor,
        elapsedMs: snap.elapsedMs,
        effectiveWPM: effectiveMetrics.effectiveWPM,
        rawWPM: rawMetrics.rawWPM,
        accuracy: effectiveMetrics.accuracy,
    });

    const run: CompletedRun = {
        id: crypto.randomUUID(),
        startedAt: snap.startedAt?.toISOString() ?? new Date().toISOString(),
        durationMs: snap.elapsedMs,
        configuration: { ...settings },
        source: { id: _activeSourceId, name: _activeSourceName, selection: { start: 0, end: 0 } },
        target: snap.target,
        events: snap.events,
        metrics: { raw: rawMetrics, effective: effectiveMetrics },
        status,
        syncStatus: 'pending',
    };

    await saveRun(run);

    const summary: RunSummary = {
        id: run.id, startedAt: run.startedAt, durationMs: run.durationMs,
        status, syncStatus: 'pending',
        sourceId: _activeSourceId, sourceName: _activeSourceName,
        gameType: settings.gameType,
        metrics: {
            raw: { rawWPM: rawMetrics.rawWPM, totalKeystrokes: rawMetrics.totalKeystrokes },
            effective: { effectiveWPM: effectiveMetrics.effectiveWPM, accuracy: effectiveMetrics.accuracy, correctChars: effectiveMetrics.correctChars },
        },
    };
    addRunSummary(summary);

    persistAndSync(run, isServerOnline()).catch(() => { });
}

function clearTicker(): void {
    if (_ticker !== null) { clearInterval(_ticker); _ticker = null; }
}
