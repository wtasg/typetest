import { Component, onMount } from 'solid-js';
import { runState, sendKey } from '../state/typing';
import { settings } from '../state/settings';
import TypingText from './TypingText';
import RunControls from './RunControls';

const TypingArea: Component = () => {
    let captureRef!: HTMLTextAreaElement;

    onMount(() => {
        if (runState.status === 'RUNNING') {
            captureRef?.focus();
        }
    });

    function handleKeyDown(e: KeyboardEvent): void {
        const isPaste =
            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') ||
            (e.shiftKey && e.key === 'Insert');

        if (isPaste) {
            e.preventDefault();
            return;
        }

        const isAltGr = (e.ctrlKey && e.altKey) || Boolean(e.getModifierState?.('AltGraph'));
        if ((e.ctrlKey || e.metaKey) && !isAltGr) {
            return;
        }

        e.preventDefault();
        sendKey(e.key, e.code);
    }

    function handleBlur(): void {
        setTimeout(() => {
            if (!document.hasFocus()) return;
            const el = document.activeElement as HTMLElement | null;
            if (runState.status === 'RUNNING'
                && el !== captureRef
                && !el?.closest('button, a, input, select, textarea, [tabindex]')) {
                captureRef.focus();
            }
        });
    }

    return (
        <div class="typing-area-wrapper">
            <textarea
                ref={captureRef}
                class="typing-capture"
                aria-label="Typing input"
                spellcheck={false}
                autocorrect="off"
                autocapitalize="off"
                autocomplete="off"
                wrap="off"
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onPaste={e => e.preventDefault()}
                onDrop={e => e.preventDefault()}
                onInput={e => { e.currentTarget.value = ''; }}
            />
            <RunControls />
            <TypingText
                target={runState.target}
                charStates={runState.charStates}
                cursor={runState.cursor}
                config={settings}
            />
        </div>
    );
};

export default TypingArea;
