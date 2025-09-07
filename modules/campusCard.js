// modules/campusCard.js
window.phoneUiCampusCard = (function() {
    const STORAGE_KEY = 'st_phone_ui_v19_campus_card';
    let DOM = {};
    let state = {
        name: '未认证', id: 'N/A', type: '学生', school: '博理公学', balance: 0.00,
        avatar: '', age: '',
        grade: '', college: '',
        position: '', department: ''
    };
    let _dependencies = {}; // { navigateTo, queueCommand, showIslandNotification }

    function loadState() {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) state = { ...state, ...JSON.parse(savedState) };
        } catch (e) { console.error("Error loading Campus Card state:", e); saveState(); }
    }

    function saveState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (e) { console.error("Error saving Campus Card state:", e); }
    }

    const self = {
        init: (dependencies) => {
            _dependencies = dependencies;
            DOM = {
                app: document.querySelector('#boli-campus-card-app'),
                backButton: document.querySelector('#boli-campus-card-app .back-button'),
                schoolName: document.getElementById('bcc-school-name'),
                cardType: document.getElementById('bcc-card-type'),
                balance: document.getElementById('bcc-balance'),
                personName: document.getElementById('bcc-person-name'),
                personId: document.getElementById('bcc-person-id'),
                editBtn: document.getElementById('bcc-edit-btn'),
                idAvatar: document.getElementById('bcc-id-avatar'),
                idName: document.getElementById('bcc-id-name'),
                idAge: document.getElementById('bcc-id-age'),
                idDetails: document.getElementById('bcc-id-details'),
                showQrBtn: document.getElementById('bcc-show-qr-btn'),
                qrModal: document.getElementById('bcc-qr-modal'),
            };
            loadState();
            self.addEventListeners();
            self.render();
        },

        setInitialState: (savedState) => {
            if (savedState) state = { ...state, ...savedState };
        },

        getState: () => state,

        updateState: (newState) => {
            Object.assign(state, newState);
            saveState();
            self.render();
        },

        resetState: () => {
          state.balance = 0;
          saveState();
        },

        render: () => {
            if(!DOM.schoolName) return;
            DOM.schoolName.textContent = state.school;
            DOM.cardType.textContent = state.type ? `${state.type}卡` : '校园卡';
            DOM.balance.textContent = state.balance.toFixed(2);
            DOM.personName.textContent = state.name;
            DOM.personId.textContent = `ID: ${state.id}`;
            DOM.idAvatar.style.backgroundImage = state.avatar ? `url('${state.avatar}')` : 'none';
            DOM.idName.textContent = state.name;
            DOM.idAge.textContent = state.age ? `${state.age}岁` : '';
            let detailsHtml = '';
            if (state.type === '学生') {
                detailsHtml += `<div class="id-row"><span class="label">年级:</span><span class="value">${state.grade || 'N/A'}</span></div>`;
                detailsHtml += `<div class="id-row"><span class="label">住宿院区:</span><span class="value">${state.college || 'N/A'}</span></div>`;
            } else if (state.type === '教职工') {
                detailsHtml += `<div class="id-row"><span class="label">职位:</span><span class="value">${state.position || 'N/A'}</span></div>`;
                detailsHtml += `<div class="id-row"><span class="label">所属部门:</span><span class="value">${state.department || 'N/A'}</span></div>`;
            }
            DOM.idDetails.innerHTML = detailsHtml;

            // Trigger event for BoliBite to update its balance display
             const event = new CustomEvent('campus-card-balance-update', { detail: { balance: state.balance }});
             document.dispatchEvent(event);
        },

        addEventListeners() {
            DOM.backButton.addEventListener('click', (e) => { e.stopPropagation(); _dependencies.navigateTo('home-screen'); });
            DOM.editBtn.addEventListener('click', () => self.handleEdit());
            DOM.app.addEventListener('click', e => {
                const paymentOption = e.target.closest('.payment-option');
                if(paymentOption){ self.handleRecharge(paymentOption.dataset.channel); }
            });
            DOM.showQrBtn.addEventListener('click', () => { DOM.qrModal.classList.add('visible'); });
            DOM.qrModal.addEventListener('click', () => { DOM.qrModal.classList.remove('visible'); });
        },

        handleEdit() {
            const type = prompt("请更新您的身份 (学生/教职工):", state.type);
            if (type !== '学生' && type !== '教职工') { alert("身份认证失败，请输入“学生”或“教职工”。"); return; }
            state.type = type;
            state.name = prompt("姓名:", state.name) || '未认证';
            state.id = prompt("学号/工号:", state.id) || 'N/A';
            state.avatar = prompt("头像URL:", state.avatar) || '';
            state.age = prompt("年龄:", state.age) || '';
            if (type === '学生') {
                state.grade = prompt("年级 (例如: G10 / G11 / G12):", state.grade);
                state.college = prompt("住宿院区 (1-12院区):", state.college);
                state.position = ''; state.department = '';
            } else {
                state.position = prompt("职位 (例如: 教师 / 行政):", state.position);
                state.department = prompt("所属部门:", state.department);
                state.grade = ''; state.college = '';
            }
            saveState();
            self.render();
            _dependencies.queueCommand(`[我更新了“一卡通”的身份信息。身份：${type}，姓名：${state.name}]`);
            _dependencies.showIslandNotification('<i class="fas fa-check"></i>', '身份信息已更新');
        },

        handleRecharge(channel) {
            const amountStr = prompt(`通过 [${channel.toUpperCase()}] 充值，请输入金额:`, "100");
            if (!amountStr) return;
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) { alert("请输入有效的充值金额。"); return; }
            state.balance += amount;
            saveState();
            self.render();
            _dependencies.queueCommand(`[我通过“一卡通”App使用${channel}为校园卡充值 ¥${amount.toFixed(2)}]`);
            _dependencies.showIslandNotification('<i class="fas fa-wallet"></i>', `充值 ¥${amount.toFixed(2)} 成功`);
        },

        updateBalance(amount) {
            state.balance += amount; // Can be positive (refund) or negative (deduction)
            saveState();
            self.render();
            return true;
        }
    };
    return self;
})();
