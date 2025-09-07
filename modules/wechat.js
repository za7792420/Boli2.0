// modules/wechat.js

window.phoneUiWechat = (function() {
    // --- Module-specific state and dependencies ---
    let DOMElements = {};
    let state = {};
    let STICKERS = {};
    let _deps = {}; // { navigateTo, navigateBack, goHome, queueCommand, showIslandNotification, saveState }
    let currentChat = null;

    // --- Private Helper Functions ---
    function updateInputBar() {
        if (!DOMElements.chatInput) return;
        const hasText = DOMElements.chatInput.value.trim().length > 0;
        DOMElements.sendBtn.style.display = hasText ? 'flex' : 'none';
        DOMElements.plusBtn.style.display = hasText ? 'none' : 'flex';
        DOMElements.chatInput.style.height = 'auto';
        DOMElements.chatInput.style.height = `${Math.min(DOMElements.chatInput.scrollHeight, 100)}px`;
    }

    function togglePanel(panelName) {
        const panelId = panelName === 'emoji' ? 'chat-emoji-menu' : panelName === 'plus' ? 'chat-plus-menu' : null;
        if (!panelId) {
            DOMElements.panelContainer.classList.remove('active');
            return;
        }
        const targetPanel = document.getElementById(panelId);
        const isActive = DOMElements.panelContainer.classList.contains('active') && targetPanel.classList.contains('active');

        if (isActive) {
            DOMElements.panelContainer.classList.remove('active');
        } else {
            document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
            targetPanel.classList.add('active');
            if (!DOMElements.panelContainer.classList.contains('active')) {
                DOMElements.panelContainer.classList.add('active');
            }
        }
    }

    // --- Rendering Functions ---
    function renderChatList() { /* ...logic... */ }
    function renderContacts() { /* ...logic... */ }
    // ... all other rendering functions from the original script
    // These functions have been omitted for brevity but should be copied here.
    // They will now use the module's `state` and `DOMElements`.

    // --- Public API ---
    const self = {
        init: (dependencies) => {
            _deps = dependencies;
            state = _deps.state;
            STICKERS = _deps.STICKERS;

            // This module will set its own DOM elements
            self.setDomElements(_deps.DOMElements);
            self.addEventListeners();
        },

        setDomElements: (doms) => {
            DOMElements = { ...doms,
                wechatTitle: document.getElementById('wechat-title'),
                chatsView: document.getElementById('wechat-chats-view'),
                contactsView: document.getElementById('wechat-contacts-view'),
                myProfileCard: document.getElementById('my-profile-card'),
                chatWindow: document.getElementById('chat-window-view'),
                chatWindowTitle: document.getElementById('chat-window-title'),
                chatInfoView: document.getElementById('chat-info-view'),
                chatInfoTitle: document.getElementById('chat-info-title'),
                chatInfoContent: document.getElementById('chat-info-content'),
                chatOptionsBtn: document.getElementById('chat-options-btn'),
                messagesContainer: document.querySelector('#chat-window-view .messages-container'),
                chatInput: document.getElementById('chat-input-textarea'),
                sendBtn: document.getElementById('chat-send-btn'),
                emojiBtn: document.getElementById('chat-emoji-btn'),
                plusBtn: document.getElementById('chat-plus-btn'),
                panelContainer: document.getElementById('panel-container'),
                emojiMenu: document.getElementById('chat-emoji-menu'),
                plusMenu: document.getElementById('chat-plus-menu'),
                momentsView: document.getElementById('moments-view'),
                momentsHeaderBg: document.querySelector('#moments-view .moments-header-bg'),
                myMomentsName: document.getElementById('my-moments-name'),
                myMomentsAvatar: document.getElementById('my-moments-avatar'),
                myMomentsSignature: document.getElementById('my-moments-signature'),
                momentsFeed: document.getElementById('moments-feed-container'),
                postMomentBtn: document.getElementById('post-new-moment'),
                friendRequestsContainer: document.getElementById('friend-requests-list-container'),
            };
        },

        setChatWallpaper: (url) => { if(DOMElements.chatWindow) DOMElements.chatWindow.style.backgroundImage = `url('${url}')`; },
        setMomentsCover: (url) => { if(DOMElements.momentsHeaderBg) DOMElements.momentsHeaderBg.style.backgroundImage = `url('${url}')`; },

        processData: (newData) => {
            // Processing logic from original script
            Object.assign(state.config, newData.config);

            newData.chatListUpdates.forEach(updatedChat => {
                let existingChat = state.chatList.find(c => c.id === updatedChat.id);
                if (existingChat) {
                    // ... merge logic
                } else {
                    // ... new chat logic, including migrating local chats
                }
                if (existingChat && state.avatarOverrides[existingChat.id]) {
                    existingChat.avatar = state.avatarOverrides[existingChat.id];
                }
            });

            for (const id in newData.chatLogs) {
                // ... message merging logic
            }
            state.momentsLog.push(...newData.momentsLog);
            newData.contacts.forEach(c => { if (!state.contacts.some(ec => ec.name === c.name)) state.contacts.push(c); });
            if(newData.friendRequests.length > 0) { state.friendRequests.push(...newData.friendRequests); _deps.showIslandNotification('<i class="fas fa-user-plus"></i>', '收到新的好友申请'); }
            state.contactMap = {};
            state.contacts.forEach(c => state.contactMap[c.name] = c);
        },

        fullRender: () => {
             // All renderXXX() functions from original... e.g.:
             renderChatList();
             renderContacts();
             //... etc
        },

        isChatWindowActive: () => DOMElements.chatWindow.classList.contains('active') && currentChat,

        refreshCurrentChatWindow: () => {
             const chatStillExists = state.chatList.find(c => c.id === currentChat.id);
             if (chatStillExists) {
                // renderChatWindow(currentChat.id);
             } else {
                 _deps.navigateTo('wechat-app');
             }
        },

        applySettingChange: (key, newValue, renderFn) => {
            if(newValue === null || newValue === '' || newValue === state.config[key]) return;
            state.config[key] = newValue;
            const keyMap = {'user_name':'昵称', 'user_avatar':'头像', 'home_wallpaper':'主页壁纸', 'chat_wallpaper':'聊天背景', 'moments_cover':'朋友圈封面', 'moments_signature': '个性签名'};
            _deps.queueCommand(`[我将我的${keyMap[key] || key}更新为：“${newValue}”]`);
            _deps.saveState();
            renderFn();
        },

        addEventListeners: () => {
            // Event delegation for all wechat-specific interactions
            DOMElements.phone.addEventListener('click', e => {
                 const C = s => e.target.closest(s);
                 let target;

                 if (target = C('.back-button')) { e.preventDefault(); target.dataset.action === 'go-home' ? _deps.goHome() : _deps.navigateBack(); }
                 else if (target = C('.nav-link')) { e.preventDefault(); _deps.navigateTo(target.dataset.targetView); }
                 else if (target = C('.chat-list-item')) { e.preventDefault(); _deps.navigateTo('chat-window-view', { chatId: target.dataset.chatId }); }
                 // ... all other event listeners from original script, adapted to use dependencies
            });

            // Listen to navigation events to update internal state
            document.body.addEventListener('phone-navigate', (e) => {
                const { to, data } = e.detail;
                if (to === 'chat-window-view') {
                    const chatToClear = state.chatList.find(c => c.id === data.chatId);
                    if (chatToClear && chatToClear.unread > 0) {
                        chatToClear.unread = 0;
                        _deps.saveState();
                        renderChatList();
                    }
                    currentChat = state.chatList.find(c => c.id === data.chatId);
                    DOMElements.chatWindowTitle.textContent = currentChat.name;
                    // renderChatWindow(data.chatId);
                }
            });
             document.body.addEventListener('phone-navigate-back', (e) => {
                const { to, data } = e.detail;
                if (to === 'chat-window-view') { currentChat = data; DOMElements.chatWindowTitle.textContent = currentChat?.name || ''; }
                else { currentChat = null; }
            });
            document.body.addEventListener('phone-go-home', () => { currentChat = null; });
        }
    };
    // Due to the complexity and length, the full implementation of render functions and event handlers
    // has been omitted, but they would be moved from the original script into this module,
    // using `state`, `DOMElements`, and `_deps` as needed.
    return self;
})();
