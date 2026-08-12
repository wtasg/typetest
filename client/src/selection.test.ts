import { describe, it, expect } from 'vitest';
import { prepareRunTarget, computeSelectionMeta } from './utils/selection';
import { TextSelection } from './typing/types';

// ── prepareRunTarget ──────────────────────────────────────────────────────────

describe('prepareRunTarget', () => {
    it('extracts a sub-range before normalizing and trimming', () => {
        const content = '\n\n  func main() {\r\n      return\r\n  }\n\n';
        const target = prepareRunTarget(content, 2, content.length);
        expect(target).toBe('func main() {\n      return\n  }');
    });

    it('normalizes CRLF and CR to LF', () => {
        expect(prepareRunTarget('a\r\nb\rc')).toBe('a\nb\nc');
    });

    it('trims leading/trailing whitespace', () => {
        expect(prepareRunTarget('  hello world  ')).toBe('hello world');
    });

    it('preserves internal spaces, tabs, and newlines', () => {
        expect(prepareRunTarget('a\t b\nc')).toBe('a\t b\nc');
    });

    it('slices with explicit offsets', () => {
        const content = 'abcdef';
        expect(prepareRunTarget(content, 2, 5)).toBe('cde');
    });

    it('handles full-range selection identically to defaults', () => {
        const content = 'hello';
        expect(prepareRunTarget(content, 0, content.length)).toBe('hello');
    });

    it('returns empty string when slice trims to nothing', () => {
        expect(prepareRunTarget('   \n  ', 0, 6)).toBe('');
    });
});

// ── computeSelectionMeta ──────────────────────────────────────────────────────

describe('computeSelectionMeta', () => {
    const content = 'line1\nline2\nline3\nline4';

    it('returns null when selection is null', () => {
        expect(computeSelectionMeta(content, null)).toBeNull();
    });

    it('computes single-line range and char count', () => {
        const sel: TextSelection = { startOffset: 6, endOffset: 11 }; // "line2"
        expect(computeSelectionMeta(content, sel)).toEqual({ startLine: 2, endLine: 2, charCount: 5 });
    });

    it('computes multi-line range', () => {
        const sel: TextSelection = { startOffset: 6, endOffset: 16 }; // "line2\nline3"
        expect(computeSelectionMeta(content, sel)).toEqual({ startLine: 2, endLine: 3, charCount: 10 });
    });

    it('starts counting lines at 1', () => {
        const sel: TextSelection = { startOffset: 0, endOffset: 5 }; // "line1"
        expect(computeSelectionMeta(content, sel)).toEqual({ startLine: 1, endLine: 1, charCount: 5 });
    });

    it('returns null for invalid offsets', () => {
        expect(computeSelectionMeta(content, { startOffset: -1, endOffset: 5 })).toBeNull();
        expect(computeSelectionMeta(content, { startOffset: 5, endOffset: 5 })).toBeNull();
        expect(computeSelectionMeta(content, { startOffset: 5, endOffset: 99 })).toBeNull();
    });
});
