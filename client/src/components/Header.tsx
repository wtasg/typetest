import { Component } from 'solid-js';
import { serverOnline } from '../state/app';
import { settings, updateSettings } from '../state/settings';

const TAB_OPTIONS = [
    { value: '2', label: 'Tab: 2' },
    { value: '4', label: 'Tab: 4' },
    { value: '8', label: 'Tab: 8' },
    { value: 'literal', label: 'Tab: literal' },
];

const Header: Component = () => (
    <header class="header">
        <span class="app-title">Typing Test</span>
        <div class="header-right">
            <select
                class="tab-select"
                value={settings.tabMode === 'literal' ? 'literal' : String(settings.tabWidth)}
                onChange={e => {
                    const v = e.currentTarget.value;
                    if (v === 'literal') updateSettings({ tabMode: 'literal' });
                    else updateSettings({ tabWidth: Number(v) as 2 | 4 | 8, tabMode: 'expand' });
                }}
            >
                {TAB_OPTIONS.map(o => <option value={o.value}>{o.label}</option>)}
            </select>
            <span class={serverOnline() ? 'status-online' : 'status-offline'}>
                {serverOnline() ? '● Online' : '● Offline'}
            </span>
        </div>
    </header>
);

export default Header;
