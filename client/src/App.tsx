import { Component, Match, Switch, onMount } from 'solid-js';
import { currentView, initApp } from './state/app';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import TypingView from './components/TypingView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';

const App: Component = () => {
    onMount(initApp);

    return (
        <div class="app">
            <Header />
            <div class="app-body">
                <Sidebar />
                <main class="main-content">
                    <Switch>
                        <Match when={currentView() === 'typing'}><TypingView /></Match>
                        <Match when={currentView() === 'reports'}><ReportsView /></Match>
                        <Match when={currentView() === 'settings'}><SettingsView /></Match>
                    </Switch>
                </main>
            </div>
            <Footer />
        </div>
    );
};

export default App;
