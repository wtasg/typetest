import { Component, For, Show, createSignal } from 'solid-js';
import { Source } from '../typing/types';
import { sourcesState, selectSource, removeSource } from '../state/sources';
import TextEditor from './TextEditor';

const SourceList: Component = () => {
    const [editingSource, setEditingSource] = createSignal<Source | null>(null);

    return (
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
                            class="source-edit"
                            title="Edit source"
                            onClick={e => { e.stopPropagation(); setEditingSource(src); }}
                        >
                            ✎
                        </button>
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
            <Show when={editingSource() !== null}>
                <TextEditor
                    editSource={editingSource()!}
                    onClose={() => setEditingSource(null)}
                />
            </Show>
        </div>
    );
};

export default SourceList;
