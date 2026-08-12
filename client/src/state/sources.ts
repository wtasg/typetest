import { createStore } from 'solid-js/store';
import { Source, TextSelection } from '../typing/types';
import { loadSourcesMeta, saveSourcesMeta } from '../storage/localStorage';
import { saveSource, getSourceContent, deleteSourceContent } from '../storage/indexedDb';

interface SourcesState {
    sources: Source[];
    selectedId: string | null;
    selection: TextSelection | null;
}

const [sourcesState, setSourcesState] = createStore<SourcesState>({
    sources: loadSourcesMeta(),
    selectedId: null,
    selection: null,
});

export { sourcesState };

export async function addSource(name: string, filename: string, content: string): Promise<Source> {
    const ext = filename.includes('.') ? filename.split('.').pop() ?? '' : '';
    const id = crypto.randomUUID();
    const contentHash = await sha256(content);
    const source: Source = {
        id, name, filename, extension: ext,
        size: content.length, contentHash,
        createdAt: new Date().toISOString(),
    };
    await saveSource({ ...source, content });
    const meta = [source, ...loadSourcesMeta()];
    saveSourcesMeta(meta);
    setSourcesState('sources', meta);
    return source;
}

export function selectSource(id: string): void {
    setSourcesState({ selectedId: id, selection: null });
}

export function setSourceSelection(selection: TextSelection | null): void {
    setSourcesState('selection', selection);
}

export function resetSourceSelection(): void {
    setSourcesState('selection', null);
}

export async function getSelectedContent(): Promise<string | null> {
    if (!sourcesState.selectedId) return null;
    const stored = await getSourceContent(sourcesState.selectedId);
    if (!stored) return null;
    const sel = sourcesState.selection;
    return sel === null
        ? stored.content
        : stored.content.slice(sel.startOffset, sel.endOffset);
}

export async function updateSource(id: string, name: string, content: string): Promise<void> {
    const meta = loadSourcesMeta();
    const idx = meta.findIndex(s => s.id === id);
    if (idx === -1) return;
    const contentHash = await sha256(content);
    const updated: Source = { ...meta[idx], name, size: content.length, contentHash };
    await saveSource({ ...updated, content });
    meta[idx] = updated;
    saveSourcesMeta(meta);
    setSourcesState('sources', [...meta]);
    if (sourcesState.selectedId === id) {
        setSourcesState('selection', null);
    }
}

export function removeSource(id: string): void {
    const meta = loadSourcesMeta().filter(s => s.id !== id);
    saveSourcesMeta(meta);
    setSourcesState('sources', meta);
    deleteSourceContent(id).catch(() => { });
    if (sourcesState.selectedId === id) {
        setSourcesState({ selectedId: null, selection: null });
    }
}

async function sha256(text: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
