import { Component, Show, createSignal } from 'solid-js';
import { Source } from '../typing/types';
import { addSource, updateSource } from '../state/sources';
import { getSourceContent } from '../storage/indexedDb';

interface Props {
    /** When set the modal opens immediately in edit mode for this source. */
    editSource?: Source;
    onClose?: () => void;
}

const TextEditor: Component<Props> = props => {
    const editing = () => !!props.editSource;

    // For standalone "+ Add Text" button usage
    const [addOpen, setAddOpen] = createSignal(false);
    const open = () => editing() || addOpen();

    const [name, setName] = createSignal('');
    const [text, setText] = createSignal('');

    // Pre-populate when opened for editing
    let loadedId = '';
    function ensureLoaded() {
        const src = props.editSource;
        if (src && src.id !== loadedId) {
            loadedId = src.id;
            setName(src.name);
            getSourceContent(src.id).then(s => setText(s?.content ?? ''));
        }
    }

    function handleOpen() {
        setName('Untitled');
        setText('');
        loadedId = '';
        setAddOpen(true);
    }

    function handleClose() {
        setAddOpen(false);
        props.onClose?.();
    }

    async function handleSave(): Promise<void> {
        const content = text().trim();
        if (!content) return;
        const label = name().trim() || 'Untitled';
        if (editing() && props.editSource) {
            await updateSource(props.editSource.id, label, content);
        } else {
            await addSource(label, label, content);
        }
        handleClose();
    }

    return (
        <>
            <Show when={!editing()}>
                <button onClick={handleOpen}>+ Add Text</button>
            </Show>
            <Show when={open()}>
                {editing() && ensureLoaded()}
                <div class="modal-overlay" onClick={handleClose}>
                    <div class="modal" onClick={e => e.stopPropagation()}>
                        <h2>{editing() ? 'Edit Text' : 'Add Text'}</h2>
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
                            <button onClick={handleClose}>Cancel</button>
                            <button onClick={handleSave} disabled={!text().trim()}>Save</button>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    );
};

export default TextEditor;
