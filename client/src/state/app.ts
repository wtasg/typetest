import { createSignal } from 'solid-js';
import { startHealthCheck, onServerStatusChange } from '../api/health';

export type View = 'typing' | 'reports' | 'settings';

export const [currentView, setCurrentView] = createSignal<View>('typing');
export const [serverOnline, setServerOnline] = createSignal(false);

export function initApp(): void {
    onServerStatusChange(setServerOnline);
    startHealthCheck(15_000);
}
