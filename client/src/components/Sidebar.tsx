import { Component } from 'solid-js';
import { setCurrentView } from '../state/app';
import FileUploader from './FileUploader';
import TextEditor from './TextEditor';

const Sidebar: Component = () => (
    <nav class="sidebar">
        <ul class="sidebar-nav">
            <li><button onClick={() => setCurrentView('typing')}>Typing</button></li>
            <li><FileUploader /></li>
            <li><TextEditor /></li>
            <li><button onClick={() => setCurrentView('reports')}>Reports</button></li>
        </ul>
        <div class="sidebar-bottom">
            <button onClick={() => setCurrentView('settings')}>Settings</button>
        </div>
    </nav>
);

export default Sidebar;
