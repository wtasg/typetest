import { Component } from 'solid-js';
import { runState, stopRun } from '../state/typing';

const RunControls: Component = () => {
    const secs = () => (runState.elapsedMs / 1000).toFixed(1);
    return (
        <div class="run-controls">
            <div class="stat">
                <span class="stat-label">Effective WPM</span>
                <span class="stat-value">{runState.effectiveWPM}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Accuracy</span>
                <span class="stat-value">{runState.accuracy.toFixed(1)}%</span>
            </div>
            <div class="stat">
                <span class="stat-label">Time</span>
                <span class="stat-value">{secs()}s</span>
            </div>
            <button class="btn-stop" onClick={stopRun}>Stop</button>
        </div>
    );
};

export default RunControls;
