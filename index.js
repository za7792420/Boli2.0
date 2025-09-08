// /index.js (版本 3.1.2 - 终极修复版)

(function () {
    if (window.isPhoneUiExtInitialized) { return; }
    window.isPhoneUiExtInitialized = true;

    const DOMElements = {};
    let state = {};
    let STICKERS = {};
    let modules = {}; // 用来存放所有已初始化的模块实例

    // ---- DOM & State Management ----
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
            const savedData = localStorage.getItem(modules.utils.STORAGE_KEY_STATE);
            if (savedData) {
                const data = JSON.parse(savedData);
                if (data.state?.config) {
                    state = data.state;
                    STICKERS = data.STICKERS || {};
                    if (data.weatherData) modules.weather.setInitialData(data.weatherData);
                    if (data.boliBiteState) modules.boliBite.setInitialState(data.boliBiteState);
                    if (data.boliCampusCardState) modules.campusCard.setInitialState(data.boliCampusCardState);
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
                weatherData: modules.weather.getData(),
                boliBiteState: modules.boliBite.getState(),
                boliCampusCardState: modules.campusCard.getState(),
            };
            localStorage.setItem(modules.utils.STORAGE_KEY_STATE, JSON.stringify(fullState));
        } catch (e) {
            console.error("Error saving state to localStorage:", e);
        }
    }

    // ---- Data Processing ----
    function processNewData() {
        let sourceContent = DOMElements.sourceData.textContent;

        const weatherRegex = /\[天气更新: (.*?), (-?\d+), (.*?), (-?\d+)\/(-?\d+)\]\n?/g;
        let weatherMatch;
        while ((weatherMatch = weatherRegex.exec(sourceContent)) !== null) {
            const newData = { city: weatherMatch[1].trim(), temp: parseInt(weatherMatch[2], 10), condition: weatherMatch[3].trim(), hi: parseInt(weatherMatch[4], 10), lo: parseInt(weatherMatch[5], 10) };
            modules.weather.updateWeatherUI(newData);
            DOMElements.sourceData.textContent = DOMElements.sourceData.textContent.replace(weatherMatch[0], '');
        }

        sourceContent = DOMElements.sourceData.textContent.trim();
        if (!sourceContent || sourceContent === state.lastProcessedSource) return;

        const newData = modules.utils.parseSourceData(sourceContent, state);
        if (newData.campusCard) modules.campusCard.updateState(newData.campusCard);
        modules.wechat.processData(newData);

        state.lastProcessedSource = sourceContent;
        saveState();
        fullRender();

        if (modules.wechat.isChatWindowActive()) {
            modules.wechat.refreshCurrentChatWindow();
        }
    }

    // ---- Rendering ----
    function fullRender() {
        DOMElements.homeScreen.style.backgroundImage = `url('${state.config.home_wallpaper}')`;
        modules.wechat.setChatWallpaper(state.config.chat_wallpaper);
        modules.wechat.setMomentsCover(state.config.moments_cover);
        modules.wechat.fullRender();
        modules.weather.render();
        modules.boliBite.updateCartBadge();
        modules.campusCard.render();
    }

    // ---- Event Listeners ----
    function setupEventListeners() {
        DOMElements.phone.addEventListener('click', e => {
            const C = s => e.target.closest(s);
            let target;
            if (C('#boli-bite-app') || C('#boli-campus-card-app') || C('#wechat-app')) {
                return; // Let modules handle their own internal clicks
            }
            if (target = C('#weather-widget')) modules.utils.navigateTo('weather-app-view');
            else if (target = C('.app-icon')) { e.preventDefault(); modules.utils.navigateTo(target.dataset.app); }
        });

        const observer = new MutationObserver(processNewData);
        observer.observe(DOMElements.sourceData, { childList: true, characterData: true, subtree: true });

        document.getElementById('setting_clear_storage')?.addEventListener('click', () => {
            if (confirm("【警告】确定要清除所有本地数据吗？此操作不可恢复。")) {
                localStorage.removeItem(modules.utils.STORAGE_KEY_STATE);
                localStorage.removeItem(modules.utils.STORAGE_KEY_MESSAGES);
                modules.campusCard.resetState();
                location.reload();
            }
        });

        const settingsMap = {
            'setting_chat_wallpaper': { l: '聊天背景', k: 'chat_wallpaper' }, 'setting_home_wallpaper': { l: '主页壁纸', k: 'home_wallpaper' }, 'setting_moments_cover': { l: '朋友圈封面', k: 'moments_cover' },
            'setting_user_avatar': { l: '我的头像', k: 'user_avatar' }, 'setting_user_name': { l: '我的昵称', k: 'user_name' }, 'setting_moments_signature': { l: '个性签名', k: 'moments_signature' }
        };
        Object.entries(settingsMap).forEach(([id, { l, k }]) => {
            document.getElementById(id)?.addEventListener('click', () => {
                const nV = prompt(`输入新的${l}:`, state.config[k] || '');
                modules.wechat.applySettingChange(k, nV, fullRender); // Pass fullRender for redraw
            });
        });
    }

    // --- MAIN INITIALIZATION ---
    function initialize() {
        // 1. Assign raw modules
        modules = {
            utils: window.phoneUiUtils,
            commandQueue: window.phoneUiCommandQueue,
            wechat: window.phoneUiWechat,
            weather: window.phoneUiWeather,
            boliBite: window.phoneUiBoliBite,
            campusCard: window.phoneUiCampusCard
        };

        // 2. Initialize DOM and State
        initializeDomElements();

        // 3. Initialize modules with dependencies
        modules.utils.init(DOMElements, state);
        modules.commandQueue.init({ sendCommandToAI: modules.utils.sendCommandToAI, campusCardModule: modules.campusCard }); // Inject campusCard
        modules.weather.init({ navigateTo: modules.utils.navigateTo });
        modules.campusCard.init({ navigateTo: modules.utils.navigateTo, queueCommand: modules.commandQueue.queueCommand, showIslandNotification: modules.utils.showIslandNotification });
        modules.boliBite.init({ navigateTo: modules.utils.navigateTo, queueCommand: modules.commandQueue.queueCommand, showIslandNotification: modules.utils.showIslandNotification, campusCardModule: modules.campusCard });
        modules.wechat.init({ DOMElements, state, STICKERS, utils: modules.utils, commandQueue: modules.commandQueue, saveState });

        // 4. Load state after modules are ready
        if (!loadState() || !state.config) {
            state = { config: {}, chatList: [], chatLogs: {}, momentsLog: [], contacts: [], contactMap: {}, friendRequests: [], handledRequestIds: [], avatarOverrides: {}, lastProcessedSource: null };
            ['chatList','momentsLog','contacts','friendRequests','handledRequestIds'].forEach(k => { if (!state[k]) state[k] = []; });
            ['chatLogs','contactMap','avatarOverrides'].forEach(k => { if (!state[k]) state[k] = {}; });
        }

        // 5. Setup event listeners and render
        setupEventListeners();
        fullRender();
        modules.utils.goHome();
        modules.commandQueue.updateUI();

        // 6. Initial data processing
        processNewData();
        console.log("Phone UI Extension Initialized Successfully (v.3.1.2)");
    }

    // Delay initialization to ensure all scripts are loaded
    setTimeout(initialize, 200);

})();
