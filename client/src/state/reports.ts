import { createStore } from 'solid-js/store';
import { RunSummary } from '../typing/types';
import { loadRunSummaries, saveRunSummaries } from '../storage/localStorage';
import { getAllRuns } from '../storage/indexedDb';

interface ReportsState {
    summaries: RunSummary[];
}

const [reportsState, setReportsState] = createStore<ReportsState>({
    summaries: loadRunSummaries(),
});

export { reportsState };

export async function refreshReports(): Promise<void> {
    let summaries = loadRunSummaries();
    if (!summaries.length) {
        const idbRuns = await getAllRuns();
        if (idbRuns.length) {
            summaries = idbRuns.map(r => {
                const sel = r.source?.selection ?? { start: 0, end: 0 };
                return {
                    id: r.id,
                    startedAt: r.startedAt,
                    durationMs: r.durationMs,
                    status: r.status,
                    syncStatus: r.syncStatus,
                    sourceId: r.source?.id ?? '',
                    sourceName: r.source?.name ?? 'Unknown source',
                    selection: sel,
                    fullFile: sel.start === 0 && sel.end === 0,
                    gameType: r.configuration?.gameType ?? 'normal',
                    metrics: {
                        raw: { rawWPM: r.metrics?.raw?.rawWPM ?? 0, totalKeystrokes: r.metrics?.raw?.totalKeystrokes ?? 0 },
                        effective: { effectiveWPM: r.metrics?.effective?.effectiveWPM ?? 0, accuracy: r.metrics?.effective?.accuracy ?? 100, correctChars: r.metrics?.effective?.correctChars ?? 0 },
                    },
                };
            }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
            saveRunSummaries(summaries);
        }
    }
    setReportsState('summaries', summaries);
}
