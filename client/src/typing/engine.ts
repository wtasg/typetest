import { GameConfig, RunEvent, RunStatus, CharState } from './types';
import { normalizeText } from './normalization';
import {
    makeEvent, isMeaningfulKeystroke,
    isBackspace, isDelete, isNavKey,
} from './events';

export interface EngineSnapshot {
    target: string;
    charStates: CharState[];
    cursor: number;
    events: RunEvent[];
    status: RunStatus;
    elapsedMs: number;
    startedAt: Date | null;
    incorrectKeystrokeCount: number;
}

export interface EngineCallbacks {
    onChange?: (snap: EngineSnapshot) => void;
    onComplete?: (snap: EngineSnapshot) => void;
    onTimeLimit?: (snap: EngineSnapshot) => void;
    onGameRule?: (snap: EngineSnapshot, reason: string) => void;
}

export class TypingEngine {
    private target = '';
    private cursor = 0;
    private charStates: CharState[] = [];
    private wasEverIncorrect: boolean[] = [];
    private events: RunEvent[] = [];
    private startedAt: Date | null = null;
    private startPerf = 0;
    private status: RunStatus = 'READY';
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private incorrectKeystrokeCount = 0;

    constructor(
        private config: GameConfig,
        private callbacks: EngineCallbacks = {},
    ) { }

    start(rawTarget: string): void {
        this.target = normalizeText(rawTarget);
        this.cursor = 0;
        this.charStates = new Array(this.target.length).fill('untyped');
        this.wasEverIncorrect = new Array(this.target.length).fill(false);
        this.events = [];
        this.incorrectKeystrokeCount = 0;
        this.startedAt = new Date();
        this.startPerf = performance.now();
        this.status = 'RUNNING';

        if (this.config.timeLimitMs > 0) {
            this.timerId = setTimeout(
                () => this.finish('TIME_LIMIT'),
                this.config.timeLimitMs,
            );
        }

        this.emit();
    }

    handleKeyEvent(key: string, code: string): void {
        if (this.status !== 'RUNNING') return;
        if (!isMeaningfulKeystroke(key)) return;

        this.events.push(makeEvent(key, code, this.startPerf));

        if (isBackspace(key)) {
            this.doBackspace();
        } else if (isDelete(key)) {
            this.doDelete();
        } else if (key === 'ArrowLeft') {
            if (this.cursor > 0) this.cursor--;
        } else if (key === 'ArrowRight') {
            if (this.cursor < this.target.length) this.cursor++;
        } else if (isNavKey(key)) {
            // record but no cursor movement for up/down/home/end
        } else {
            this.doChar(key);
            return; // doChar calls emit or finish
        }

        this.emit();
    }

    private doBackspace(): void {
        if (!this.config.allowCorrection || this.cursor === 0) return;
        this.cursor--;
        this.charStates[this.cursor] = 'untyped';
    }

    private doDelete(): void {
        if (!this.config.allowCorrection || this.cursor >= this.target.length) return;
        this.charStates[this.cursor] = 'untyped';
    }

    private doChar(key: string): void {
        if (this.cursor >= this.target.length) {
            this.emit();
            return;
        }

        const expected = this.resolveTargetChar(this.target[this.cursor]);
        const typed = this.resolveKey(key);
        const correct = typed === expected;

        if (correct) {
            this.charStates[this.cursor] = 'correct';
            this.cursor++;
        } else {
            this.incorrectKeystrokeCount++;
            this.wasEverIncorrect[this.cursor] = true;
            this.charStates[this.cursor] = 'incorrect';

            if (this.config.gameType === 'suddenDeath') {
                this.finish('GAME_RULE', 'sudden death – typing error');
                return;
            }

            if (!this.config.blockOnError) {
                this.cursor++;
            }
        }

        if (this.cursor >= this.target.length) {
            const allCorrect = this.charStates.every(s => s === 'correct');
            if (allCorrect) {
                this.finish('COMPLETED');
                return;
            }
        }

        this.emit();
    }

    private resolveKey(key: string): string {
        if (key === 'Enter') return '\n';
        if (key === 'Tab') return '\t';
        return key;
    }

    private resolveTargetChar(ch: string): string {
        return ch; // target chars are already normalized
    }

    stopManually(): void {
        if (this.status !== 'RUNNING') return;
        this.finish('MANUAL_STOP');
    }

    getElapsedMs(): number {
        if (!this.startedAt) return 0;
        return Math.round(performance.now() - this.startPerf);
    }

    getWasEverIncorrect(): boolean[] {
        return [...this.wasEverIncorrect];
    }

    snapshot(): EngineSnapshot {
        return {
            target: this.target,
            charStates: [...this.charStates],
            cursor: this.cursor,
            events: [...this.events],
            status: this.status,
            elapsedMs: this.getElapsedMs(),
            startedAt: this.startedAt,
            incorrectKeystrokeCount: this.incorrectKeystrokeCount,
        };
    }

    reset(): void {
        if (this.timerId !== null) { clearTimeout(this.timerId); this.timerId = null; }
        this.target = '';
        this.cursor = 0;
        this.charStates = [];
        this.wasEverIncorrect = [];
        this.events = [];
        this.startedAt = null;
        this.startPerf = 0;
        this.status = 'READY';
        this.incorrectKeystrokeCount = 0;
    }

    private finish(status: RunStatus, reason = ''): void {
        this.status = status;
        if (this.timerId !== null) { clearTimeout(this.timerId); this.timerId = null; }
        const snap = this.snapshot();
        if (status === 'COMPLETED') this.callbacks.onComplete?.(snap);
        else if (status === 'TIME_LIMIT') this.callbacks.onTimeLimit?.(snap);
        else if (status === 'GAME_RULE') this.callbacks.onGameRule?.(snap, reason);
        else this.callbacks.onChange?.(snap);
    }

    private emit(): void {
        this.callbacks.onChange?.(this.snapshot());
    }
}
