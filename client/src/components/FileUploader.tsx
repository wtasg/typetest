import { Component } from 'solid-js';
import { addSource } from '../state/sources';

const ALLOWED_EXTS = new Set([
    'go', 'rs', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'h', 'cpp', 'hpp',
    'sh', 'bash', 'zsh', 'sql', 'html', 'css', 'txt', 'md',
]);

const FileUploader: Component = () => {
    let inputRef!: HTMLInputElement;

    async function handleChange(): Promise<void> {
        const file = inputRef.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!ALLOWED_EXTS.has(ext)) {
            alert(`File type .${ext} is not supported.`);
            return;
        }
        const content = await file.text();
        await addSource(file.name, file.name, content);
        inputRef.value = '';
    }

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                style="display:none"
                accept={[...ALLOWED_EXTS].map(e => `.${e}`).join(',')}
                onChange={handleChange}
            />
            <button onClick={() => inputRef.click()}>+ Upload File</button>
        </>
    );
};

export default FileUploader;
