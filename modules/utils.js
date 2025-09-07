// modules/utils.js
window.phoneUiUtils = (function() {
    const STORAGE_KEY_STATE = 'st_phone_ui_v19_state';
    const STORAGE_KEY_MESSAGES = 'st_phone_ui_v19_user_messages';

    let DOMElements = {};
    let globalState = {};
    let viewHistory = [];
    let islandTimeout;

    // --- Public Methods ---
    const self = {
        STORAGE_KEY_STATE,
        STORAGE_KEY_MESSAGES,

        init: (doms, state) => {
            DOMElements = doms;
            globalState = state;
        },

        sendCommandToAI: (cmd) => {
            if (typeof triggerSlash === 'function') {
                triggerSlash(`/send ${cmd}|/trigger`);
            } else {
                console.log(`[SIMULATED]: /send ${cmd}|/trigger`);
                alert(`模拟发送:\n/send ${cmd}|/trigger`);
            }
        },

        showIslandNotification: (iconHtml, text) => {
            clearTimeout(islandTimeout);
            const island = DOMElements.dynamicIsland;
            island.querySelector('.island-content').innerHTML = `${iconHtml}<span>${text}</span>`;
            island.classList.add('expanded');
            islandTimeout = setTimeout(() => island.classList.remove('expanded'), 2500);
        },

        getUserMessagesFromStorage: (chatId) => {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY_MESSAGES) || '{}')[chatId] || []; }
            catch (e) { return []; }
        },

        saveUserMessageToStorage: (chatId, msg) => {
            try {
                const all = JSON.parse(localStorage.getItem(STORAGE_KEY_MESSAGES) || '{}');
                if (!all[chatId]) all[chatId] = [];
                all[chatId].push(msg);
                localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(all));
            } catch (e) {}
        },

        saveUserMessages: (chatId, messages) => {
             try {
                const all = JSON.parse(localStorage.getItem(STORAGE_KEY_MESSAGES) || '{}');
                all[chatId] = messages;
                localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(all));
            } catch (e) {}
        },

        clearUserMessagesFromStorage: (chatId) => {
            try {
                const all = JSON.parse(localStorage.getItem(STORAGE_KEY_MESSAGES) || '{}');
                delete all[chatId];
                localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(all));
            } catch (e) {}
        },

        navigateTo: (targetId, data = {}) => {
            const currentView = DOMElements.phone.querySelector('.phone-view.active');
            const targetView = document.getElementById(targetId);
            if (!targetView || (currentView && currentView.id === targetId)) return;

            // 触发一个自定义事件，让其他模块知道导航发生了
            const navigateEvent = new CustomEvent('phone-navigate', {
                detail: { from: currentView.id, to: targetId, data }
            });
            document.body.dispatchEvent(navigateEvent);

            // 在特定导航前保存当前视图状态
            viewHistory.push({ id: currentView.id, data });

            currentView.classList.remove('active');
            currentView.classList.add('inactive-left');
            targetView.classList.remove('inactive-left', 'inactive-right');
            targetView.classList.add('active');
        },

        navigateBack: () => {
             const currentView = DOMElements.phone.querySelector('.phone-view.active');
             if (!currentView) return;

             const previousViewInfo = viewHistory.pop();
             if (!previousViewInfo) {
                 self.goHome();
                 return;
             }

             // 触发返回事件
             const navigateBackEvent = new CustomEvent('phone-navigate-back', {
                 detail: { from: currentView.id, to: previousViewInfo.id, data: previousViewInfo.data }
             });
             document.body.dispatchEvent(navigateBackEvent);

             currentView.classList.remove('active');
             currentView.classList.add('inactive-right');
             const prevView = document.getElementById(previousViewInfo.id);
             prevView?.classList.remove('inactive-left', 'inactive-right');
             prevView?.classList.add('active');
        },

        goHome: () => {
            viewHistory.length = 0;
            DOMElements.phone.querySelectorAll('.phone-view').forEach(v => {
                v.classList.remove('active', 'inactive-left', 'inactive-right');
                if (v.id !== 'home-screen') v.classList.add('inactive-right');
            });
            DOMElements.homeScreen.classList.add('active');

            const goHomeEvent = new CustomEvent('phone-go-home');
            document.body.dispatchEvent(goHomeEvent);
        },

        parseSourceData: (dataString, currentState) => {
            const newData = { config: {}, chatListUpdates: [], chatLogs: {}, momentsLog: [], contacts: [], friendRequests: [], campusCard: null };
            let lines = dataString.split('\n').map(l => l.trim()).filter(Boolean);
            let currentSection = 'CONFIG', currentChatLogId = null;

            lines.forEach(line => {
                if (line.startsWith('[') && line.endsWith(']')) {
                    const tag = line.slice(1, -1);
                    const knownSections = { 'CHAT_LIST': 'CHAT_LIST', 'MOMENTS_LOG': 'MOMENTS_LOG', 'CONTACTS': 'CONTACTS', 'FRIEND_REQUESTS': 'FRIEND_REQUESTS', 'CONFIG': 'CONFIG', 'CAMPUS_CARD': 'CAMPUS_CARD' };
                    if (tag.startsWith('CHAT_LOG:')) {
                        currentSection = 'CHAT_LOG';
                        currentChatLogId = tag.substring(9);
                        if (!newData.chatLogs[currentChatLogId]) newData.chatLogs[currentChatLogId] = [];
                    } else if (knownSections[tag]) {
                        currentSection = knownSections[tag];
                        if(currentSection === 'CAMPUS_CARD') newData.campusCard = {};
                    } else { currentSection = 'UNKNOWN'; }
                    return;
                }

                let match;
                switch(currentSection) {
                    case 'CONFIG': if (match = line.match(/^([^:]+):\s*(.*)$/)) newData.config[match[1]] = match[2]; break;
                    case 'CHAT_LIST': if (match = line.match(/^CHAT:\s*(.*)$/)) try { newData.chatListUpdates.push(JSON.parse(match[1])); } catch(e){} break;
                    case 'CHAT_LOG':
                        if (!currentChatLogId) return;
                        const timestamp = Date.now() + Math.random();
                        if (match = line.match(/^TIME:\s*(.*)$/)) { try { if(JSON.parse(match[1])) newData.chatLogs[currentChatLogId].push({ type: 'TIME', sender: null, content: match[1], timestamp }); } catch(e) {} }
                        else if (match = line.match(/^SYSTEM:\s*(.*)$/)) { newData.chatLogs[currentChatLogId].push({ type: 'SYSTEM', sender: null, content: match[1], timestamp }); }
                        else if (match = line.match(/^([^:]+):\s*(.*)$/)) {
                            const [ , senderKey, content] = match;
                            const senderName = senderKey.startsWith('CHAR-') ? senderKey.substring(5) : (senderKey === 'CHAR' ? null : senderKey);
                            newData.chatLogs[currentChatLogId].push({ type: 'CHAR', sender: senderName, content: content, timestamp });
                        }
                        break;
                    case 'MOMENTS_LOG': if(match = line.match(/^MOMENT:\s*(.*)$/)) try { const moment = JSON.parse(match[1]); if (!currentState.momentsLog.some(m => m.id === moment.id)) newData.momentsLog.push(moment); } catch(e){} break;
                    case 'CONTACTS': if (match = line.match(/^CONTACT:\s*(.*)$/)) try { const c = JSON.parse(match[1]); if (!currentState.contacts.some(ct => ct.name === c.name)) newData.contacts.push(c); } catch(e){} break;
                    case 'FRIEND_REQUESTS': if (match = line.match(/^REQUEST:\s*(.*)$/)) try { const req = JSON.parse(match[1]); if(!currentState.friendRequests.some(r => r.id === req.id) && !(currentState.handledRequestIds || []).includes(req.id)) newData.friendRequests.push(req); } catch(e){} break;
                    case 'CAMPUS_CARD': if (newData.campusCard && (match = line.match(/^([^:]+):\s*(.*)$/))) { const key = match[1].toLowerCase(); const value = match[2]; if (key === 'balance') { newData.campusCard[key] = parseFloat(value) || 0; } else { newData.campusCard[key] = value; } } break;
                }
            });
            return newData;
        }
    };
    return self;
})();
