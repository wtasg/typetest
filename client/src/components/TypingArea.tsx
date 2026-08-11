import { Component, onMount } from 'solid-js';
import { runState, sendKey } from '../state/typing';
import { settings } from '../state/settings';
import TypingText from './TypingText';
import RunControls from './RunControls';

const TypingArea: Component = () => {
    let divRef!: HTMLDivElement;

    onMount(() => divRef.focus());

    function handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Tab') e.preventDefault();
        if (e.ctrlKey || e.metaKey) return;
        sendKey(e.key, e.code);
    }

    return (
        <div
            ref={divRef}
            class="typing-area-wrapper"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
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
