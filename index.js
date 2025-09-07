// index.js

(function () {
    // 防止重复初始化
    if (window.isPhoneUiExtInitialized) {
        console.log("Phone UI Extension already initialized. Halting.");
        return;
    }
    window.isPhoneUiExtInitialized = true;

    // 模块导入
    const utils = window.phoneUiUtils;
    const commandQueue = window.phoneUiCommandQueue;
    const wechat = window.phoneUiWechat;
    const weather = window.phoneUiWeather;
    const boliBite = window.phoneUiBoliBite;
    const campusCard = window.phoneUiCampusCard;

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
            // ... 其他模块会在各自的init中初始化自己的DOM元素
        });
        // 将核心DOM元素传递给需要的模块
        wechat.setDomElements(DOMElements);
        commandQueue.setDomElements(DOMElements);
    }

    function loadState() {
        try {
            const savedData = localStorage.getItem(utils.STORAGE_KEY_STATE);
            if (savedData) {
                const data = JSON.parse(savedData);
                if (data.state?.config) {
                    state = data.state;
                    STICKERS = data.STICKERS || {};
                    if (data.weatherData) weather.setInitialData(data.weatherData);
                    if (data.boliBiteState) boliBite.setInitialState(data.boliBiteState);
                    if (data.boliCampusCardState) campusCard.setInitialState(data.boliCampusCardState);
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
                weatherData: weather.getData(),
                boliBiteState: boliBite.getState(),
                boliCampusCardState: campusCard.getState(),
            };
            localStorage.setItem(utils.STORAGE_KEY_STATE, JSON.stringify(fullState));
        } catch (e) {
            console.error("Error saving state to localStorage:", e);
        }
    }

    function processNewData() {
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
        fullRender();

        if (wechat.isChatWindowActive()) {
            wechat.refreshCurrentChatWindow();
        }
    }

    function fullRender() {
        // 主屏幕和聊天背景
        DOMElements.homeScreen.style.backgroundImage = `url('${state.config.home_wallpaper}')`;
        wechat.setChatWallpaper(state.config.chat_wallpaper);
        wechat.setMomentsCover(state.config.moments_cover)

        // 渲染各个模块
        wechat.fullRender();
        weather.render();
        boliBite.updateCartBadge();
        campusCard.render();
    }

    function setupEventListeners() {
        // App图标和核心导航
        DOMElements.phone.addEventListener('click', e => {
            const C = s => e.target.closest(s);
            let target;

            // 委托给模块处理的事件
            if (C('.wechat-related-class') || C('#wechat-app')) { // 示例，实际应更精确
                 // wechat.handleEvent(e); // 模块可以暴露一个顶级事件处理器
                 return; // 或者在wechat的init中自己添加
            }
             if (C('#boli-bite-app') || C('#boli-campus-card-app')) {
                 return; // 这两个app已经在自己模块里处理了事件
            }

            // 主框架导航事件
            if (target = C('#weather-widget')) {
                utils.navigateTo('weather-app-view');
            } else if (target = C('.app-icon')) {
                e.preventDefault();
                utils.navigateTo(target.dataset.app);
            }
            // ... 其他主框架级事件
        });

        // 数据源监听
        const observer = new MutationObserver(processNewData);
        observer.observe(DOMElements.sourceData, { childList: true, characterData: true, subtree: true });

        // 设置页面的监听
        document.getElementById('setting_clear_storage')?.addEventListener('click', () => {
            if (confirm("【警告】确定要清除所有本地数据吗？此操作不可恢复。")) {
                localStorage.removeItem(utils.STORAGE_KEY_STATE);
                localStorage.removeItem(utils.STORAGE_KEY_MESSAGES);
                // 重置各模块状态
                campusCard.resetState();
                location.reload();
            }
        });

        const settingsMap = {
            'setting_chat_wallpaper': { l: '聊天背景', k: 'chat_wallpaper' },
            'setting_home_wallpaper': { l: '主页壁纸', k: 'home_wallpaper' },
            'setting_moments_cover': { l: '朋友圈封面', k: 'moments_cover' },
            'setting_user_avatar': { l: '我的头像', k: 'user_avatar' },
            'setting_user_name': { l: '我的昵称', k: 'user_name' },
            'setting_moments_signature': { l: '个性签名', k: 'moments_signature' }
        };
        Object.entries(settingsMap).forEach(([id, { l, k }]) => {
            document.getElementById(id)?.addEventListener('click', () => {
                const nV = prompt(`输入新的${l}:`, state.config[k] || '');
                wechat.applySettingChange(k, nV, fullRender);
            });
        });
    }

    function initialize() {
        initializeDomElements();

        const hasLocalData = loadState();
        if (!hasLocalData || !state.config) {
            state = { config: {}, chatList: [], chatLogs: {}, momentsLog: [], contacts: [], contactMap: {}, friendRequests: [], handledRequestIds: [], avatarOverrides: {}, lastProcessedSource: null };
        }
        // 确保state结构完整
        ['chatList', 'momentsLog', 'contacts', 'friendRequests', 'handledRequestIds'].forEach(key => { if (!state[key] || !Array.isArray(state[key])) state[key] = []; });
        ['chatLogs', 'contactMap', 'avatarOverrides'].forEach(key => { if (!state[key] || typeof state[key] !== 'object' || state[key] === null) state[key] = {}; });

        // 初始化全局工具和状态
        utils.init(DOMElements, state);

        // 依次初始化各个模块，并传入必要的依赖
        commandQueue.init(utils.sendCommandToAI);
        weather.init(utils.navigateTo);
        campusCard.init({ navigateTo: utils.navigateTo, queueCommand: commandQueue.queueCommand, showIslandNotification: utils.showIslandNotification });
        boliBite.init({
            navigateTo: utils.navigateTo,
            queueCommand: commandQueue.queueCommand,
            showIslandNotification: utils.showIslandNotification,
            campusCardModule: campusCard // 依赖注入
        });
        wechat.init({
            DOMElements,
            state,
            STICKERS,
            navigateTo: utils.navigateTo,
            navigateBack: utils.navigateBack,
            goHome: utils.goHome,
            queueCommand: commandQueue.queueCommand,
            showIslandNotification: utils.showIslandNotification,
            saveState,
        });

        // 绑定顶层事件监听器
        setupEventListeners();

        // 初始渲染
        fullRender();
        utils.goHome();
        commandQueue.updateUI();

        // 首次数据处理
        processNewData();
        console.log("Phone UI Extension Initialized Successfully.");
    }

    // 等待所有模块加载完毕后执行
    setTimeout(initialize, 100);

})();
