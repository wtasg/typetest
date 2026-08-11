import { Component, For, createSignal, onMount } from 'solid-js';
import { reportsState, refreshReports } from '../state/reports';
import { RunSummary } from '../typing/types';

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

    onMount(refreshReports);

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

    return (
        <div class="reports-view">
            <h2>Reports</h2>
            <div class="report-tabs">
                {([['previous', 'Previous Run'], ['previous2', 'Previous Previous'], ['7days', 'Last 7 Days'], ['30days', 'Last 30 Days'], ['alltime', 'All Time']] as [Tab, string][]).map(([t, label]) => (
                    <button class={`report-tab ${tab() === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
                ))}
            </div>

            {tab() === 'previous' && (() => {
                const run = all()[0];
                return run ? <RunList runs={[run]} /> : <p class="empty-state">No runs yet.</p>;
            })()}
            {tab() === 'previous2' && (() => {
                const run = all()[1];
                return run ? <RunList runs={[run]} /> : <p class="empty-state">No second run yet.</p>;
            })()}
            {tab() === '7days' && (<><AggStats runs={last7()} /><RunList runs={last7()} /></>)}
            {tab() === '30days' && (<><AggStats runs={last30()} /><RunList runs={last30()} /></>)}
            {tab() === 'alltime' && (<><AggStats runs={all()} /><RunList runs={all()} /></>)}
        </div>
    );
};

export default ReportsView;
