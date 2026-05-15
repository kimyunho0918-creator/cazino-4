// 👇👇👇 여기에 부장님 노트북 IP 입력! 👇👇👇
const SERVER_URL = "http://10.137.196.172:5000"; 
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

const machineId = typeof MY_MACHINE_ID !== 'undefined' ? MY_MACHINE_ID : 'slot_4';
const config = { '🍒': 2, '🍋': 3, '🍉': 5, '🔔': 10, '💎': 20, '7️⃣': 50 };
const symbols = Object.keys(config);
const OPERATOR_CODES = ['1004', '2004', '3004', '7777'];

let balance = 1000;      
let currentBet = 100;    
let isSpinning = false;
let isGameOver = false;

async function reportStatus() {
    let statusText = isSpinning ? "회전중..." : (isGameOver ? "게임 종료" : "대기중");
    const currentReels = [
        document.getElementById('reel1')?.innerText.trim() || '-',
        document.getElementById('reel2')?.innerText.trim() || '-',
        document.getElementById('reel3')?.innerText.trim() || '-'
    ];
    try {
        await fetch(`${SERVER_URL}/api/report/${machineId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: balance, status: statusText, reels: currentReels })
        });
    } catch (e) { console.log("보고 실패"); }
}

function updateUI() {
    const balanceElem = document.getElementById('balance-display');
    const betInput = document.getElementById('bet-input');
    if (balanceElem) balanceElem.innerText = balance.toLocaleString();
    if (betInput) currentBet = parseInt(betInput.value) || 100;
    reportStatus(); 
}

function init() {
    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
    reels.forEach(reel => { if(reel) reel.innerHTML = `<li class="symbol">7️⃣</li>`; });
    updateUI();
}

function startGame() {
    const startBalanceInput = document.getElementById('start-balance');
    if (startBalanceInput) balance = parseInt(startBalanceInput.value) || 1000;
    document.getElementById('entry-screen').classList.remove('active');
    document.getElementById('entry-screen').style.display = 'none';
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('game-screen').style.display = 'block'; 
    isGameOver = false;
    showMessage('VIP 슬롯머신에 오신 것을 환영합니다.', '#fff');
    updateUI();
}

function showMessage(msg, color = '#fff') {
    const msgElem = document.getElementById('message-board');
    if (msgElem) { msgElem.innerText = msg; msgElem.style.color = color; }
}

function setStealthLight(color1) {
    const light = document.getElementById('stealth-light');
    if (light) { light.style.background = color1; light.style.boxShadow = `0 0 10px ${color1}`; }
}

async function spin() {
    updateUI(); 
    if (isSpinning || isGameOver) return;
    if (balance < currentBet) { showMessage('잔액이 부족합니다.', '#ff6b6b'); return; }

    isSpinning = true; balance -= currentBet; updateUI();
    showMessage('슬롯이 맹렬하게 돌아갑니다!', '#fdf0a6');
    
    document.getElementById('spin-btn').disabled = true;
    document.getElementById('quit-btn').disabled = true;
    
    const handleBox = document.getElementById('handle-container');
    if (handleBox) { handleBox.classList.add('pulling'); setTimeout(() => handleBox.classList.remove('pulling'), 500); }

    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
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
        const response = await fetch(`${SERVER_URL}/api/spin/${machineId}`);
        const data = await response.json();
        let finalResults = data.results; 
        let appliedMode = data.mode;

        // 🌟 조명 이펙트 수정
        if (appliedMode === 'jackpot') setStealthLight('var(--gold)');
        else if (appliedMode === 'lose') setStealthLight('#ff6b6b');
        else if (appliedMode.includes('win')) setStealthLight('#4caf50'); // 당첨 시 초록빛
        else setStealthLight('transparent');

        setTimeout(() => { reelStopped[0] = true; if (reels[0]) { reels[0].classList.remove('spinning'); reels[0].innerHTML = `<li class="symbol">${symbols[finalResults[0]]}</li>`; } reportStatus(); }, 1000);
        setTimeout(() => { reelStopped[1] = true; if (reels[1]) { reels[1].classList.remove('spinning'); reels[1].innerHTML = `<li class="symbol">${symbols[finalResults[1]]}</li>`; } reportStatus(); }, 1500);
        setTimeout(() => { reelStopped[2] = true; if (reels[2]) { reels[2].classList.remove('spinning'); reels[2].innerHTML = `<li class="symbol">${symbols[finalResults[2]]}</li>`; } reportStatus(); }, 2000);

        setTimeout(() => { clearInterval(spinInterval); checkResult(finalResults, currentBet); }, 2500);

    } catch (error) {
        clearInterval(spinInterval); reels.forEach(reel => { if(reel) reel.classList.remove('spinning'); });
        showMessage('서버 통신 오류.', '#ff6b6b'); isSpinning = false;
        document.getElementById('spin-btn').disabled = false; document.getElementById('quit-btn').disabled = false; reportStatus();
    }
}

function checkResult(results, bet) {
    if (results[0] === results[1] && results[1] === results[2]) {
        const symbol = symbols[results[0]];
        const winAmount = Math.floor(bet * config[symbol]);
        balance += winAmount;
        showMessage(`🎉 당첨! +${winAmount.toLocaleString()} PT (${symbol})`, 'var(--gold)');
        updateUI(); isGameOver = true; setTimeout(() => endGame(false), 2500);
    } else {
        showMessage('아쉽습니다. 다음 기회에 도전하십시오.', '#888');
        updateUI();
        if (balance <= 0) {
            showMessage('잔액이 모두 소진되었습니다.', '#ff6b6b');
            isGameOver = true; setTimeout(() => endGame(false), 2500); return; 
        }
        isSpinning = false; setStealthLight('transparent');
        document.getElementById('spin-btn').disabled = false; document.getElementById('quit-btn').disabled = false;
    }
}

function endGame(isManualQuit) {
    isGameOver = true; updateUI(); 
    let finalMessage = isManualQuit ? "게임을 종료하고 정산합니다." : "게임이 종료되었습니다.";
    
    const overlay = document.createElement('div'); overlay.id = 'end-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); backdrop-filter:blur(10px); display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:9999; color:#fff;';

    overlay.innerHTML = `
        <h1 style="color: ${balance > 0 ? 'gold' : '#ff6b6b'}; font-size: 3rem; margin-bottom: 20px;">${balance > 0 ? '💰 정산 완료 💰' : '💀 파산 💀'}</h1>
        <p style="font-size: 1.5rem; margin-bottom: 30px;">${finalMessage}</p>
        <div style="font-size: 2.5rem; background: rgba(255,255,255,0.1); padding: 20px 40px; border-radius: 15px; border: 1px solid #555;">최종 잔액: <b style="color: ${balance > 0 ? 'gold' : '#ff6b6b'};">${balance.toLocaleString()} PT</b></div>
        <p style="margin-top: 20px; color: #888;">담당 진행요원에게 이 화면을 보여주세요.</p>
        <div style="margin-top: 50px; padding-top: 30px; border-top: 1px dashed #555; display:flex; flex-direction:column; align-items:center; gap: 15px;">
            <p style="color: #ff3366; margin:0;">🔒 운영자 초기화</p>
            <input type="password" id="admin-reset-pwd" placeholder="비밀번호" style="padding: 15px; width: 250px; text-align:center;">
            <button onclick="resetSlotGame()" style="padding: 15px; width: 250px; font-weight: bold; border-radius: 8px; border: none; background: #e82255; color: white; cursor: pointer;">처음으로</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const pwdInput = document.getElementById('admin-reset-pwd');
    if (pwdInput) { pwdInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') resetSlotGame(); }); pwdInput.focus(); }
}

function resetSlotGame() {
    if (OPERATOR_CODES.includes(document.getElementById('admin-reset-pwd').value)) { location.reload(); } 
    else { alert('❌ 비밀번호 오류'); document.getElementById('admin-reset-pwd').value = ''; }
}
window.onload = init;
