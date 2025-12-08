// --- VARIABLES ---
let score1 = 90;
let score2 = 79;
let fouls1 = 1;
let fouls2 = 0;

// Game Clock Variables
let gameMin = 12;
let gameSec = 0;
let gameInterval = null;
let isGameRunning = false;

// Shot Clock Variables
let shotClockTime = 24;
let shotClockInterval = null;
let isShotClockRunning = false;

// --- DOM ELEMENTS ---
const elScore1 = document.getElementById('score-1');
const elScore2 = document.getElementById('score-2');
const elFouls1 = document.getElementById('fouls-1');
const elFouls2 = document.getElementById('fouls-2');

const elGameClock = document.getElementById('game-clock-display');
const elShotClock = document.getElementById('shot-clock');
const btnGameToggle = document.getElementById('btn-game-toggle');

// --- SCORE FUNCTIONS ---
function updateScore(team, amount) {
    if (team === 1) {
        score1 += amount;
        if (score1 < 0) score1 = 0;
        elScore1.innerText = score1;
    } else if (team === 2) {
        score2 += amount;
        if (score2 < 0) score2 = 0;
        elScore2.innerText = score2;
    }
}

// --- FOUL FUNCTIONS (NEW) ---
function updateFouls(team, amount) {
    if (team === 1) {
        fouls1 += amount;
        if (fouls1 < 0) fouls1 = 0; // No negative fouls
        elFouls1.innerText = fouls1;
    } else if (team === 2) {
        fouls2 += amount;
        if (fouls2 < 0) fouls2 = 0;
        elFouls2.innerText = fouls2;
    }
}

// --- TIMEOUT FUNCTIONS (NEW) ---
function toggleTimeout(team, index) {
    // Construct the ID string (e.g., "t1-0")
    const id = "t" + team + "-" + index;
    const el = document.getElementById(id);
    
    // Toggle the 'active' class
    if (el.classList.contains('active')) {
        el.classList.remove('active');
    } else {
        el.classList.add('active');
    }
}

// --- STYLE UPDATE FUNCTION ---
function updateTeamStyle(teamNum) {
    const urlInput = document.getElementById(`input-url-${teamNum}`).value;
    const colorInput = document.getElementById(`input-color-${teamNum}`).value;
    const imgElement = document.getElementById(`team-img-${teamNum}`);
    const rowElement = document.getElementById(`team-row-${teamNum}`);

    if (urlInput.trim() !== "") {
        imgElement.src = urlInput;
    }
    
    rowElement.style.background = `linear-gradient(90deg, ${colorInput} 0%, #000 100%)`;
}

// --- GAME CLOCK FUNCTIONS ---
function updateGameClockDisplay() {
    let m = gameMin;
    let s = gameSec < 10 ? "0" + gameSec : gameSec;
    elGameClock.innerText = m + ":" + s;
}

function toggleGameClock() {
    if (isGameRunning) {
        clearInterval(gameInterval);
        isGameRunning = false;
        btnGameToggle.innerText = "Start Game";
        btnGameToggle.style.backgroundColor = "#4CAF50"; 
    } else {
        isGameRunning = true;
        btnGameToggle.innerText = "Pause Game";
        btnGameToggle.style.backgroundColor = "#f0ad4e"; 
        
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
}

function setGameTime() {
    const inMin = document.getElementById('input-min').value;
    const inSec = document.getElementById('input-sec').value;
    
    gameMin = parseInt(inMin);
    gameSec = parseInt(inSec);
    
    if(gameSec > 59) gameSec = 59;
    if(gameMin < 0) gameMin = 0;

    updateGameClockDisplay();
}

// --- SHOT CLOCK FUNCTIONS ---
function updateShotClockDisplay() {
    elShotClock.innerText = ":" + (shotClockTime < 10 ? "0" + shotClockTime : shotClockTime);
    if (shotClockTime <= 5) {
        elShotClock.classList.add('low-time');
    } else {
        elShotClock.classList.remove('low-time');
    }
}

function toggleShotClock() {
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
}

function resetShotClock(seconds) {
    clearInterval(shotClockInterval);
    isShotClockRunning = false;
    shotClockTime = seconds;
    updateShotClockDisplay();
}

// --- GLOBAL UTILS ---
function stopAllClocks() {
    clearInterval(gameInterval);
    clearInterval(shotClockInterval);
    isGameRunning = false;
    isShotClockRunning = false;
    btnGameToggle.innerText = "Start Game";
    btnGameToggle.style.backgroundColor = "#4CAF50";
}

// Initialize
updateGameClockDisplay();
updateShotClockDisplay();

// --- NEW GAME RESET FUNCTION ---
function resetNewGame() {
    // 1. Safety Check: Ask user to confirm
    if (!confirm("Start a New Game? This will reset all scores and clocks.")) {
        return; // Stop if they click Cancel
    }

    // 2. Stop all timers
    stopAllClocks();

    // 3. Reset Scores
    score1 = 0;
    score2 = 0;
    elScore1.innerText = "0";
    elScore2.innerText = "0";

    // 4. Reset Fouls
    fouls1 = 0;
    fouls2 = 0;
    elFouls1.innerText = "0";
    elFouls2.innerText = "0";

    // 5. Reset Clocks
    gameMin = 12;
    gameSec = 0;
    shotClockTime = 24;
    updateGameClockDisplay();
    updateShotClockDisplay();

    

    // 6. Reset Timeouts (Remove 'active' class from all dashes)
    // We select all elements with class 'dash' and remove 'active'
    const allDashes = document.querySelectorAll('.dash');
    allDashes.forEach(dash => {
        dash.classList.remove('active');
    });
}

// --- LOGO UPLOAD FUNCTION ---
function uploadLogo(teamNum) {
    const fileInput = document.getElementById(`file-upload-${teamNum}`);
    const imgElement = document.getElementById(`team-img-${teamNum}`);
    
    // Check if a file was selected
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        // When the file is read, update the image src
        reader.onload = function(e) {
            imgElement.src = e.target.result;
        }
        
        // Read the image file as a data URL
        reader.readAsDataURL(fileInput.files[0]);
    }
}

