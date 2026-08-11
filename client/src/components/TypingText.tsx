import { Component, Index } from 'solid-js';
import { CharState, GameConfig } from '../typing/types';

interface Props {
    target: string;
    charStates: CharState[];
    cursor: number;
    config: GameConfig;
}

const TypingText: Component<Props> = props => {
    const chars = () => Array.from(props.target);

    function glyph(ch: string): string {
        if (ch === ' ') return props.config.showSpaces ? props.config.spaceGlyph : ' ';
        if (ch === '\t') return props.config.showTabs ? props.config.tabGlyph : '\t';
        if (ch === '\n') return props.config.showNewlines ? props.config.newlineGlyph + '\n' : '\n';
        return ch;
    }

    function state(i: number): CharState | 'current' {
        if (i === props.cursor) return 'current';
        return props.charStates[i] ?? 'untyped';
    }

    function typeClass(ch: string): string {
        if (ch === '\n') return 'nl';
        if (ch === '\t') return 'tab';
        if (ch === ' ') return 'sp';
        return '';
    }

    return (
        <pre class="typing-text" aria-label="typing target">
            <Index each={chars()}>
                {(ch, i) => (
                    <span class={`c ${state(i)} ${typeClass(ch())}`}>{glyph(ch())}</span>
                )}
            </Index>
            {/* trailing cursor when at end */}
            {props.cursor >= props.target.length && (
                <span class="c current end-cur"> </span>
            )}
        </pre>
    );
};

export default TypingText;
