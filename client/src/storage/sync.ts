import { CompletedRun } from '../typing/types';
import { postRun } from '../api/client';
import { getRun } from './indexedDb';
import {
    loadSyncQueue, addToSyncQueue, removeFromSyncQueue,
    updateSummarySync,
} from './localStorage';

export async function persistAndSync(run: CompletedRun, serverOnline: boolean): Promise<void> {
    addToSyncQueue(run.id);
    if (serverOnline) {
        try {
            await postRun(run);
            removeFromSyncQueue(run.id);
            updateSummarySync(run.id, 'synced');
        } catch {
            updateSummarySync(run.id, 'failed');
        }
    }
}

export async function retrySyncQueue(serverOnline: boolean): Promise<void> {
    if (!serverOnline) return;
    const queue = loadSyncQueue();
    for (const id of queue) {
        const run = await getRun(id);
        if (!run) { removeFromSyncQueue(id); continue; }
        try {
            await postRun(run);
            removeFromSyncQueue(id);
            updateSummarySync(id, 'synced');
        } catch {
            updateSummarySync(id, 'failed');
        }
    }
}
