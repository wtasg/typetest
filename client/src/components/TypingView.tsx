import { Component, Match, Show, Switch } from 'solid-js';
import { runState } from '../state/typing';
import { sourcesState } from '../state/sources';
import TypingArea from './TypingArea';
import RunResults from './RunResults';
import SourceList from './SourceList';
import SourceViewer from './SourceViewer';

const DONE_STATUSES = new Set(['COMPLETED', 'MANUAL_STOP', 'TIME_LIMIT', 'GAME_RULE']);

const TypingView: Component = () => {
    const selectedSource = () =>
        sourcesState.sources.find(s => s.id === sourcesState.selectedId);

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
                    <SourceList />
                    <Show when={selectedSource()}>
                        {src => <SourceViewer source={src()} />}
                    </Show>
                </div>
            </Match>
        </Switch>
    );
};

export default TypingView;
