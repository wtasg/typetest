import { Component, Show, createSignal } from 'solid-js';
import { addSource } from '../state/sources';

const TextEditor: Component = () => {
    const [open, setOpen] = createSignal(false);
    const [name, setName] = createSignal('Untitled');
    const [text, setText] = createSignal('');

    async function handleSave(): Promise<void> {
        const content = text().trim();
        if (!content) return;
        await addSource(name() || 'Untitled', name() || 'Untitled', content);
        setOpen(false);
        setName('Untitled');
        setText('');
    }

    return (
        <>
            <button onClick={() => setOpen(true)}>+ Add Text</button>
            <Show when={open()}>
                <div class="modal-overlay" onClick={() => setOpen(false)}>
                    <div class="modal" onClick={e => e.stopPropagation()}>
                        <h2>Add Text</h2>
                        <input
                            type="text"
                            value={name()}
                            onInput={e => setName(e.currentTarget.value)}
                            placeholder="Name"
                        />
                        <textarea
                            value={text()}
                            onInput={e => setText(e.currentTarget.value)}
                            placeholder="Paste or type content here…"
                            rows={14}
                        />
                        <div class="modal-actions">
                            <button onClick={() => setOpen(false)}>Cancel</button>
                            <button onClick={handleSave} disabled={!text().trim()}>Save</button>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    );
};

export default TextEditor;
