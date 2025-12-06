// --- Configuration ---
let gameTime = { minutes: 12, seconds: 0 };
let shotClock = 24;
let isGameOver = false;
let isPaused = true; // FORCE PAUSE ON LOAD
let timerInterval = null; 
let possession = 'none';
let homeScoreVal = 0;
let awayScoreVal = 0;
let homeLogoSrc = ''; 
let awayLogoSrc = '';

// --- DOM Elements ---
const gameTimerEl = document.getElementById('game-timer');
const shotTimerEl = document.getElementById('shot-timer');
const homeScoreEl = document.getElementById('home-score');
const awayScoreEl = document.getElementById('away-score');
const periodDisplayEl = document.getElementById('period-display');
const peerIdDisplay = document.getElementById('my-peer-id');
const homePossEl = document.getElementById('home-poss');
const awayPossEl = document.getElementById('away-poss');
const summaryInputEl = document.getElementById('summary-input');
const pauseBtnEl = document.getElementById('pause-btn'); // Get Pause Button

const channel = new BroadcastChannel('nba_scorebug_channel');

// --- WIRELESS ---
const peer = new Peer(null, { debug: 2 });
peer.on('open', (id) => { if(peerIdDisplay) peerIdDisplay.textContent = id; });
peer.on('connection', (conn) => {
    conn.on('data', (data) => { handleRemoteCommand(data); });
});

function handleRemoteCommand(data) {
    if (data.type === 'score') addScore(data.team, data.points);
    else if (data.type === 'shotclock') resetShotClock(data.seconds);
    else if (data.type === 'pause') togglePause();
    else if (data.type === 'customTime') setCustomTimeData(data.min, data.sec, data.period);
    else if (data.type === 'teamUpdate') {
        updateTeamName(data.team, data.name);
        updateTeamColor(data.team, data.color);
    }
    else if (data.type === 'possession') setPossession(data.team);
    else if (data.type === 'summary') triggerSummary(); 
}

// --- STATE MANAGEMENT ---
function saveState() {
    const state = {
        gameTime, shotClock, homeScoreVal, awayScoreVal, possession,
        homeName: document.getElementById('home-name').textContent,
        awayName: document.getElementById('away-name').textContent,
        period: periodDisplayEl.textContent
    };
    localStorage.setItem('scorebug_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('scorebug_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            gameTime = state.gameTime;
            shotClock = state.shotClock;
            homeScoreVal = state.homeScoreVal;
            awayScoreVal = state.awayScoreVal;
            possession = state.possession;
            
            // Restore UI
            document.getElementById('home-name').textContent = state.homeName;
            document.getElementById('away-name').textContent = state.awayName;
            periodDisplayEl.textContent = state.period;
            
            homeScoreEl.textContent = homeScoreVal;
            awayScoreEl.textContent = awayScoreVal;
            
            setPossession(possession);
        } catch(e) { console.log("Error loading state", e); }
    }
}

// --- RESET GAME ---
function resetGame() {
    if(confirm("Are you sure? This will reset scores and time to 0.")) {
        gameTime = { minutes: 12, seconds: 0 };
        shotClock = 24;
        homeScoreVal = 0;
        awayScoreVal = 0;
        possession = 'none';
        
        // Force Pause
        isPaused = true;
        stopTimer();
        updatePauseButtonUI(); // Update button text

        homeScoreEl.textContent = 0;
        awayScoreEl.textContent = 0;
        periodDisplayEl.textContent = "1st Qtr";
        setPossession('none');
        
        localStorage.removeItem('scorebug_state');
        updateDisplay();
        broadcastData();
    }
}

function broadcastData() {
    const hName = document.getElementById('home-name').textContent;
    const aName = document.getElementById('away-name').textContent;
    channel.postMessage({
        type: 'update',
        homeScore: homeScoreVal,
        awayScore: awayScoreVal,
        homeName: hName, awayName: aName,
        homeLogo: homeLogoSrc, awayLogo: awayLogoSrc
    });
}

function triggerSummary() {
    broadcastData();
    let titleText = "END OF QUARTER";
    if(summaryInputEl) titleText = summaryInputEl.value.toUpperCase();
    channel.postMessage({ type: 'toggle', title: titleText });
}

// --- TIMER FUNCTIONS ---
function formatTime(min, sec) {
    const formattedSec = sec < 10 ? `0${sec}` : sec;
    return `${min}:${formattedSec}`;
}

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateClock, 1000);
}
function stopTimer() { if (timerInterval) clearInterval(timerInterval); }

function updateClock() {
    if (isGameOver || isPaused) return;
    if (shotClock > 0) shotClock--;
    if (gameTime.seconds > 0) {
        gameTime.seconds--;
    } else {
        if (gameTime.minutes > 0) {
            gameTime.minutes--;
            gameTime.seconds = 59;
        } else {
            isGameOver = true;
            stopTimer(); 
            gameTimerEl.style.color = "red";
        }
    }
    updateDisplay();
}

function updateDisplay() {
    gameTimerEl.textContent = formatTime(gameTime.minutes, gameTime.seconds);
    shotTimerEl.textContent = shotClock;
    if (shotClock <= 5) shotTimerEl.style.color = "red";
    else shotTimerEl.style.color = "white";
    saveState();
}

// --- CONTROLS ---

function togglePause() {
    isPaused = !isPaused;
    updatePauseButtonUI(); // Update text based on state
    
    if (isPaused) {
        stopTimer(); 
    } else {
        startTimer(); 
    }
    saveState();
}

function updatePauseButtonUI() {
    if (isPaused) {
        pauseBtnEl.textContent = "RESUME [SPACE]";
        pauseBtnEl.style.backgroundColor = "#28a745"; // Green
    } else {
        pauseBtnEl.textContent = "PAUSE [SPACE]";
        pauseBtnEl.style.backgroundColor = "#007bff"; // Blue
    }
}

function resetShotClock(seconds) {
    shotClock = seconds;
    updateDisplay();
    // Only restart timer if we were ALREADY running
    if (!isPaused && !isGameOver) startTimer();
}

function addScore(team, points) {
    if (team === 'home') {
        homeScoreVal += points;
        if(homeScoreVal < 0) homeScoreVal = 0; 
        homeScoreEl.textContent = homeScoreVal;
    } else if (team === 'away') {
        awayScoreVal += points;
        if(awayScoreVal < 0) awayScoreVal = 0;
        awayScoreEl.textContent = awayScoreVal;
    }
    saveState();
    broadcastData();
}

function updateTeamName(team, name) {
    const elementId = team === 'home' ? 'home-name' : 'away-name';
    document.getElementById(elementId).textContent = name.toUpperCase();
    saveState();
    broadcastData();
}

function updateTeamColor(team, color) {
    const elementId = team === 'home' ? 'home-bg-panel' : 'away-bg-panel';
    const darkerColor = adjustColor(color, -60); 
    document.getElementById(elementId).style.background = `linear-gradient(to bottom, ${color} 0%, ${darkerColor} 100%)`;
}

function setPossession(team) {
    if (possession === team) {
        possession = 'none';
        homePossEl.style.display = 'none';
        awayPossEl.style.display = 'none';
    } else {
        possession = team;
        if (team === 'home') {
            homePossEl.style.display = 'block';
            awayPossEl.style.display = 'none';
        } else {
            homePossEl.style.display = 'none';
            awayPossEl.style.display = 'block';
        }
    }
    saveState();
}

function setCustomTime() {
    const min = document.getElementById('edit-min').value;
    const sec = document.getElementById('edit-sec').value;
    const period = document.getElementById('edit-period').value;
    setCustomTimeData(min || null, sec || null, period);
}

function setCustomTimeData(min, sec, period) {
    if (min !== null) gameTime.minutes = parseInt(min);
    if (sec !== null) gameTime.seconds = parseInt(sec);
    if (period) periodDisplayEl.textContent = period;
    if (gameTime.minutes > 0 || gameTime.seconds > 0) {
        isGameOver = false;
        gameTimerEl.style.color = "#FFD700";
    }
    updateDisplay();
}

function uploadLogo(team, input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (team === 'home') homeLogoSrc = e.target.result;
            else awayLogoSrc = e.target.result;
            const imgId = team === 'home' ? 'home-logo-img' : 'away-logo-img';
            document.getElementById(imgId).src = e.target.result;
            broadcastData();
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- HOTKEYS ---
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch(e.key.toLowerCase()) {
        case ' ': e.preventDefault(); togglePause(); break;
        case '1': addScore('home', 1); break;
        case '2': addScore('home', 2); break;
        case '3': addScore('home', 3); break;
        case 'q': addScore('home', -1); break;
        case 'a': setPossession('home'); break;
        case '8': addScore('away', 1); break;
        case '9': addScore('away', 2); break;
        case '0': addScore('away', 3); break;
        case 'p': addScore('away', -1); break;
        case 'l': setPossession('away'); break;
        case 's': resetShotClock(24); break;
        case 'd': resetShotClock(14); break;
        case 'm': triggerSummary(); break;
    }
});

// --- INIT ---
// 1. Load previous data
loadState(); 
// 2. Ensure we start PAUSED
isPaused = true; 
stopTimer();
// 3. Update UI to match paused state
updatePauseButtonUI();
updateDisplay();

// 4. Wait for styles/images then broadcast
setTimeout(broadcastData, 500);