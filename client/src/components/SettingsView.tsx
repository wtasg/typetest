import { Component, For } from 'solid-js';
import { settings, updateSettings } from '../state/settings';
import { GameType } from '../typing/types';
import { TIME_PRESETS_SEC } from '../games/configuration';

const GAME_TYPES: GameType[] = ['normal', 'suddenDeath', 'correctionMode', 'noCorrection'];

const SettingsView: Component = () => (
    <div class="settings-view">
        <h2>Settings</h2>

        <section>
            <h3>Typing</h3>
            <div class="setting-row">
                <label>Game type</label>
                <select
                    value={settings.gameType}
                    onChange={e => updateSettings({ gameType: e.currentTarget.value as GameType })}
                >
                    <For each={GAME_TYPES}>{t => <option value={t}>{t}</option>}</For>
                </select>
            </div>
            <div class="setting-row">
                <label>
                    <input
                        type="checkbox"
                        checked={settings.blockOnError}
                        onChange={e => updateSettings({ blockOnError: e.currentTarget.checked })}
                    />
                    Block on error
                </label>
            </div>
            <div class="setting-row">
                <label>
                    <input
                        type="checkbox"
                        checked={settings.allowCorrection}
                        onChange={e => updateSettings({ allowCorrection: e.currentTarget.checked })}
                    />
                    Allow correction
                </label>
            </div>
        </section>

        <section>
            <h3>Time Limit</h3>
            <div class="time-presets">
                <For each={TIME_PRESETS_SEC}>
                    {secs => (
                        <button
                            class={`${settings.timeLimitMs === secs * 1000 ? 'active' : ''}`}
                            onClick={() => updateSettings({ timeLimitMs: secs * 1000 })}
                        >
                            {secs}s
                        </button>
                    )}
                </For>
                <button
                    class={`${settings.timeLimitMs === 0 ? 'active' : ''}`}
                    onClick={() => updateSettings({ timeLimitMs: 0 })}
                >
                    No limit
                </button>
            </div>
        </section>

        <section>
            <h3>Display</h3>
            <div class="setting-row">
                <label>
                    <input type="checkbox" checked={settings.showSpaces}
                        onChange={e => updateSettings({ showSpaces: e.currentTarget.checked })} />
                    Show spaces
                </label>
                <input type="text" value={settings.spaceGlyph} style="width:3rem;text-align:center"
                    onInput={e => updateSettings({ spaceGlyph: e.currentTarget.value || '·' })} />
            </div>
            <div class="setting-row">
                <label>
                    <input type="checkbox" checked={settings.showTabs}
                        onChange={e => updateSettings({ showTabs: e.currentTarget.checked })} />
                    Show tabs
                </label>
                <input type="text" value={settings.tabGlyph} style="width:3rem;text-align:center"
                    onInput={e => updateSettings({ tabGlyph: e.currentTarget.value || '→' })} />
            </div>
            <div class="setting-row">
                <label>
                    <input type="checkbox" checked={settings.showNewlines}
                        onChange={e => updateSettings({ showNewlines: e.currentTarget.checked })} />
                    Show newlines
                </label>
                <input type="text" value={settings.newlineGlyph} style="width:3rem;text-align:center"
                    onInput={e => updateSettings({ newlineGlyph: e.currentTarget.value || '↵' })} />
            </div>
        </section>
    </div>
);

export default SettingsView;
