import { Component, createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { Source } from '../typing/types';
import { getSourceContent } from '../storage/indexedDb';
import { sourcesState, setSourceSelection } from '../state/sources';
import { startRun } from '../state/typing';
import {
    getSelectionOffsetsFromDOM,
    computeSelectionMeta,
    prepareRunTarget,
} from '../utils/selection';

interface SourceViewerProps {
    source: Source;
}

const SourceViewer: Component<SourceViewerProps> = props => {
    const [content, setContent] = createSignal('');
    let preRef!: HTMLPreElement;

    createEffect(() => {
        let cancelled = false;
        const sourceId = props.source.id;

        getSourceContent(sourceId).then(stored => {
            if (cancelled) return;
            const normalized = (stored?.content ?? '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            setContent(normalized);
            setSourceSelection(null);
        });

        onCleanup(() => { cancelled = true; });
    });

    createEffect(() => {
        function handleSelectionChange(): void {
            if (!preRef) return;
            const text = content();
            setSourceSelection(getSelectionOffsetsFromDOM(preRef, text.length));
        }

        document.addEventListener('selectionchange', handleSelectionChange);
        onCleanup(() => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        });
    });

    const meta = () => computeSelectionMeta(content(), sourcesState.selection);

    function handlePracticeSelection(): void {
        const text = content();
        const sel = sourcesState.selection;
        if (!sel) return;
        const target = prepareRunTarget(text, sel.startOffset, sel.endOffset);
        if (!target) {
            alert('Selection contains no practiceable text');
            return;
        }
        startRun(target, props.source.id, props.source.name, sel.startOffset, sel.endOffset, false);
    }

    function handlePracticeAll(): void {
        const text = content();
        const target = prepareRunTarget(text, 0, text.length);
        if (!target) {
            alert('Source contains no practiceable text');
            return;
        }
        startRun(target, props.source.id, props.source.name, 0, text.length, true);
    }

    const lines = () => content().split('\n');

    return (
        <div class="source-viewer-pane">
            <div class="source-header">
                <h3>{props.source.name}</h3>
                <button class="btn-practice-all" onClick={handlePracticeAll}>Practice All</button>
            </div>

            <div class="source-viewer">
                <div class="line-number-gutter" aria-hidden="true">
                    {lines().map((_, idx) => <div>{idx + 1}</div>)}
                </div>
                <pre ref={preRef} class="source-content-pre" spellcheck={false}>{content()}</pre>
            </div>

            <div class="selection-footer">
                <Show
                    when={meta()}
                    fallback={<span class="selection-meta">Selection: None</span>}
                >
                    {info => (
                        <span class="selection-meta">
                            Selection: lines {info().startLine}–{info().endLine} · {info().charCount} characters
                        </span>
                    )}
                </Show>
                <button
                    class="btn-practice-selection"
                    disabled={meta() === null}
                    onClick={handlePracticeSelection}
                >
                    Practice Selection
                </button>
            </div>
        </div>
    );
};

export default SourceViewer;
