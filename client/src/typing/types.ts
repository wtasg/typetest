// ─── Run & game ──────────────────────────────────────────────────────────────

export type RunStatus =
    | 'READY'
    | 'RUNNING'
    | 'COMPLETED'
    | 'MANUAL_STOP'
    | 'TIME_LIMIT'
    | 'GAME_RULE';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export type GameType =
    | 'normal'
    | 'suddenDeath'
    | 'racing'
    | 'correctionMode'
    | 'noCorrection';

export type CharState = 'untyped' | 'current' | 'correct' | 'incorrect';

export interface RunEvent {
    /** Milliseconds since run start (monotonic). */
    t: number;
    type: 'keydown';
    key: string;
    code: string;
}

export interface GameConfig {
    gameType: GameType;
    /** 0 = no limit */
    timeLimitMs: number;
    allowCorrection: boolean;
    blockOnError: boolean;
    showSpaces: boolean;
    showTabs: boolean;
    showNewlines: boolean;
    spaceGlyph: string;
    tabGlyph: string;
    newlineGlyph: string;
    tabWidth: 2 | 4 | 8;
    tabMode: 'expand' | 'literal';
}

export const DEFAULT_CONFIG: GameConfig = {
    gameType: 'normal',
    timeLimitMs: 90_000,
    allowCorrection: true,
    blockOnError: false,
    showSpaces: true,
    showTabs: true,
    showNewlines: true,
    spaceGlyph: '·',
    tabGlyph: '→',
    newlineGlyph: '↵',
    tabWidth: 4,
    tabMode: 'expand',
};

// ─── Sources ─────────────────────────────────────────────────────────────────

/** Contiguous character range within a source's raw content. */
export interface TextSelection {
    /** Inclusive 0-based character index. */
    startOffset: number;
    /** Exclusive 0-based character index. */
    endOffset: number;
}

export interface Source {
    id: string;
    name: string;
    filename: string;
    extension: string;
    size: number;
    contentHash: string;
    createdAt: string;
}

// ─── Run object ──────────────────────────────────────────────────────────────

export interface RunSource {
    id: string;
    name: string;
    selection: { start: number; end: number };
}

export interface RawMetrics {
    totalKeystrokes: number;
    charKeystrokes: number;
    whitespaceKeystrokes: number;
    backspaceCount: number;
    deleteCount: number;
    navKeyCount: number;
    incorrectKeystrokes: number;
    rawWPM: number;
    elapsedMs: number;
}

export interface EffectiveMetrics {
    targetLength: number;
    correctChars: number;
    effectiveChars: number;
    incorrectChars: number;
    correctedErrors: number;
    uncorrectedErrors: number;
    accuracy: number;
    effectiveWPM: number;
    elapsedMs: number;
}

export interface CompletedRun {
    id: string;
    startedAt: string;
    durationMs: number;
    configuration: GameConfig;
    source: RunSource;
    /** Normalized target snapshot — independent of source changes. */
    target: string;
    events: RunEvent[];
    metrics: { raw: RawMetrics; effective: EffectiveMetrics };
    status: RunStatus;
    syncStatus: SyncStatus;
}

export interface RunSummary {
    id: string;
    startedAt: string;
    durationMs: number;
    status: RunStatus;
    syncStatus: SyncStatus;
    sourceId: string;
    sourceName: string;
    /** Raw offsets into the source content; {start:0,end:len} for full-file runs. */
    selection: { start: number; end: number };
    /** True when the run practiced the entire source content. */
    fullFile: boolean;
    gameType: GameType;
    metrics: {
        raw: Pick<RawMetrics, 'rawWPM' | 'totalKeystrokes'>;
        effective: Pick<EffectiveMetrics, 'effectiveWPM' | 'accuracy' | 'correctChars'>;
    };
}
