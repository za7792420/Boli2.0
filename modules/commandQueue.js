// modules/commandQueue.js
window.phoneUiCommandQueue = (function() {
    let commandQueue = [];
    let _sendCommandToAI; // Injected dependency
    let DOM = {};
    const boliBite = window.phoneUiBoliBite; //dependency
    const campusCard = window.phoneUiCampusCard; //dependency

    const self = {
        setDomElements: (doms) => {
            DOM.cqContainer = doms.cqContainer;
            DOM.cqFab = document.getElementById('cq-fab');
            DOM.cqBadge = document.getElementById('cq-badge');
            DOM.cqList = document.getElementById('cq-list');
            DOM.cqSendBtn = document.getElementById('cq-send-btn');
            DOM.cqClearBtn = document.getElementById('cq-clear-btn');
        },

        init: (sendCommandFn) => {
            _sendCommandToAI = sendCommandFn;
            self.setDomElements({ cqContainer: document.getElementById('cq-container') }); // Basic self-init
            self.addEventListeners();
            self.updateUI();
        },

        queueCommand: (cmd) => {
            commandQueue.push(cmd);
            self.updateUI();
        },

        updateUI: () => {
            DOM.cqList.innerHTML = commandQueue.map(cmd => `<li class="cq-list-item">${cmd.replace(/\n/g, ' ')}</li>`).join('') || '<li class="cq-list-item" style="border:none;text-align:center;color:#888;">暂无指令</li>';
            DOM.cqBadge.textContent = commandQueue.length;
            DOM.cqContainer.style.display = commandQueue.length > 0 ? 'block' : 'none';
            DOM.cqBadge.style.display = commandQueue.length > 0 ? 'grid' : 'none';
            DOM.cqList.scrollTop = DOM.cqList.scrollHeight;
        },

        addEventListeners: () => {
             DOM.cqSendBtn.addEventListener('click', () => {
                if (commandQueue.length === 0) return;

                let totalDeduction = 0;
                const descriptiveCommands = [];
                const paymentRegex = /\[CMD_PAY:(\d+\.?\d*)\]\s*/;

                commandQueue.forEach(cmd => {
                    const match = cmd.match(paymentRegex);
                    if (match) {
                        totalDeduction += parseFloat(match[1]);
                        descriptiveCommands.push(cmd.replace(paymentRegex, ''));
                    } else {
                        descriptiveCommands.push(cmd);
                    }
                });

                if (totalDeduction > 0) {
                    campusCard.updateBalance(-totalDeduction);
                }

                if (descriptiveCommands.length > 0) {
                     _sendCommandToAI(descriptiveCommands.join('\n'));
                }

                commandQueue.length = 0;
                self.updateUI();
                DOM.cqContainer.classList.remove('expanded');
            });

            DOM.cqClearBtn.addEventListener('click', () => { if(commandQueue.length > 0 && confirm(`清空 ${commandQueue.length} 条待发送指令？`)){ commandQueue.length = 0; self.updateUI(); DOM.cqContainer.classList.remove('expanded');}});

            let isDragging=false, hasDragged=false, oX, oY;
            const fab = DOM.cqContainer;
            const startDrag=(e)=>{isDragging=true;hasDragged=false;fab.classList.add('dragging');const ev=e.touches?e.touches[0]:e;oX=ev.clientX-fab.offsetLeft;oY=ev.clientY-fab.offsetTop;};
            const drag=(e)=>{if(!isDragging)return;hasDragged=true;e.preventDefault();const ev=e.touches?e.touches[0]:e;let nX=ev.clientX-oX,nY=ev.clientY-oY;const b=document.body.getBoundingClientRect();fab.style.left=`${Math.max(0,Math.min(nX,b.width-fab.offsetWidth))}px`;fab.style.top=`${Math.max(0,Math.min(nY,b.height-fab.offsetHeight))}px`;fab.style.right='auto';fab.style.transform='none';};
            const endDrag=()=>{isDragging=false;fab.classList.remove('dragging');};
            fab.addEventListener('mousedown',startDrag);fab.addEventListener('touchstart',startDrag,{passive:false});
            document.addEventListener('mousemove',drag);document.addEventListener('touchmove',drag,{passive:false});
            document.addEventListener('mouseup',endDrag);document.addEventListener('touchend',endDrag);

            DOM.cqFab.addEventListener('click', () => { if(!hasDragged) DOM.cqContainer.classList.toggle('expanded'); });
            document.addEventListener('click', (e) => { if (DOM.cqContainer.classList.contains('expanded') && !e.target.closest('#cq-container')) { DOM.cqContainer.classList.remove('expanded'); }});
        }
    };
    return self;
})();
