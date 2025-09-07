// modules/weather.js
window.phoneUiWeather = (function() {
    let _navigateTo;
    let DOM = {};
    let weatherData = { city: "未设置", temp: 0, condition: "未知", hi: 0, lo: 0, conditionClass: '' };

    // Constants
    const weatherMapping = { '晴':{class:'sunny',icon:'fas fa-sun',img:'https://files.catbox.moe/3sotss.jpeg'}, '夜':{class:'clear-night',icon:'fas fa-moon',img:'https://files.catbox.moe/71xfld.jpeg'}, '日落':{class:'sunset',icon:'fas fa-cloud-sun',img:'https://files.catbox.moe/6i3tfo.jpeg'}, '多云':{class:'cloudy',icon:'fas fa-cloud',img:'https://files.catbox.moe/rijvtl.jpeg'}, '阴':{class:'cloudy',icon:'fas fa-cloud',img:'https://files.catbox.moe/rijvtl.jpeg'}, '小雨':{class:'rainy',icon:'fas fa-cloud-showers-heavy',img:'https://files.catbox.moe/oc32cc.jpeg'}, '中雨':{class:'rainy',icon:'fas fa-cloud-showers-heavy',img:'https://files.catbox.moe/oc32cc.jpeg'}, '大雨':{class:'heavy-rain',icon:'fas fa-bolt',img:'https://files.catbox.moe/7y2hhz.jpeg'}, '暴雨':{class:'heavy-rain',icon:'fas fa-bolt',img:'https://files.catbox.moe/7y2hhz.jpeg'}, '雷雨':{class:'thunderstorm',icon:'fas fa-bolt',img:'https://files.catbox.moe/cqibuw.jpeg'}, '下雪':{class:'snowy',icon:'fas fa-snowflake',img:'https://files.catbox.moe/fsnqoy.jpeg'}, '雪':{class:'snowy',icon:'fas fa-snowflake',img:'https://files.catbox.moe/fsnqoy.jpeg'}, };
    const weatherTransitions = ['晴', '多云', '阴', '小雨', '晴'];

    // Private functions
    function _generateHourlyForecast(currentTemp, condition) {
        if (!DOM.hourlyScroll) return;
        DOM.hourlyScroll.innerHTML = '';
        let temp = currentTemp;
        let hourlyCondition = condition;
        const currentHour = new Date().getHours();
        for (let i = 0; i < 24; i++) {
            const hourItem = document.createElement('div');
            hourItem.className = 'hourly-item';
            const time = i === 0 ? '现在' : `${(currentHour + i) % 24}时`;
            if (i > 0) temp += (Math.random() - 0.5) * 2;
            if (i > 0 && Math.random() < 0.25) hourlyCondition = weatherTransitions[Math.floor(Math.random() * weatherTransitions.length)];
            const futureHour = (currentHour + i) % 24;
            const isDaytime = futureHour >= 6 && futureHour < 19;
            let mapping = (hourlyCondition === '晴') ? (isDaytime ? weatherMapping['晴'] : weatherMapping['夜']) : (weatherMapping[hourlyCondition] || weatherMapping['多云']);
            hourItem.innerHTML = `<span>${time}</span><i class="${mapping.icon}"></i><span>${Math.round(temp)}°</span>`;
            DOM.hourlyScroll.appendChild(hourItem);
        }
    }

    function _generateDailyForecast(todayHi, todayLo) {
        if (!DOM.dailyContainer) return;
        DOM.dailyContainer.innerHTML = '';
        const days = ['今天', '明天', '后天'];
        for (let i = 0; i < 10; i++) {
            const dayItem = document.createElement('div');
            dayItem.className = 'daily-item';
            let dayName = (i < 3) ? days[i] : `周${'日一二三四五六'[(new Date(Date.now() + i * 86400000)).getDay()]}`;
            const hi = todayHi + Math.round((Math.random() - 0.45) * 6);
            const lo = todayLo + Math.round((Math.random() - 0.45) * 6);
            const avgTemp = (hi + lo) / 2;
            let possibleConditions = (avgTemp <= 5) ? ['雪', '阴', '多云', '晴'] : (avgTemp > 28) ? ['晴', '雷雨', '多云'] : ['晴', '多云', '阴', '小雨', '中雨'];
            const randomCondition = possibleConditions[Math.floor(Math.random() * possibleConditions.length)];
            const mapping = weatherMapping[randomCondition];
            dayItem.innerHTML = `<span>${dayName}</span><i class="${mapping.icon}"></i><span>${Math.max(hi,lo)}° / ${Math.min(hi,lo)}°</span>`;
            DOM.dailyContainer.appendChild(dayItem);
        }
    }

    // Public API
    const self = {
        init: (navigateToFn) => {
            _navigateTo = navigateToFn;
            DOM = {
                widget: document.getElementById('weather-widget'),
                backButton: document.querySelector('#weather-app-view .weather-back-button'),
                widgetBg: document.getElementById('widget-bg-img'),
                widgetCity: document.getElementById('widget-city'),
                widgetTemp: document.getElementById('widget-temp'),
                widgetCondition: document.getElementById('widget-condition'),
                widgetHiLo: document.getElementById('widget-hi-lo'),
                appContainer: document.getElementById('weather-app-container'),
                appCity: document.getElementById('app-city'),
                appTemp: document.getElementById('app-temp'),
                appCondition: document.getElementById('app-condition'),
                appHiLo: document.getElementById('app-hi-lo'),
                hourlyScroll: document.getElementById('hourly-forecast-scroll'),
                dailyContainer: document.getElementById('daily-forecast-container')
            };
            self.addEventListeners();
        },

        addEventListeners: () => {
            DOM.widget.addEventListener('click', () => _navigateTo('weather-app-view'));
            DOM.backButton.addEventListener('click', () => _navigateTo('home-screen'));
        },

        setInitialData: (data) => {
            if(data) self.updateWeatherUI(data);
        },

        getData: () => weatherData,

        updateWeatherUI: (data) => {
            weatherData = data;
            self.render();
        },

        render: () => {
            if(weatherData.city === "未设置") return;
            const mapping = weatherMapping[weatherData.condition] || { class: 'cloudy', icon: 'fas fa-question-circle', img: 'https://files.catbox.moe/rijvtl.jpeg' };
            weatherData.conditionClass = mapping.class;

            // Widget
            DOM.widgetBg.src = mapping.img;
            DOM.widgetBg.style.opacity = '1';
            DOM.widgetCity.textContent = weatherData.city;
            DOM.widgetTemp.textContent = `${weatherData.temp}°`;
            DOM.widgetCondition.textContent = weatherData.condition;
            DOM.widgetHiLo.textContent = `最高:${weatherData.hi}° 最低:${weatherData.lo}°`;

            // App View
            DOM.appContainer.className = '';
            DOM.appContainer.classList.add(weatherData.conditionClass);
            DOM.appCity.textContent = weatherData.city;
            DOM.appTemp.textContent = `${weatherData.temp}°`;
            DOM.appCondition.textContent = weatherData.condition;
            DOM.appHiLo.textContent = `最高: ${weatherData.hi}° 最低: ${weatherData.lo}°`;
            _generateHourlyForecast(weatherData.temp, weatherData.condition);
            _generateDailyForecast(weatherData.hi, weatherData.lo);
        }
    };
    return self;
})();
