import { TextSelection } from '../typing/types';
import { normalizeText } from '../typing/normalization';

export interface SelectionMeta {
    startLine: number;
    endLine: number;
    charCount: number;
}

/**
 * Extract selection offsets from a live DOM selection inside a container.
 * Offsets are measured via Range.toString().length so they align 1:1 with the
 * string indices of the container's text content (requires the container to
 * hold normalized, plain text).
 */
export function getSelectionOffsetsFromDOM(
    containerEl: HTMLElement,
    textLength: number,
): TextSelection | null {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        return null;
    }

    const range = sel.getRangeAt(0);
    if (!containerEl.contains(range.commonAncestorContainer)) {
        return null;
    }

    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(containerEl);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preCaretRange.toString().length;

    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const endOffset = preCaretRange.toString().length;

    if (startOffset >= endOffset || startOffset < 0 || endOffset > textLength) {
        return null;
    }

    return { startOffset, endOffset };
}

/** Compute line range and character count for a selection. */
export function computeSelectionMeta(
    content: string,
    selection: TextSelection | null,
): SelectionMeta | null {
    if (!selection) return null;
    const { startOffset, endOffset } = selection;
    if (startOffset < 0 || endOffset <= startOffset || endOffset > content.length) {
        return null;
    }

    let startLine = 1;
    for (let i = 0; i < startOffset; i++) {
        if (content[i] === '\n') startLine++;
    }

    let endLine = startLine;
    for (let i = startOffset; i < endOffset; i++) {
        if (content[i] === '\n') endLine++;
    }

    return { startLine, endLine, charCount: endOffset - startOffset };
}

/**
 * Unified pipeline: extract the raw slice, normalize line endings, trim outer
 * whitespace. Produces the immutable run target snapshot.
 */
export function prepareRunTarget(
    content: string,
    startOffset = 0,
    endOffset = content.length,
): string {
    return normalizeText(content.slice(startOffset, endOffset));
}
