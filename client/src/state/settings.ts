import { createStore } from 'solid-js/store';
import { GameConfig, DEFAULT_CONFIG } from '../typing/types';
import { loadSettings, saveSettings } from '../storage/localStorage';

const [settings, setSettingsStore] = createStore<GameConfig>(loadSettings());

export { settings };

export function updateSettings(patch: Partial<GameConfig>): void {
    setSettingsStore(patch as GameConfig);
    // spread to get plain object for serialization
    saveSettings({ ...settings, ...patch });
}
