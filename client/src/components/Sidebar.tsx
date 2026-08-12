import { Component } from 'solid-js';
import { setCurrentView, navigateToTyping } from '../state/app';
import FileUploader from './FileUploader';
import TextEditor from './TextEditor';

const Sidebar: Component = () => (
    <nav class="sidebar">
        <ul class="sidebar-nav">
            <li><button onClick={navigateToTyping}>Typing</button></li>
            <li><button onClick={() => setCurrentView('reports')}>Reports</button></li>
        </ul>
        <div class="sidebar-section">
            <span class="sidebar-section-label">Sources</span>
            <ul class="sidebar-nav">
                <li><FileUploader /></li>
                <li><TextEditor /></li>
            </ul>
        </div>
        <div class="sidebar-bottom">
            <button onClick={() => setCurrentView('settings')}>Settings</button>
        </div>
    </nav>
);

export default Sidebar;

