import { DS } from './design-system';
import { VexeaSettingsData } from './src/settings/types';
import { getSettings, saveSettings, applySettings } from './src/settings/state';
import { openSettingsUI, closeSettingsUI, overlayEl, renderTabContent } from './src/settings/ui';

export type { VexeaSettingsData };
export { getSettings, saveSettings, applySettings };

export let matchActiveInSettings = false;
let settingsModalOpen = false;

export function openSettings() {
    if (settingsModalOpen) return;
    settingsModalOpen = true;

    openSettingsUI(
        matchActiveInSettings,
        () => {
            settingsModalOpen = false;
        },
        (sidebar, content, onSelect) => {
            injectMatchTabDOM(sidebar, content, onSelect);
        }
    );
}

export function closeSettings() {
    settingsModalOpen = false;
    closeSettingsUI(() => {
        settingsModalOpen = false;
    });
}

function injectMatchTabDOM(sidebar: HTMLElement, content: HTMLElement, onSelect: () => void) {
    if (!sidebar || !content) return;

    // Check if MATCH button already exists to prevent duplicate injection
    if (sidebar.querySelector('.tab-button[data-tab="MATCH"]')) return;

    // MATCH tab button
    const btn = document.createElement('button');
    btn.className = 'tab-button';
    btn.setAttribute('data-tab', 'MATCH');
    btn.innerText = 'MATCH';
    // Insert at index 0 or before any tabs
    sidebar.insertBefore(btn, sidebar.firstChild);

    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(tt => tt.classList.remove('active'));
        btn.classList.add('active');
        onSelect();
    });
}

export function injectMatchTab(): void {
    if (!matchActiveInSettings) {
        matchActiveInSettings = true;
        if (overlayEl) {
            const sidebar = document.getElementById('settings-sidebar');
            const content = document.getElementById('settings-content');
            if (sidebar && content) {
                injectMatchTabDOM(sidebar, content, () => {
                    renderTabContent('MATCH', content as HTMLDivElement, getSettings(), () => {
                        closeSettings();
                    });
                });
                
                // Switch focus to Match tab
                const matchBtn = sidebar.querySelector('.tab-button[data-tab="MATCH"]') as HTMLElement;
                if (matchBtn) matchBtn.click();
            }
        }
    }
}

export function removeMatchTab(): void {
    matchActiveInSettings = false;
    if (overlayEl) {
        const btn = document.querySelector('.tab-button[data-tab="MATCH"]');
        const page = document.getElementById('tab-MATCH');
        if (btn) btn.remove();
        if (page) page.remove();

        // Switch to Gameplay tab
        const gameplayBtn = document.querySelector('.tab-button[data-tab="GAMEPLAY"]') as HTMLElement;
        if (gameplayBtn) gameplayBtn.click();
    }
}
