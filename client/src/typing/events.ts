import { RunEvent } from './types';

const MODIFIER_ONLY = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
    'NumLock', 'ScrollLock', 'Fn', 'FnLock',
]);

const NAV_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'PageUp', 'PageDown',
]);

export function isMeaningfulKeystroke(key: string): boolean {
    if (MODIFIER_ONLY.has(key)) return false;
    // Skip function keys
    if (/^F\d+$/.test(key)) return false;
    return true;
}

/** Single printable character, excluding whitespace keys. */
export function isCharKey(key: string): boolean {
    return key.length === 1 && key !== ' ';
}

export function isWhitespaceKey(key: string): boolean {
    return key === ' ' || key === 'Tab' || key === 'Enter';
}

export function isBackspace(key: string): boolean {
    return key === 'Backspace';
}

export function isDelete(key: string): boolean {
    return key === 'Delete';
}

export function isNavKey(key: string): boolean {
    return NAV_KEYS.has(key);
}

export function makeEvent(key: string, code: string, startPerf: number): RunEvent {
    return { t: Math.round(performance.now() - startPerf), type: 'keydown', key, code };
}
