const API_BASE = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env
    .VITE_API_BASE ?? 'http://localhost:30001';

export function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

let _online = false;
const _listeners = new Set<(online: boolean) => void>();
let _timer: ReturnType<typeof setInterval> | null = null;

export const isServerOnline = (): boolean => _online;

export function onServerStatusChange(cb: (online: boolean) => void): () => void {
    _listeners.add(cb);
    return () => _listeners.delete(cb);
}

export function startHealthCheck(intervalMs = 15_000): void {
    if (!isLocalhost()) {
        notify(false);
        return;
    }
    checkHealth();
    _timer = setInterval(checkHealth, intervalMs);
}

export function stopHealthCheck(): void {
    if (_timer !== null) { clearInterval(_timer); _timer = null; }
}

async function checkHealth(): Promise<void> {
    if (!isLocalhost()) {
        notify(false);
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/health`, {
            signal: AbortSignal.timeout(4_000),
        });
        notify(res.ok);
    } catch {
        notify(false);
    }
}

function notify(online: boolean): void {
    if (_online === online) return;
    _online = online;
    for (const cb of _listeners) cb(online);
}
