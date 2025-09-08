// index.js (已修复)

(function () {
    // 防止重复初始化
    if (window.isPhoneUiExtInitialized) {
        console.log("Phone UI Extension already initialized. Halting.");
        return;
    }
    window.isPhoneUiExtInitialized = true;

    // --- 变化点：移除了这里的模块变量声明 ---

    // 全局状态和DOM引用
    const DOMElements = {};
    let state = {};
    let STICKERS = {};

    function initializeDomElements() {
        Object.assign(DOMElements, {
            phone: document.querySelector('.phone-container'),
            sourceData: document.getElementById('phone-data-source'),
            dynamicIsland: document.getElementById('dynamic-island'),
            homeScreen: document.getElementById('home-screen'),
            wechatApp: document.getElementById('wechat-app'),
            weatherAppView: document.getElementById('weather-app-view'),
            cqContainer: document.getElementById('cq-container'),
        });
    }

    function loadState() {
        try {
            const savedData = localStorage.getItem(window.phoneUiUtils.STORAGE_KEY_STATE); // 直接使用 window 上的对象
            if (savedData) {
                const data = JSON.parse(savedData);
                if (data.state?.config) {
                    state = data.state;
                    STICKERS = data.STICKERS || {};
                    if (data.weatherData) window.phoneUiWeather.setInitialData(data.weatherData);
                    if (data.boliBiteState) window.phoneUiBoliBite.setInitialState(data.boliBiteState);
                    if (data.boliCampusCardState) window.phoneUiCampusCard.setInitialState(data.boliCampusCardState);
                    return true;
                }
            }
        } catch (e) {
            console.error("Error loading state from localStorage:", e);
        }
        return false;
    }

    function saveState() {
        try {
            const fullState = {
                state,
                STICKERS,
                weatherData: window.phoneUiWeather.getData(),
                boliBiteState: window.phoneUiBoliBite.getState(),
                boliCampusCardState: window.phoneUiCampusCard.getState(),
            };
            localStorage.setItem(window.phoneUiUtils.STORAGE_KEY_STATE, JSON.stringify(fullState));
        } catch (e) {
            console.error("Error saving state to localStorage:", e);
        }
    }

    function processNewData(utils, wechat, weather, campusCard) {
        let sourceContent = DOMElements.sourceData.textContent;

        const weatherRegex = /\[天气更新: (.*?), (-?\d+), (.*?), (-?\d+)\/(-?\d+)\]\n?/g;
        let weatherMatch;
        while ((weatherMatch = weatherRegex.exec(sourceContent)) !== null) {
            const newData = {
                city: weatherMatch[1].trim(),
                temp: parseInt(weatherMatch[2], 10),
                condition: weatherMatch[3].trim(),
                hi: parseInt(weatherMatch[4], 10),
                lo: parseInt(weatherMatch[5], 10)
            };
            weather.updateWeatherUI(newData);
            DOMElements.sourceData.textContent = DOMElements.sourceData.textContent.replace(weatherMatch[0], '');
        }

        sourceContent = DOMElements.sourceData.textContent.trim();
        if (!sourceContent || sourceContent === state.lastProcessedSource) {
            return;
        }

        const newData = utils.parseSourceData(sourceContent, state);

        if (newData.campusCard && Object.keys(newData.campusCard).length > 0) {
            campusCard.updateState(newData.campusCard);
        }

        wechat.processData(newData);

        state.lastProcessedSource = sourceContent;
        saveState();
        wechat.fullRender(); // fullRender now managed by wechat module mostly
        weather.render();
        window.phoneUiBoliBite.updateCartBadge();
        campusCard.render();


        if (wechat.isChatWindowActive()) {
            wechat.refreshCurrentChatWindow();
        }
    }

    function setupEventListeners(utils, wechat, settingsMap) {
        DOMElements.phone.addEventListener('click', e => {
            const C = s => e.target.closest(s);
            let target;

            if (C('#boli-bite-app') || C('#boli-campus-card-app')) {
                 return;
            }

            if (target = C('#weather-widget')) { utils.navigateTo('weather-app-view'); }
            else if (target = C('.app-icon')) { e.preventDefault(); utils.navigateTo(target.dataset.app); }
        });


        document.getElementById('setting_clear_storage')?.addEventListener('click', () => {
            if (confirm("【警告】确定要清除所有本地数据吗？此操作不可恢复。")) {
                localStorage.removeItem(window.phoneUiUtils.STORAGE_KEY_STATE);
                localStorage.removeItem(window.phoneUiUtils.STORAGE_KEY_MESSAGES);
                window.phoneUiCampusCard.resetState();
                location.reload();
            }
        });

        Object.entries(settingsMap).forEach(([id, { l, k }]) => {
            document.getElementById(id)?.addEventListener('click', () => {
                const nV = prompt(`输入新的${l}:`, state.config[k] || '');
                wechat.applySettingChange(k, nV, () => {
                     DOMElements.homeScreen.style.backgroundImage = `url('${state.config.home_wallpaper}')`;
                     wechat.setChatWallpaper(state.config.chat_wallpaper);
                     wechat.setMomentsCover(state.config.moments_cover);
                });
            });
        });
    }

    function initialize() {
        // --- 变化点：把模块变量声明移到这里 ---
        const utils = window.phoneUiUtils;
        const commandQueue = window.phoneUiCommandQueue;
        const wechat = window.phoneUiWechat;
        const weather = window.phoneUiWeather;
        const boliBite = window.phoneUiBoliBite;
        const campusCard = window.phoneUiCampusCard;

        initializeDomElements();

        const hasLocalData = loadState();
        if (!hasLocalData || !state.config) {
            state = { config: {}, chatList: [], chatLogs: {}, momentsLog: [], contacts: [], contactMap: {}, friendRequests: [], handledRequestIds: [], avatarOverrides: {}, lastProcessedSource: null };
        }
        ['chatList', 'momentsLog', 'contacts', 'friendRequests', 'handledRequestIds'].forEach(key => { if (!state[key] || !Array.isArray(state[key])) state[key] = []; });
        ['chatLogs', 'contactMap', 'avatarOverrides'].forEach(key => { if (!state[key] || typeof state[key] !== 'object' || state[key] === null) state[key] = {}; });

        utils.init(DOMElements, state);
        commandQueue.init(utils.sendCommandToAI);
        weather.init(utils.navigateTo);
        campusCard.init({ navigateTo: utils.navigateTo, queueCommand: commandQueue.queueCommand, showIslandNotification: utils.showIslandNotification });
        boliBite.init({ navigateTo: utils.navigateTo, queueCommand: commandQueue.queueCommand, showIslandNotification: utils.showIslandNotification, campusCardModule: campusCard });
        wechat.init({ DOMElements, state, STICKERS, navigateTo: utils.navigateTo, navigateBack: utils.navigateBack, goHome: utils.goHome, queueCommand: commandQueue.queueCommand, showIslandNotification: utils.showIslandNotification, saveState });

        // 将模块传递给需要它们的函数
        const observer = new MutationObserver(() => processNewData(utils, wechat, weather, campusCard));
        observer.observe(DOMElements.sourceData, { childList: true, characterData: true, subtree: true });

        const settingsMap = {
            'setting_chat_wallpaper': { l: '聊天背景', k: 'chat_wallpaper' },
            'setting_home_wallpaper': { l: '主页壁纸', k: 'home_wallpaper' },
            'setting_moments_cover': { l: '朋友圈封面', k: 'moments_cover' },
            'setting_user_avatar': { l: '我的头像', k: 'user_avatar' },
            'setting_user_name': { l: '我的昵称', k: 'user_name' },
            'setting_moments_signature': { l: '个性签名', k: 'moments_signature' }
        };

        setupEventListeners(utils, wechat, settingsMap);

        // 初始渲染
        DOMElements.homeScreen.style.backgroundImage = `url('${state.config.home_wallpaper}')`;
        wechat.setChatWallpaper(state.config.chat_wallpaper);
        wechat.setMomentsCover(state.config.moments_cover)
        wechat.fullRender();
        weather.render();
        boliBite.updateCartBadge();
        campusCard.render();
        utils.goHome();
        commandQueue.updateUI();

        processNewData(utils, wechat, weather, campusCard);
        console.log("Phone UI Extension Initialized Successfully.");
    }

    setTimeout(initialize, 150); // 稍微增加延迟以确保所有环境都准备好

})();
