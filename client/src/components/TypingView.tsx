import { Component, Match, Show, Switch } from 'solid-js';
import { runState, startRun } from '../state/typing';
import { sourcesState, getSelectedContent } from '../state/sources';
import TypingArea from './TypingArea';
import RunResults from './RunResults';
import SourceList from './SourceList';

const DONE_STATUSES = new Set(['COMPLETED', 'MANUAL_STOP', 'TIME_LIMIT', 'GAME_RULE']);

const TypingView: Component = () => {
    async function handleStart(): Promise<void> {
        const content = await getSelectedContent();
        if (!content) return;
        const src = sourcesState.sources.find(s => s.id === sourcesState.selectedId);
        startRun(content, src?.id ?? '', src?.name ?? 'Unknown');
    }

    return (
        <Switch>
            <Match when={runState.status === 'RUNNING'}>
                <TypingArea />
            </Match>
            <Match when={DONE_STATUSES.has(runState.status)}>
                <RunResults />
            </Match>
            <Match when={runState.status === 'READY'}>
                <div class="source-setup">
                    <h2>Select a source to start</h2>
                    <SourceList />
                    <Show when={sourcesState.selectedId !== null}>
                        <button class="btn-start" onClick={handleStart}>Start Typing</button>
                    </Show>
                </div>
            </Match>
        </Switch>
    );
};

export default TypingView;
