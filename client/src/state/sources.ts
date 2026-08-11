import { createStore } from 'solid-js/store';
import { Source } from '../typing/types';
import { loadSourcesMeta, saveSourcesMeta } from '../storage/localStorage';
import { saveSource, getSourceContent, deleteSourceContent } from '../storage/indexedDb';

interface SourcesState {
    sources: Source[];
    selectedId: string | null;
    selectionStart: number;
    selectionEnd: number;
}

const [sourcesState, setSourcesState] = createStore<SourcesState>({
    sources: loadSourcesMeta(),
    selectedId: null,
    selectionStart: 0,
    selectionEnd: -1,
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

export function selectSource(id: string, start = 0, end = -1): void {
    setSourcesState({ selectedId: id, selectionStart: start, selectionEnd: end });
}

export async function getSelectedContent(): Promise<string | null> {
    if (!sourcesState.selectedId) return null;
    const stored = await getSourceContent(sourcesState.selectedId);
    if (!stored) return null;
    const { selectionStart, selectionEnd } = sourcesState;
    return selectionEnd < 0 ? stored.content.slice(selectionStart)
        : stored.content.slice(selectionStart, selectionEnd);
}

export function removeSource(id: string): void {
    const meta = loadSourcesMeta().filter(s => s.id !== id);
    saveSourcesMeta(meta);
    setSourcesState('sources', meta);
    deleteSourceContent(id).catch(() => { });
    if (sourcesState.selectedId === id) {
        setSourcesState({ selectedId: null, selectionStart: 0, selectionEnd: -1 });
    }
}

async function sha256(text: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
