import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import * as d3 from 'd3';
import { RunSummary } from '../../typing/types';

// ─── WPM over time line chart ─────────────────────────────────────────────────

export const WpmChart: Component<{ runs: RunSummary[] }> = props => {
    let svgRef!: SVGSVGElement;

    function draw() {
        const runs = [...props.runs].reverse(); // oldest first
        const svg = d3.select(svgRef);
        svg.selectAll('*').remove();

        const W = svgRef.clientWidth || 600;
        const H = 180;
        const m = { top: 16, right: 16, bottom: 36, left: 44 };
        const w = W - m.left - m.right;
        const h = H - m.top - m.bottom;

        svg.attr('viewBox', `0 0 ${W} ${H}`);

        const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

        const x = d3.scalePoint()
            .domain(runs.map((_, i) => String(i)))
            .range([0, w])
            .padding(0.5);

        const maxWpm = d3.max(runs, r => r.metrics.effective.effectiveWPM) ?? 10;
        const y = d3.scaleLinear().domain([0, maxWpm * 1.15]).range([h, 0]);

        // gridlines
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(() => ''));

        // axes
        g.append('g').attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).tickFormat((_, i) => {
                if (runs.length <= 10 || i % Math.ceil(runs.length / 10) === 0)
                    return new Date(runs[i].startedAt).toLocaleDateString();
                return '';
            }))
            .selectAll('text').attr('transform', 'rotate(-30)').style('text-anchor', 'end').attr('dy', '0.5em');

        g.append('g').call(d3.axisLeft(y).ticks(4));

        // raw WPM area
        const areaRaw = d3.area<RunSummary>()
            .x((_, i) => x(String(i))!)
            .y0(h).y1(r => y(r.metrics.raw.rawWPM))
            .curve(d3.curveMonotoneX);

        g.append('path').datum(runs).attr('class', 'chart-area-raw').attr('d', areaRaw);

        // effective WPM line
        const line = d3.line<RunSummary>()
            .x((_, i) => x(String(i))!)
            .y(r => y(r.metrics.effective.effectiveWPM))
            .curve(d3.curveMonotoneX);

        g.append('path').datum(runs).attr('class', 'chart-line-eff').attr('d', line);

        // dots
        g.selectAll('.dot-eff')
            .data(runs).enter().append('circle')
            .attr('class', 'dot-eff')
            .attr('cx', (_, i) => x(String(i))!)
            .attr('cy', r => y(r.metrics.effective.effectiveWPM))
            .attr('r', 3);

        // y-axis label
        svg.append('text').attr('class', 'axis-label')
            .attr('transform', `rotate(-90)`)
            .attr('x', -(m.top + h / 2)).attr('y', 12)
            .text('WPM');
    }

    onMount(draw);
    createEffect(draw);

    const ro = new ResizeObserver(draw);
    onMount(() => ro.observe(svgRef));
    onCleanup(() => ro.disconnect());

    return <svg ref={svgRef} class="d3-chart" />;
};

// ─── Accuracy over time bar chart ────────────────────────────────────────────

export const AccuracyChart: Component<{ runs: RunSummary[] }> = props => {
    let svgRef!: SVGSVGElement;

    function draw() {
        const runs = [...props.runs].reverse();
        const svg = d3.select(svgRef);
        svg.selectAll('*').remove();

        const W = svgRef.clientWidth || 600;
        const H = 160;
        const m = { top: 16, right: 16, bottom: 36, left: 44 };
        const w = W - m.left - m.right;
        const h = H - m.top - m.bottom;

        svg.attr('viewBox', `0 0 ${W} ${H}`);
        const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

        const x = d3.scaleBand()
            .domain(runs.map((_, i) => String(i)))
            .range([0, w]).padding(0.25);

        const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

        g.append('g').attr('class', 'grid')
            .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(() => ''));

        g.append('g').attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).tickFormat((_, i) => {
                if (runs.length <= 10 || i % Math.ceil(runs.length / 10) === 0)
                    return new Date(runs[i].startedAt).toLocaleDateString();
                return '';
            }))
            .selectAll('text').attr('transform', 'rotate(-30)').style('text-anchor', 'end').attr('dy', '0.5em');

        g.append('g').call(d3.axisLeft(y).ticks(4).tickFormat(d => `${d}%`));

        g.selectAll('.bar-acc')
            .data(runs).enter().append('rect')
            .attr('class', 'bar-acc')
            .attr('x', (_, i) => x(String(i))!)
            .attr('y', r => y(r.metrics.effective.accuracy))
            .attr('width', x.bandwidth())
            .attr('height', r => h - y(r.metrics.effective.accuracy));

        svg.append('text').attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(m.top + h / 2)).attr('y', 12)
            .text('Accuracy %');
    }

    onMount(draw);
    createEffect(draw);

    const ro = new ResizeObserver(draw);
    onMount(() => ro.observe(svgRef));
    onCleanup(() => ro.disconnect());

    return <svg ref={svgRef} class="d3-chart" />;
};

// ─── Key distribution horizontal bar chart ───────────────────────────────────

export const KeyDistChart: Component<{ target: string }> = props => {
    let svgRef!: SVGSVGElement;

    function draw() {
        const freq: Record<string, number> = {};
        for (const ch of props.target) {
            const label = ch === ' ' ? '·SPACE' : ch === '\n' ? '↵NL' : ch === '\t' ? '→TAB' : ch;
            freq[label] = (freq[label] ?? 0) + 1;
        }
        const total = props.target.length || 1;
        const data = Object.entries(freq)
            .map(([k, v]) => ({ key: k, pct: v / total * 100 }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 20);

        const svg = d3.select(svgRef);
        svg.selectAll('*').remove();

        const W = svgRef.clientWidth || 600;
        const rowH = 22;
        const H = data.length * rowH + 24;
        const m = { top: 8, right: 48, bottom: 8, left: 56 };
        const w = W - m.left - m.right;

        svg.attr('viewBox', `0 0 ${W} ${H}`);
        const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

        const x = d3.scaleLinear().domain([0, d3.max(data, d => d.pct) ?? 1]).range([0, w]);
        const y = d3.scaleBand().domain(data.map(d => d.key)).range([0, data.length * rowH]).padding(0.25);

        g.selectAll('.bar-key')
            .data(data).enter().append('rect')
            .attr('class', 'bar-key')
            .attr('x', 0)
            .attr('y', d => y(d.key)!)
            .attr('width', d => x(d.pct))
            .attr('height', y.bandwidth());

        g.selectAll('.bar-key-label')
            .data(data).enter().append('text')
            .attr('class', 'bar-key-label')
            .attr('x', -4).attr('y', d => y(d.key)! + y.bandwidth() / 2)
            .attr('dy', '0.35em').attr('text-anchor', 'end')
            .text(d => d.key.length > 6 ? d.key.slice(0, 6) : d.key);

        g.selectAll('.bar-key-pct')
            .data(data).enter().append('text')
            .attr('class', 'bar-key-pct')
            .attr('x', d => x(d.pct) + 4).attr('y', d => y(d.key)! + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => `${d.pct.toFixed(1)}%`);
    }

    onMount(draw);
    createEffect(draw);

    const ro = new ResizeObserver(draw);
    onMount(() => ro.observe(svgRef));
    onCleanup(() => ro.disconnect());

    return <svg ref={svgRef} class="d3-chart" />;
};

// ─── Inter-key interval histogram ────────────────────────────────────────────

export const IkiHistogram: Component<{ intervals: number[] }> = props => {
    let svgRef!: SVGSVGElement;

    function draw() {
        const vals = props.intervals.filter(v => v > 0 && v < 2000);
        if (!vals.length) return;

        const svg = d3.select(svgRef);
        svg.selectAll('*').remove();

        const W = svgRef.clientWidth || 600;
        const H = 160;
        const m = { top: 16, right: 16, bottom: 36, left: 44 };
        const w = W - m.left - m.right;
        const h = H - m.top - m.bottom;

        svg.attr('viewBox', `0 0 ${W} ${H}`);
        const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

        const x = d3.scaleLinear().domain([0, d3.max(vals) ?? 500]).range([0, w]);
        const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(30)(vals);
        const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length) ?? 1]).range([h, 0]);

        g.append('g').attr('class', 'grid')
            .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(() => ''));

        g.append('g').attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}ms`));

        g.append('g').call(d3.axisLeft(y).ticks(4));

        g.selectAll('.bar-iki')
            .data(bins).enter().append('rect')
            .attr('class', 'bar-iki')
            .attr('x', d => x(d.x0 ?? 0) + 1)
            .attr('y', d => y(d.length))
            .attr('width', d => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
            .attr('height', d => h - y(d.length));

        svg.append('text').attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(m.top + h / 2)).attr('y', 12).text('Count');

        svg.append('text').attr('class', 'axis-label')
            .attr('x', m.left + w / 2).attr('y', H - 2)
            .attr('text-anchor', 'middle').text('Inter-key interval (ms)');
    }

    onMount(draw);
    createEffect(draw);

    const ro = new ResizeObserver(draw);
    onMount(() => ro.observe(svgRef));
    onCleanup(() => ro.disconnect());

    return <svg ref={svgRef} class="d3-chart" />;
};
