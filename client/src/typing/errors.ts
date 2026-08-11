import { GameConfig } from './types';

export function qualifiesAsSuddenDeathError(config: GameConfig, isError: boolean): boolean {
    return config.gameType === 'suddenDeath' && isError;
}

export function correctionAllowed(config: GameConfig): boolean {
    return config.allowCorrection && config.gameType !== 'noCorrection';
}
