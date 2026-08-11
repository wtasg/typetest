import { createStore } from 'solid-js/store';
import { RunSummary } from '../typing/types';
import { loadRunSummaries } from '../storage/localStorage';

interface ReportsState {
    summaries: RunSummary[];
}

const [reportsState, setReportsState] = createStore<ReportsState>({
    summaries: loadRunSummaries(),
});

export { reportsState };

export function refreshReports(): void {
    setReportsState('summaries', loadRunSummaries());
}
