import { createSignal } from 'solid-js';
import { startHealthCheck, onServerStatusChange } from '../api/health';
import { runState, resetRun } from './typing';

export type View = 'typing' | 'reports' | 'settings';

export const [currentView, setCurrentView] = createSignal<View>('typing');
export const [serverOnline, setServerOnline] = createSignal(false);

export function navigateToTyping(): void {
    if (runState.status !== 'RUNNING' && runState.status !== 'READY') {
        resetRun();
    }
    setCurrentView('typing');
}

export function initApp(): void {
    onServerStatusChange(setServerOnline);
    startHealthCheck(15_000);
}

