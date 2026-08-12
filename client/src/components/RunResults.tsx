import { Component } from 'solid-js';
import { runState, resetRun } from '../state/typing';

const RunResults: Component = () => {
    const statusLabel: Record<string, string> = {
        COMPLETED: 'Completed',
        MANUAL_STOP: 'Stopped',
        TIME_LIMIT: 'Time Limit',
        GAME_RULE: 'Game Over',
    };

    return (
        <div class="run-results">
            <h2>Run Results — {statusLabel[runState.status] ?? runState.status}</h2>
            <div class="metrics-grid">
                <div class="metric">
                    <span class="metric-label">Effective WPM</span>
                    <span class="metric-value">{runState.effectiveWPM}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Raw WPM</span>
                    <span class="metric-value">{runState.rawWPM}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Accuracy</span>
                    <span class="metric-value">{runState.accuracy.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Duration</span>
                    <span class="metric-value">{(runState.elapsedMs / 1000).toFixed(1)}s</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Correct chars</span>
                    <span class="metric-value">
                        {runState.charStates.filter(s => s === 'correct').length}
                        <span style="font-size:0.9rem;color:var(--fg-dim)"> / {runState.target.length}</span>
                    </span>
                </div>
            </div>
            <p class="run-selection-label">
                {runState.fullFile
                    ? 'Full file'
                    : runState.selection
                        ? `Selection (${runState.selection.start}–${runState.selection.end})`
                        : ''}
            </p>
            <button class="btn-restart" onClick={resetRun}>New Run</button>
        </div>
    );
};

export default RunResults;
