import { GameConfig, GameType } from '../typing/types';

export const TIME_PRESETS_SEC = [30, 60, 90, 120, 180, 300];

export const GAME_PRESETS: Record<GameType, Partial<GameConfig>> = {
    normal: {
        gameType: 'normal',
        timeLimitMs: 90_000,
        allowCorrection: true,
        blockOnError: false,
    },
    suddenDeath: {
        gameType: 'suddenDeath',
        timeLimitMs: 90_000,
        allowCorrection: false,
        blockOnError: false,
    },
    racing: {
        gameType: 'racing',
        timeLimitMs: 90_000,
        allowCorrection: true,
        blockOnError: false,
    },
    correctionMode: {
        gameType: 'correctionMode',
        timeLimitMs: 90_000,
        allowCorrection: true,
        blockOnError: false,
    },
    noCorrection: {
        gameType: 'noCorrection',
        timeLimitMs: 90_000,
        allowCorrection: false,
        blockOnError: false,
    },
};

export function applyPreset(base: GameConfig, preset: GameType): GameConfig {
    return { ...base, ...(GAME_PRESETS[preset] ?? {}) };
}
