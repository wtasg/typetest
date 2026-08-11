import { CompletedRun, Source } from '../typing/types';

const API_BASE = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env
    .VITE_API_BASE ?? 'http://localhost:30001';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!res.ok) throw new Error(`API ${res.status} ${path}`);
    return res.json() as Promise<T>;
}

export const getRuns = (): Promise<CompletedRun[]> => api('/api/runs');
export const getRun = (id: string): Promise<CompletedRun> => api(`/api/runs/${id}`);
export const postRun = (run: CompletedRun): Promise<void> =>
    api('/api/runs', { method: 'POST', body: JSON.stringify(run) });

export const getSources = (): Promise<Source[]> => api('/api/sources');
export const postSource = (src: Source & { content: string }): Promise<void> =>
    api('/api/sources', { method: 'POST', body: JSON.stringify(src) });
export const deleteSource = (id: string): Promise<void> =>
    api(`/api/sources/${id}`, { method: 'DELETE' });
