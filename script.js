// =========================================================================
// 🎰 VIP 슬롯머신 통합 로직 (관제실 명령 100% 수신 완료 버전)
// =========================================================================

// 👇👇👇 여기에 부장님 노트북의 IP 주소를 적어주세요! 👇👇👇
const SERVER_URL = "http://10.137.194.178:5000"; // <-- 반드시 실제 IP로 변경!
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

const machineId = typeof MY_MACHINE_ID !== 'undefined' ? MY_MACHINE_ID : 'slot_4';

const config = { '🍒': 2, '🍋': 3, '🍉': 5, '🔔': 10, '💎': 20, '7️⃣': 50 };
const symbols = Object.keys(config);
const OPERATOR_CODES = ['1004', '2004', '3004', '7777'];

let balance = 1000;      
let currentBet = 100;    
let isSpinning = false;
let isGameOver = false;
let localCheatMode = null; 

// 📡 1. 관제실 보고 기능
async function reportStatus() {
    let statusText = "대기중";
    if (isSpinning) statusText = "회전중...";
    if (isGameOver) statusText = "게임 종료";

    const currentReels = [
        document.getElementById('reel1')?.innerText.trim() || '-',
        document.getElementById('reel2')?.innerText.trim() || '-',
        document.getElementById('reel3')?.innerText.trim() || '-'
    ];

    try {
        await fetch(`${SERVER_URL}/api/report/${machineId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                balance: balance, 
                status: statusText, 
                reels: currentReels 
            })
        });
    } catch (e) { 
        console.log("관제실 연결 실패"); 
    }
}

function updateUI() {
    const balanceElem = document.getElementById('balance-display');
    const betInput = document.getElementById('bet-input');
    
    if (balanceElem) balanceElem.innerText = balance.toLocaleString();
    if (betInput) currentBet = parseInt(betInput.value) || 100;
    
    reportStatus(); 
}

function init() {
    const reels = [
        document.getElementById('reel1'), 
        document.getElementById('reel2'), 
        document.getElementById('reel3')
    ];
    reels.forEach(reel => { 
        if(reel) reel.innerHTML = `<li class="symbol">7️⃣</li>`; 
    });
    
    updateUI();

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') { localCheatMode = 'win_cherry'; setStealthLight('#e91e63', 'transparent'); }
        if (e.key === '2') { localCheatMode = 'lose'; setStealthLight('#f44336', 'transparent'); }
        if (e.key === '3') { localCheatMode = 'jackpot'; setStealthLight('var(--gold)', 'transparent'); }
    });
}

function startGame() {
    const startBalanceInput = document.getElementById('start-balance');
    if (startBalanceInput) balance = parseInt(startBalanceInput.value) || 1000;

    const entryScreen = document.getElementById('entry-screen');
    const gameScreen = document.getElementById('game-screen');
    
    if (entryScreen) { entryScreen.classList.remove('active'); entryScreen.style.display = 'none'; }
    if (gameScreen) { gameScreen.classList.add('active'); gameScreen.style.display = 'block'; }

    isGameOver = false;
    showMessage('VIP 슬롯머신에 오신 것을 환영합니다.', '#fff');
    updateUI();
}

function showMessage(msg, color = '#fff') {
    const msgElem = document.getElementById('message-board');
    if (msgElem) { msgElem.innerText = msg; msgElem.style.color = color; }
}

function setStealthLight(color1, color2) {
    const light = document.getElementById('stealth-light');
    if (light) { light.style.background = color1; light.style.boxShadow = `0 0 10px ${color1}`; }
}

// 🎰 3. 슬롯머신 구동 로직 (이제 혼자 주사위를 굴리지 않고 서버 명령을 받습니다!)
async function spin() {
    updateUI(); 
    if (isSpinning || isGameOver) return;
    if (balance < currentBet) {
        showMessage('잔액이 부족합니다.', '#ff6b6b'); return;
    }

    isSpinning = true;
    balance -= currentBet;
    updateUI();
    showMessage('슬롯이 맹렬하게 돌아갑니다!', '#fdf0a6');
    
    const spinBtn = document.getElementById('spin-btn');
    const quitBtn = document.getElementById('quit-btn');
    if (spinBtn) spinBtn.disabled = true;
    if (quitBtn) quitBtn.disabled = true;
    
    const handleBox = document.getElementById('handle-container');
    if (handleBox) {
        handleBox.classList.add('pulling');
        setTimeout(() => handleBox.classList.remove('pulling'), 500);
    }

    const reels = [
        document.getElementById('reel1'), 
        document.getElementById('reel2'), 
        document.getElementById('reel3')
    ];
    reels.forEach(reel => { if (reel) reel.classList.add('spinning'); });
    
    let reelStopped = [false, false, false];

    const spinInterval = setInterval(() => {
        reels.forEach((reel, index) => {
            if (reel && !reelStopped[index]) {
                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                reel.innerHTML = `<li class="symbol">${randomSymbol}</li>`;
            }
        });
    }, 80); 

    try {
        let finalResults, appliedMode;

        // 1순위: 오프라인 키보드 조작
        if (localCheatMode) {
            appliedMode = localCheatMode;
            if (appliedMode === 'jackpot') finalResults = [5, 5, 5];
            else if (appliedMode === 'lose') finalResults = [0, 1, 2];
            else if (appliedMode === 'win_cherry') finalResults = [0, 0, 0];
            localCheatMode = null; 
        } 
        // 🌟 2순위: 서버(관제실)에 결과 요청 (여기가 수정된 핵심 포인트!)
        else {
            const response = await fetch(`${SERVER_URL}/api/spin/${machineId}`);
            const data = await response.json();
            finalResults = data.results; 
            appliedMode = data.mode;
        }

        // 스텔스 조명 피드백
        if (appliedMode === 'jackpot') setStealthLight('var(--gold)', 'transparent');
        else if (appliedMode === 'lose') setStealthLight('#ff6b6b', 'transparent');
        else if (appliedMode === 'tease') setStealthLight('#ff9800', 'transparent');
        else setStealthLight('transparent', 'transparent');

        // 순차 정지 및 보고
        setTimeout(() => {
            reelStopped[0] = true; 
            if (reels[0]) { reels[0].classList.remove('spinning'); reels[0].innerHTML = `<li class="symbol">${symbols[finalResults[0]]}</li>`; }
            reportStatus();
        }, 1000);

        setTimeout(() => {
            reelStopped[1] = true; 
            if (reels[1]) { reels[1].classList.remove('spinning'); reels[1].innerHTML = `<li class="symbol">${symbols[finalResults[1]]}</li>`; }
            reportStatus();
        }, 1500);

        setTimeout(() => {
            reelStopped[2] = true; 
            if (reels[2]) { reels[2].classList.remove('spinning'); reels[2].innerHTML = `<li class="symbol">${symbols[finalResults[2]]}</li>`; }
            reportStatus();
        }, 2000);

        setTimeout(() => {
            clearInterval(spinInterval);
            checkResult(finalResults, currentBet);
        }, 2500);

    } catch (error) {
        clearInterval(spinInterval);
        reels.forEach(reel => { if(reel) reel.classList.remove('spinning'); });
        showMessage('서버 통신 오류. 진행요원에게 문의하세요.', '#ff6b6b');
        isSpinning = false;
        if (spinBtn) spinBtn.disabled = false;
        if (quitBtn) quitBtn.disabled = false;
        reportStatus();
    }
}

function checkResult(results, bet) {
    if (results[0] === results[1] && results[1] === results[2]) {
        const symbol = symbols[results[0]];
        const winAmount = Math.floor(bet * config[symbol]);
        balance += winAmount;
        showMessage(`🎉 당첨! +${winAmount.toLocaleString()} PT (${symbol})`, 'var(--gold)');
        updateUI();
        isGameOver = true; 
        setTimeout(() => endGame(false), 2500);
    } else {
        showMessage('아쉽습니다. 다음 기회에 도전하십시오.', '#888');
        updateUI();
        
        if (balance <= 0) {
            showMessage('잔액이 모두 소진되었습니다. 게임을 종료합니다.', '#ff6b6b');
            isGameOver = true; 
            setTimeout(() => endGame(false), 2500);
            return; 
        }
        
        isSpinning = false;
        setStealthLight('transparent', 'transparent');
        const spinBtn = document.getElementById('spin-btn');
        const quitBtn = document.getElementById('quit-btn');
        if (spinBtn) spinBtn.disabled = false;
        if (quitBtn) quitBtn.disabled = false;
    }
}

function endGame(isManualQuit) {
    isGameOver = true;
    updateUI(); 
    let finalMessage = isManualQuit ? "게임을 종료하고 정산합니다." : "게임이 종료되었습니다.";
    
    const overlay = document.createElement('div');
    overlay.id = 'end-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); backdrop-filter:blur(10px); display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:9999; color:#fff;';

    overlay.innerHTML = `
        <h1 style="color: ${balance > 0 ? 'gold' : '#ff6b6b'}; font-size: 3rem; margin-bottom: 20px;">
            ${balance > 0 ? '💰 정산 완료 💰' : '💀 파산 💀'}
        </h1>
        <p style="font-size: 1.5rem; margin-bottom: 30px;">${finalMessage}</p>
        <div style="font-size: 2.5rem; background: rgba(255,255,255,0.1); padding: 20px 40px; border-radius: 15px; border: 1px solid #555;">
            최종 잔액: <b style="color: ${balance > 0 ? 'gold' : '#ff6b6b'};">${balance.toLocaleString()} PT</b>
        </div>
        <p style="margin-top: 20px; color: #888;">담당 진행요원에게 이 화면을 보여주세요.</p>
        <div style="margin-top: 50px; padding-top: 30px; border-top: 1px dashed #555; display:flex; flex-direction:column; align-items:center; gap: 15px;">
            <p style="color: #ff3366; margin:0;">🔒 다음 참가자를 위한 초기화 (운영자 전용)</p>
            <input type="password" id="admin-reset-pwd" placeholder="비밀번호 입력" style="padding: 15px; width: 250px; text-align:center;">
            <button onclick="resetSlotGame()" style="padding: 15px; width: 250px; font-weight: bold; border-radius: 8px; border: none; background: #e82255; color: white; cursor: pointer;">처음으로 돌아가기</button>
        </div>
    `;

    document.body.appendChild(overlay);
    const pwdInput = document.getElementById('admin-reset-pwd');
    if (pwdInput) { 
        pwdInput.addEventListener('keypress', function(e) { 
            if (e.key === 'Enter') resetSlotGame(); 
        }); 
        pwdInput.focus(); 
    }
}

function resetSlotGame() {
    if (OPERATOR_CODES.includes(document.getElementById('admin-reset-pwd').value)) {
        location.reload(); 
    } else { 
        alert('❌ 관리자 비밀번호 오류'); 
        document.getElementById('admin-reset-pwd').value = ''; 
    }
}

window.onload = init;
