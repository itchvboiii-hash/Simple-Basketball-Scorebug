// --- VARIABLES ---
let score1 = 0;
let score2 = 0;
let fouls1 = 0;
let fouls2 = 0;

// Clock Vars
let gameMin = 12;
let gameSec = 0;
let gameInterval = null;
let isGameRunning = false;

let shotClockTime = 24;
let shotClockInterval = null;
let isShotClockRunning = false;

// --- WIRELESS P2P SETUP ---
let peer = null;
let conn = null;
let myPeerId = null;

// generate a random 4 letter code
function generateShortId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Initialize PeerJS
window.onload = function() {
    const shortId = generateShortId();
    peer = new Peer(shortId); // Create a peer with this ID

    peer.on('open', function(id) {
        myPeerId = id;
        document.getElementById('my-id').innerText = id;
        document.getElementById('connection-status').innerText = "Status: Waiting...";
    });

    // Listen for incoming connections (If I am the Host)
    peer.on('connection', function(c) {
        conn = c;
        setupConnection();
    });
    
    // Initialize displays
    updateGameClockDisplay();
    updateShotClockDisplay();
};

function connectToHost() {
    const remoteId = document.getElementById('remote-id-input').value.toUpperCase();
    if (!remoteId) return alert("Enter an ID!");
    
    conn = peer.connect(remoteId);
    setupConnection();
}

function setupConnection() {
    document.getElementById('connection-status').innerText = "Status: CONNECTED";
    document.getElementById('connection-status').style.color = "#aaffaa"; // Light Green
    
    // Receive Data
    conn.on('data', function(data) {
        handleIncomingData(data);
    });
}

// Send Data to the other screen
function sendData(type, payload) {
    if (conn && conn.open) {
        conn.send({ type: type, payload: payload });
    }
}

// Handle data coming FROM the other screen
function handleIncomingData(data) {
    // We set a flag to 'true' so we don't re-send the data back (infinite loop)
    const p = data.payload;
    
    switch(data.type) {
        case 'score': updateScore(p.team, p.amount, true); break;
        case 'fouls': updateFouls(p.team, p.amount, true); break;
        case 'timeout': toggleTimeout(p.team, p.index, true); break;
        case 'gameClockToggle': toggleGameClock(true); break;
        case 'shotClockToggle': toggleShotClock(true); break;
        case 'gameTimeSet': 
             gameMin = p.m; gameSec = p.s; 
             updateGameClockDisplay(); 
             break;
        case 'shotReset': 
             resetShotClockLogic(p.seconds); 
             break;
        case 'style':
             applyStyle(p.team, p.color, p.url);
             break;
        case 'newGame':
             resetNewGame(true);
             break;
    }
}


// --- GAME FUNCTIONS (Updated for Wireless) ---

function updateScore(team, amount, isRemote = false) {
    // 1. Update Logic
    if (team === 1) {
        score1 += amount;
        if (score1 < 0) score1 = 0;
        document.getElementById('score-1').innerText = score1;
    } else {
        score2 += amount;
        if (score2 < 0) score2 = 0;
        document.getElementById('score-2').innerText = score2;
    }

    // 2. Send Wireless Signal (Only if I clicked it, not if remote sent it)
    if (!isRemote) {
        sendData('score', { team: team, amount: amount });
    }
}

function updateFouls(team, amount, isRemote = false) {
    if (team === 1) {
        fouls1 += amount;
        if (fouls1 < 0) fouls1 = 0;
        document.getElementById('fouls-1').innerText = fouls1;
    } else {
        fouls2 += amount;
        if (fouls2 < 0) fouls2 = 0;
        document.getElementById('fouls-2').innerText = fouls2;
    }
    if (!isRemote) sendData('fouls', { team: team, amount: amount });
}

function toggleTimeout(team, index, isRemote = false) {
    const id = "t" + team + "-" + index;
    const el = document.getElementById(id);
    
    if (el.classList.contains('active')) {
        el.classList.remove('active');
    } else {
        el.classList.add('active');
    }
    if (!isRemote) sendData('timeout', { team: team, index: index });
}

// --- CLOCK FUNCTIONS ---

function updateGameClockDisplay() {
    let m = gameMin;
    let s = gameSec < 10 ? "0" + gameSec : gameSec;
    document.getElementById('game-clock-display').innerText = m + ":" + s;
}

function toggleGameClock(isRemote = false) {
    const btn = document.getElementById('btn-game-toggle');
    
    if (isGameRunning) {
        clearInterval(gameInterval);
        isGameRunning = false;
        btn.innerText = "Start Game";
        btn.style.backgroundColor = "#28a745"; 
    } else {
        isGameRunning = true;
        btn.innerText = "Pause Game";
        btn.style.backgroundColor = "#f0ad4e"; 
        
        gameInterval = setInterval(() => {
            if (gameSec === 0) {
                if (gameMin === 0) {
                    stopAllClocks();
                    return;
                }
                gameMin--;
                gameSec = 59;
            } else {
                gameSec--;
            }
            updateGameClockDisplay();
        }, 1000);
    }
    // We only send the "Toggle" command. Clocks might drift slightly over long periods
    // but usually stay close enough for basic use.
    if (!isRemote) sendData('gameClockToggle', {});
}

function setGameTime() {
    const inMin = document.getElementById('input-min').value;
    const inSec = document.getElementById('input-sec').value;
    
    gameMin = parseInt(inMin);
    gameSec = parseInt(inSec);
    if(gameSec > 59) gameSec = 59;
    if(gameMin < 0) gameMin = 0;

    updateGameClockDisplay();
    sendData('gameTimeSet', { m: gameMin, s: gameSec });
}

function updateShotClockDisplay() {
    const el = document.getElementById('shot-clock');
    const elDisplay = document.getElementById('shot-clock-display');
    
    const txt = ":" + (shotClockTime < 10 ? "0" + shotClockTime : shotClockTime);
    el.innerText = txt;
    elDisplay.innerText = shotClockTime; // Update the control panel display too
    
    if (shotClockTime <= 5) {
        el.classList.add('low-time');
    } else {
        el.classList.remove('low-time');
    }
}

function toggleShotClock(isRemote = false) {
    if (isShotClockRunning) {
        clearInterval(shotClockInterval);
        isShotClockRunning = false;
    } else {
        isShotClockRunning = true;
        shotClockInterval = setInterval(() => {
            if (shotClockTime > 0) {
                shotClockTime--;
                updateShotClockDisplay();
            } else {
                clearInterval(shotClockInterval);
                isShotClockRunning = false;
            }
        }, 1000);
    }
    if (!isRemote) sendData('shotClockToggle', {});
}

function smartResetShotClock() {
    let newTime = (shotClockTime === 24) ? 14 : 24;
    resetShotClockLogic(newTime);
    sendData('shotReset', { seconds: newTime });
}

function resetShotClock(val) {
    resetShotClockLogic(val);
    sendData('shotReset', { seconds: val });
}

function resetShotClockLogic(seconds) {
    // 1. Clear any existing timer so it doesn't double-speed
    clearInterval(shotClockInterval);

    // 2. Reset the time to 24 or 14
    shotClockTime = seconds;
    updateShotClockDisplay();

    // 3. AUTO START: Immediately start the countdown
    isShotClockRunning = true;
    shotClockInterval = setInterval(() => {
        if (shotClockTime > 0) {
            shotClockTime--;
            updateShotClockDisplay();
        } else {
            // Time is up
            clearInterval(shotClockInterval);
            isShotClockRunning = false;
        }
    }, 1000);

}

function stopAllClocks() {
    clearInterval(gameInterval);
    clearInterval(shotClockInterval);
    isGameRunning = false;
    isShotClockRunning = false;
    
    document.getElementById('btn-game-toggle').innerText = "Start Game";
    document.getElementById('btn-game-toggle').style.backgroundColor = "#28a745";
}

// --- STYLE & LOGO FUNCTIONS ---

function updateTeamStyle(teamNum) {
    const urlInput = document.getElementById(`input-url-${teamNum}`).value;
    const colorInput = document.getElementById(`input-color-${teamNum}`).value;
    
    applyStyle(teamNum, colorInput, urlInput);
    
    // Note: We send the URL text, but we cannot send the 'File' object easily.
    // So wireless logo changing only works with URL links, not uploads.
    sendData('style', { team: teamNum, color: colorInput, url: urlInput });
}

function applyStyle(teamNum, color, url) {
    const imgElement = document.getElementById(`team-img-${teamNum}`);
    const rowElement = document.getElementById(`team-row-${teamNum}`);

    if (url && url.trim() !== "") {
        imgElement.src = url;
    }
    rowElement.style.background = `linear-gradient(90deg, ${color} 0%, #000 100%)`;
}

function uploadLogo(teamNum) {
    const fileInput = document.getElementById(`file-upload-${teamNum}`);
    const imgElement = document.getElementById(`team-img-${teamNum}`);
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            // We do NOT send this wireless because it's too heavy for this simple logic
        }
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// --- NEW GAME ---

function resetNewGame(isRemote = false) {
    if (!isRemote) {
        if (!confirm("Start a New Game? This will reset all scores and clocks.")) return;
    }

    stopAllClocks();
    score1 = 0; score2 = 0;
    fouls1 = 0; fouls2 = 0;
    document.getElementById('score-1').innerText = "0";
    document.getElementById('score-2').innerText = "0";
    document.getElementById('fouls-1').innerText = "0";
    document.getElementById('fouls-2').innerText = "0";

    gameMin = 12; gameSec = 0; shotClockTime = 24;
    updateGameClockDisplay();
    updateShotClockDisplay();

    document.querySelectorAll('.dash').forEach(dash => dash.classList.remove('active'));
    
    if(!isRemote) sendData('newGame', {});
}
