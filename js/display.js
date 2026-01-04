/* ============================================
   FAMILY FEUD - DISPLAY LOGIC
   ============================================ */

let gameState = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDisplay();
});

function initDisplay() {
    // Load game state
    gameState = Storage.getGameState();
    
    if (!gameState) {
        console.error('No game state found');
        return;
    }
    
    // Setup sync listener
    Sync.onMessage(handleSyncMessage);
    
    // Initial render
    renderScoreboard();
    renderCurrentRound();
    
    // Inicializa sons
    Sounds.init();
}

// ============================================
// SYNC MESSAGE HANDLER
// ============================================

function handleSyncMessage(message) {
    const { type, data } = message;
    
    switch (type) {
        case Sync.EVENTS.SYNC_STATE:
            gameState = data;
            renderScoreboard();
            renderCurrentRound();
            break;
            
        case Sync.EVENTS.REVEAL_ANSWER:
            revealAnswer(data.index, data.answer);
            break;
            
        case Sync.EVENTS.ADD_STRIKE:
            showStrikes(data.count);
            break;
            
        case Sync.EVENTS.UPDATE_SCORE:
            updateTeamScore(data.teamIndex, data.score);
            break;
            
        case Sync.EVENTS.CHANGE_TEAM:
            setActiveTeam(data.teamIndex);
            break;
            
        case Sync.EVENTS.NEW_ROUND:
            gameState = Storage.getGameState();
            renderScoreboard();
            renderCurrentRound();
            break;
            
        case Sync.EVENTS.TIMER_START:
            showTimer(data.seconds);
            break;
            
        case Sync.EVENTS.TIMER_UPDATE:
            updateTimer(data.seconds);
            break;
            
        case Sync.EVENTS.TIMER_STOP:
            hideTimer();
            break;
            
        case Sync.EVENTS.PAUSE_GAME:
            showPause();
            break;
            
        case Sync.EVENTS.RESUME_GAME:
            hidePause();
            break;
            
        case Sync.EVENTS.GAME_OVER:
            showWinner(data);
            break;
            
        case Sync.EVENTS.PLAY_SOUND:
            Sounds.play(data.sound);
            break;
            
        case Sync.EVENTS.USE_POWERUP:
            animatePowerup(data.teamIndex, data.powerup);
            break;
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderScoreboard() {
    const container = document.getElementById('scoreboard');
    if (!container) return;
    
    if (!gameState || !gameState.teams) return;
    
    container.innerHTML = gameState.teams.map((team, i) => {
        const powerups = team.powerups || { pass: true, extra: true };
        return `
            <div class="team-panel ${gameState.controllingTeam === i ? 'active' : ''}" id="team${i}">
                <div class="team-info">
                    <div class="team-name">${team.name || 'Equipa'}</div>
                    <div class="team-powerups">
                        <span class="powerup-icon ${!powerups.pass ? 'used' : ''}" title="Passar Vez">🔄</span>
                        <span class="powerup-icon ${!powerups.extra ? 'used' : ''}" title="Resposta Extra">➕</span>
                    </div>
                </div>
                <div class="team-score" id="score${i}">${team.score || 0}</div>
            </div>
        `;
    }).join('');
}

function renderCurrentRound() {
    if (!gameState || !gameState.rounds || gameState.currentRound >= gameState.rounds.length) return;
    
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question) return;
    
    // Update round info
    const roundNumber = document.querySelector('.round-number');
    if (roundNumber) roundNumber.textContent = `Ronda ${gameState.currentRound + 1}`;
    
    const multiplier = document.querySelector('.round-multiplier');
    if (multiplier) {
        if (round.multiplier > 1) {
            multiplier.textContent = `${round.multiplier}x PONTOS`;
            multiplier.classList.add('visible');
        } else {
            multiplier.classList.remove('visible');
        }
    }
    
    // Show question if in playing phase
    const questionDisplay = document.getElementById('questionDisplay');
    const questionText = document.getElementById('questionText');
    
    if (questionDisplay && questionText) {
        if (gameState.phase !== 'faceoff' || (round.revealed && round.revealed.some(r => r))) {
            questionDisplay.classList.add('visible');
            questionText.textContent = round.question.text || '';
        } else {
            questionDisplay.classList.remove('visible');
        }
    }
    
    // Render answer board
    renderAnswerBoard(round);
    
    // Update round points
    updateRoundPoints();
}

function renderAnswerBoard(round) {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    
    if (!leftColumn || !rightColumn) return;
    if (!round || !round.question || !round.question.answers) return;
    
    let leftHtml = '';
    let rightHtml = '';
    
    for (let i = 0; i < 8; i++) {
        const answer = round.question.answers[i];
        const isRevealed = round.revealed[i];
        const hasAnswer = answer && answer.text && answer.text.trim() !== '';
        
        const html = `
            <div class="answer-panel ${isRevealed ? 'revealed' : 'hidden'}" id="answer${i}">
                <div class="answer-num">${i + 1}</div>
                <div class="answer-content">
                    <span class="answer-text">${hasAnswer && isRevealed ? answer.text : ''}</span>
                </div>
                <div class="answer-points">${hasAnswer && isRevealed ? answer.points : ''}</div>
            </div>
        `;
        
        if (i < 4) {
            leftHtml += html;
        } else {
            rightHtml += html;
        }
    }
    
    leftColumn.innerHTML = leftHtml;
    rightColumn.innerHTML = rightHtml;
}

// ============================================
// ANSWER REVEAL
// ============================================

function revealAnswer(index, answer) {
    const panel = document.getElementById(`answer${index}`);
    if (!panel) return;
    
    // Play reveal sound
    Sounds.play('reveal');
    
    // Animate reveal
    panel.classList.remove('hidden');
    panel.classList.add('revealed');
    
    // Update content
    const numEl = panel.querySelector('.answer-num');
    const textEl = panel.querySelector('.answer-text');
    const pointsEl = panel.querySelector('.answer-points');
    
    if (numEl) numEl.textContent = index + 1;
    if (textEl) textEl.textContent = answer ? answer.text : '';
    if (pointsEl) pointsEl.textContent = answer ? answer.points : '';
    
    // Show points popup
    if (answer && answer.points) {
        showPointsPopup(answer.points);
    }
    
    // Update game state locally
    if (gameState && gameState.rounds && gameState.rounds[gameState.currentRound]) {
        gameState.rounds[gameState.currentRound].revealed[index] = true;
    }
    
    // Update round points display
    updateRoundPoints();
}

function showPointsPopup(points) {
    const popup = document.getElementById('pointsPopup');
    if (!popup) return;
    
    const value = popup.querySelector('.points-value');
    if (!value) return;
    
    value.textContent = points;
    popup.classList.add('active');
    
    // Play ding sound
    Sounds.play('ding');
    
    // Hide after delay
    setTimeout(() => {
        popup.classList.remove('active');
    }, 1500);
}

function updateRoundPoints() {
    // Reload state to get latest
    gameState = Storage.getGameState();
    
    if (!gameState) return;
    
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    let total = 0;
    round.revealed.forEach((isRevealed, i) => {
        const answer = round.question.answers[i];
        if (isRevealed && answer && typeof answer.points === 'number') {
            total += answer.points * round.multiplier;
        }
    });
    
    const pointsEl = document.querySelector('.round-points-value');
    if (pointsEl) pointsEl.textContent = total;
    
    // Show if there are points
    const roundPointsEl = document.getElementById('roundPoints');
    if (roundPointsEl) roundPointsEl.classList.toggle('visible', total > 0);
}

// ============================================
// STRIKES
// ============================================

function showStrikes(count) {
    const overlay = document.getElementById('strikesOverlay');
    if (!overlay) return;
    
    // Se count é 0, apenas limpa os strikes sem mostrar overlay
    if (count === 0) {
        overlay.classList.remove('active');
        for (let i = 1; i <= 3; i++) {
            const strike = document.getElementById(`strike${i}`);
            if (strike) strike.classList.remove('visible');
        }
        return;
    }
    
    // Play buzzer sound
    Sounds.play('buzzer');
    
    // Show overlay
    overlay.classList.add('active');
    
    // Reset all strikes first
    for (let i = 1; i <= 3; i++) {
        const strike = document.getElementById(`strike${i}`);
        if (strike) strike.classList.remove('visible');
    }
    
    // Show current strike with animation
    const strike = document.getElementById(`strike${count}`);
    if (strike) {
        setTimeout(() => {
            strike.classList.add('visible');
        }, 100);
    }
    
    // Hide after delay
    setTimeout(() => {
        overlay.classList.remove('active');
        for (let i = 1; i <= 3; i++) {
            const strikeEl = document.getElementById(`strike${i}`);
            if (strikeEl) strikeEl.classList.remove('visible');
        }
    }, 2000);
}

// ============================================
// TEAM MANAGEMENT
// ============================================

function updateTeamScore(teamIndex, score) {
    const scoreEl = document.getElementById(`score${teamIndex}`);
    if (scoreEl) {
        // Animate score change
        scoreEl.style.transform = 'scale(1.3)';
        scoreEl.textContent = score;
        
        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
        }, 300);
    }
}

function setActiveTeam(teamIndex) {
    // Remove active from all
    document.querySelectorAll('.team-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Add active to selected
    const panel = document.getElementById(`team${teamIndex}`);
    if (panel) {
        panel.classList.add('active');
    }
}

function animatePowerup(teamIndex, powerup) {
    const panel = document.getElementById(`team${teamIndex}`);
    if (!panel) return;
    
    const icons = panel.querySelectorAll('.powerup-icon');
    const iconIndex = powerup === 'pass' ? 0 : 1;
    
    if (icons[iconIndex]) {
        icons[iconIndex].classList.add('used');
        icons[iconIndex].style.animation = 'shake 0.5s ease';
        
        setTimeout(() => {
            icons[iconIndex].style.animation = '';
        }, 500);
    }
}

// ============================================
// TIMER
// ============================================

function showTimer(seconds) {
    const display = document.getElementById('timerDisplay');
    const value = document.getElementById('timerValue');
    
    if (!display || !value) return;
    
    value.textContent = seconds;
    value.className = 'timer-value';
    display.classList.add('visible');
}

function updateTimer(seconds) {
    const value = document.getElementById('timerValue');
    if (!value) return;
    
    value.textContent = seconds;
    
    // Change color based on time (sound is handled by host)
    if (seconds <= 5) {
        value.className = 'timer-value danger';
    } else if (seconds <= 10) {
        value.className = 'timer-value warning';
    } else {
        value.className = 'timer-value';
    }
}

function hideTimer() {
    const display = document.getElementById('timerDisplay');
    if (display) display.classList.remove('visible');
}

// ============================================
// PAUSE/RESUME
// ============================================

function showPause() {
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.add('active');
}

function hidePause() {
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.remove('active');
}

// ============================================
// WINNER
// ============================================

function showWinner(data) {
    const overlay = document.getElementById('winnerOverlay');
    const teamEl = document.getElementById('winnerTeam');
    const scoreEl = document.getElementById('winnerScore');
    
    if (!overlay || !teamEl || !scoreEl) return;
    
    teamEl.textContent = data.teamName;
    scoreEl.textContent = `${data.score} PONTOS`;
    
    overlay.classList.add('active');
    
    // Play victory sound
    Sounds.play('victory');
    
    // Create confetti
    createConfetti();
}

function createConfetti() {
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#dda0dd'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => confetti.remove(), 7000);
    }
}

// ============================================
// KEYBOARD SHORTCUTS (for testing)
// ============================================

document.addEventListener('keydown', (e) => {
    // F11 - Fullscreen
    if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
});
