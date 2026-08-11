import { Component, For, Show } from 'solid-js';
import { sourcesState, selectSource, removeSource } from '../state/sources';

const SourceList: Component = () => (
    <div class="source-list">
        <Show when={sourcesState.sources.length === 0}>
            <p class="empty-state">No sources yet. Upload a file or add text.</p>
        </Show>
        <For each={sourcesState.sources}>
            {src => (
                <div
                    class={`source-item ${sourcesState.selectedId === src.id ? 'selected' : ''}`}
                    onClick={() => selectSource(src.id)}
                >
                    <span class="source-name">{src.name}</span>
                    {src.extension && <span class="source-ext">.{src.extension}</span>}
                    <button
                        class="source-delete"
                        title="Remove source"
                        onClick={e => { e.stopPropagation(); removeSource(src.id); }}
                    >
                        ×
                    </button>
                </div>
            )}
        </For>
    </div>
);

export default SourceList;
