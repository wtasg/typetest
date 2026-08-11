import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { reportsState, refreshReports } from '../state/reports';
import { RunSummary } from '../typing/types';
import { interKeyIntervals } from '../typing/distributions';
import { getAllRuns } from '../storage/indexedDb';
import { WpmChart, AccuracyChart, KeyDistChart, IkiHistogram } from './reports/Charts';
import { createStore } from 'solid-js/store';

type Tab = 'previous' | 'previous2' | '7days' | '30days' | 'alltime';

function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function cutoff(days: number): number {
    return Date.now() - days * 86_400_000;
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleString();
}

const ReportsView: Component = () => {
    const [tab, setTab] = createSignal<Tab>('previous');
    const [ikis, setIkis] = createStore<{ data: number[]; target: string }>({ data: [], target: '' });

    onMount(async () => {
        refreshReports();
        // load IKI + target from the most recent full run in IDB
        const runs = await getAllRuns();
        if (runs.length) {
            const latest = runs.sort((a, b) =>
                new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
            )[0];
            setIkis({ data: interKeyIntervals(latest.events), target: latest.target });
        }
    });

    const all = () => reportsState.summaries;
    const last7 = () => all().filter(s => new Date(s.startedAt).getTime() > cutoff(7));
    const last30 = () => all().filter(s => new Date(s.startedAt).getTime() > cutoff(30));

    function AggStats(props: { runs: RunSummary[] }) {
        const wpms = () => props.runs.map(r => r.metrics.effective.effectiveWPM);
        const accs = () => props.runs.map(r => r.metrics.effective.accuracy);
        return (
            <div class="aggregate-stats">
                <div class="aggregate-stat"><div class="label">Runs</div><div class="value">{props.runs.length}</div></div>
                <div class="aggregate-stat"><div class="label">Avg WPM</div><div class="value">{avg(wpms())}</div></div>
                <div class="aggregate-stat"><div class="label">Best WPM</div><div class="value">{Math.max(0, ...wpms())}</div></div>
                <div class="aggregate-stat"><div class="label">Avg Accuracy</div><div class="value">{avg(accs())}%</div></div>
            </div>
        );
    }

    function RunList(props: { runs: RunSummary[] }) {
        return (
            <div class="run-history">
                <For each={props.runs}>
                    {r => (
                        <div class="run-row">
                            <span class="run-date">{fmtDate(r.startedAt)}</span>
                            <span class="run-wpm">{r.metrics.effective.effectiveWPM} WPM</span>
                            <span class="run-acc">{r.metrics.effective.accuracy.toFixed(1)}% acc</span>
                            <span style="color:var(--fg-dim);font-size:0.8rem">{r.sourceName}</span>
                            <span style="color:var(--fg-dim);font-size:0.8rem">{r.gameType}</span>
                        </div>
                    )}
                </For>
            </div>
        );
    }

    function AggCharts(props: { runs: RunSummary[] }) {
        return (
            <Show when={props.runs.length > 1} fallback={<p class="empty-state">Need at least 2 runs for trend charts.</p>}>
                <div class="chart-section">
                    <h3>WPM Over Time</h3>
                    <WpmChart runs={props.runs} />
                </div>
                <div class="chart-section">
                    <h3>Accuracy Over Time</h3>
                    <AccuracyChart runs={props.runs} />
                </div>
            </Show>
        );
    }

    function SingleRunCharts() {
        return (
            <>
                <Show when={ikis.target.length > 0}>
                    <div class="chart-section">
                        <h3>Key Distribution (last run)</h3>
                        <KeyDistChart target={ikis.target} />
                    </div>
                </Show>
                <Show when={ikis.data.length > 0}>
                    <div class="chart-section">
                        <h3>Inter-key Interval (last run)</h3>
                        <IkiHistogram intervals={ikis.data} />
                    </div>
                </Show>
            </>
        );
    }

    return (
        <div class="reports-view">
            <h2>Reports</h2>
            <div class="report-tabs">
                {([
                    ['previous', 'Previous Run'],
                    ['previous2', 'Prev Prev Run'],
                    ['7days', 'Last 7 Days'],
                    ['30days', 'Last 30 Days'],
                    ['alltime', 'All Time'],
                ] as [Tab, string][]).map(([t, label]) => (
                    <button class={`report-tab ${tab() === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
                ))}
            </div>

            {tab() === 'previous' && (() => {
                const run = all()[0];
                return run
                    ? <><RunList runs={[run]} /><SingleRunCharts /></>
                    : <p class="empty-state">No runs yet.</p>;
            })()}

            {tab() === 'previous2' && (() => {
                const run = all()[1];
                return run
                    ? <><RunList runs={[run]} /><SingleRunCharts /></>
                    : <p class="empty-state">No second run yet.</p>;
            })()}

            {tab() === '7days' && (
                <><AggStats runs={last7()} /><AggCharts runs={last7()} /><RunList runs={last7()} /></>
            )}

            {tab() === '30days' && (
                <><AggStats runs={last30()} /><AggCharts runs={last30()} /><RunList runs={last30()} /></>
            )}

            {tab() === 'alltime' && (
                <><AggStats runs={all()} /><AggCharts runs={all()} /><RunList runs={all()} /></>
            )}
        </div>
    );
};

export default ReportsView;


