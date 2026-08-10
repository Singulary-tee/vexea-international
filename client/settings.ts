import { DS } from './design-system';
import { VexeaSettingsData } from './src/settings/types';
import { getSettings, saveSettings, applySettings } from './src/settings/state';
import { openSettingsUI, closeSettingsUI, overlayEl } from './src/settings/ui';

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
        (sidebar, content) => {
            injectMatchTabDOM(sidebar, content);
        }
    );
}

export function closeSettings() {
    settingsModalOpen = false;
    closeSettingsUI(() => {
        settingsModalOpen = false;
    });
}

function injectMatchTabDOM(sidebar: HTMLElement, content: HTMLElement) {
    if (!sidebar || !content) return;

    // MATCH tab button
    const btn = document.createElement('button');
    btn.className = 'tab-button';
    btn.setAttribute('data-tab', 'MATCH');
    btn.innerText = 'MATCH';
    // Insert at index 0 or before any tabs
    sidebar.insertBefore(btn, sidebar.firstChild);

    // MATCH tab page
    const page = document.createElement('div');
    page.id = 'tab-MATCH';
    Object.assign(page.style, {
        maxWidth: '50.00rem',
        margin: '0 auto',
        display: 'none',
        flexDirection: 'column',
        gap: '16px'
    });

    const title = document.createElement('h3');
    title.innerText = 'MATCH';
    Object.assign(title.style, {
        fontSize: DS.typography.sizes.headingMd,
        fontWeight: 'bold',
        color: DS.colors.accent,
        borderBottom: '2px solid #27272a',
        paddingBottom: '0.50rem',
        marginBottom: '1.00rem',
        letterSpacing: '1px'
    });
    page.appendChild(title);

    const desc = document.createElement('p');
    desc.innerText = 'Active match controls. Quit or abandon active squad connections.';
    desc.style.fontSize = DS.typography.sizes.small;
    desc.style.color = '#a1a1aa';
    page.appendChild(desc);

    const quitBtn = document.createElement('button');
    quitBtn.id = 'btn-quit-match';
    quitBtn.innerText = 'QUIT MATCH';
    Object.assign(quitBtn.style, {
        height: '48px',
        background: 'transparent',
        border: `1px solid ${DS.colors.danger}`,
        color: DS.colors.danger,
        fontFamily: DS.typography.fontFamily,
        fontSize: DS.typography.sizes.headingSm,
        fontWeight: 'bold',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        marginTop: '0.75rem',
        borderRadius: '0px'
    });
    page.appendChild(quitBtn);

    content.insertBefore(page, content.firstChild);

    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(tt => tt.classList.remove('active'));
        content.childNodes.forEach((p: any) => {
            if (p.style) p.style.display = 'none';
        });
        btn.classList.add('active');
        page.style.display = 'flex';
    });

    quitBtn.addEventListener('click', () => {
        // Abandon mission confirmation modal
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '4000',
            background: 'rgba(5, 5, 5, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        
        const card = document.createElement('div');
        Object.assign(card.style, {
            width: '25.00rem',
            background: '#18181b',
            border: `1px solid ${DS.colors.danger}`,
            padding: '2.00rem',
            borderRadius: '0px'
        });
        
        const cardTitle = document.createElement('div');
        cardTitle.innerText = 'ABANDON MISSION';
        Object.assign(cardTitle.style, {
            fontFamily: DS.typography.fontFamily,
            fontSize: DS.typography.sizes.headingMd,
            fontWeight: 'bold',
            color: '#ffffff',
            textTransform: 'uppercase',
            marginBottom: '0.50rem',
            letterSpacing: '1px'
        });
        
        const cardBody = document.createElement('div');
        cardBody.innerText = 'You will be removed from the match. The mission continues without you.';
        Object.assign(cardBody.style, {
            fontFamily: DS.typography.fontFamily,
            fontSize: DS.typography.sizes.body,
            color: '#a1a1aa',
            marginBottom: '1.50rem',
            lineHeight: '1.5'
        });
        
        const btnWrap = document.createElement('div');
        Object.assign(btnWrap.style, { display: 'flex', gap: '16px' });
        
        const confBtn = document.createElement('button');
        confBtn.innerText = 'CONFIRM';
        Object.assign(confBtn.style, {
            background: DS.colors.danger,
            color: '#000000',
            fontFamily: DS.typography.fontFamily,
            fontSize: DS.typography.sizes.body,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            borderRadius: '0px',
            padding: '0.63rem 1.25rem',
            border: 'none',
            cursor: 'pointer'
        });
        
        const cancBtn = document.createElement('button');
        cancBtn.innerText = 'CANCEL';
        Object.assign(cancBtn.style, {
            background: 'transparent',
            border: `1px solid #27272a`,
            color: '#a1a1aa',
            padding: '0.63rem 1.25rem',
            fontFamily: DS.typography.fontFamily,
            fontSize: DS.typography.sizes.body,
            cursor: 'pointer',
            borderRadius: '0px'
        });
        
        confBtn.onclick = () => {
            document.dispatchEvent(new CustomEvent("VEXEA_PLAYER_QUIT"));
            modal.remove();
            closeSettings();
        };
        
        cancBtn.onclick = () => modal.remove();
        
        btnWrap.appendChild(confBtn);
        btnWrap.appendChild(cancBtn);
        card.appendChild(cardTitle);
        card.appendChild(cardBody);
        card.appendChild(btnWrap);
        modal.appendChild(card);
        document.body.appendChild(modal);
    });
}

export function injectMatchTab(): void {
    if (!matchActiveInSettings) {
        matchActiveInSettings = true;
        if (overlayEl) {
            const sidebar = document.getElementById('settings-sidebar');
            const content = document.getElementById('settings-content');
            if (sidebar && content) {
                injectMatchTabDOM(sidebar, content);
                
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
