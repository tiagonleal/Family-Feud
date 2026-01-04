/* ============================================
   FAMILY FEUD - HOST LOGIC
   ============================================ */

let gameState = null;
let timerInterval = null;
let currentTimer = 20;
let isPaused = false;
let isStealMode = false;
let extraAnswerActive = false;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initHost();
});

function initHost() {
    // Load game state
    gameState = Storage.getGameState();
    
    if (!gameState) {
        alert('Nenhum jogo ativo encontrado!');
        window.location.href = 'index.html';
        return;
    }
    
    if (gameState.finished) {
        alert('Este jogo já terminou!');
        Storage.clearGameState();
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize
    currentTimer = gameState.timer;
    
    // Initialize sounds
    Sounds.init();
    
    // Setup sync listener
    Sync.onMessage(handleSyncMessage);
    
    // Initial render
    renderAll();
    
    // Sync state to display
    syncState();
    
    // Add log entry
    addLog('Jogo iniciado');
}

function handleSyncMessage(message) {
    // Host mostly sends, but might need to handle some responses
    if (message.type === Sync.EVENTS.SYNC_STATE) {
        gameState = message.data;
        renderAll();
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAll() {
    renderScoreboard();
    renderQuestion();
    renderAnswers();
    renderStrikes();
    renderTeamButtons();
    renderAwardButtons();
    renderPowerups();
    updateRoundInfo();
    updateRoundPoints();
}

function renderScoreboard() {
    const container = document.getElementById('hostScoreboard');
    if (!container) return;
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '<p>Nenhuma equipa configurada</p>';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => `
        <div class="host-team ${gameState.controllingTeam === i ? 'active' : ''}" id="hostTeam${i}">
            <div class="host-team-info">
                <div class="host-team-name">${team.name}</div>
                <div class="host-team-players">${team.players && team.players.length > 0 ? team.players.join(', ') : 'Sem jogadores'}</div>
            </div>
            <div class="host-team-score" id="hostScore${i}">${team.score}</div>
        </div>
    `).join('');
}

function renderQuestion() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question) return;
    
    const questionEl = document.getElementById('currentQuestion');
    if (questionEl) questionEl.textContent = round.question.text || '';
}

function renderAnswers() {
    const container = document.getElementById('answersGrid');
    if (!container) return;
    
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    container.innerHTML = round.question.answers.map((answer, i) => {
        if (!answer) answer = { text: '', points: 0 };
        const hasText = answer.text && answer.text.trim() !== '';
        const isRevealed = round.revealed[i];
        
        if (!hasText) {
            return `
                <div class="host-answer empty" style="opacity: 0.3; cursor: default;">
                    <span class="answer-num-badge">${i + 1}</span>
                    <div class="answer-info">
                        <div class="answer-text-host">(vazio)</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="host-answer ${isRevealed ? 'revealed' : ''}" 
                 onclick="${isRevealed ? '' : `revealAnswer(${i})`}">
                <span class="answer-num-badge">${i + 1}</span>
                <div class="answer-info">
                    <div class="answer-text-host">${answer.text}</div>
                    <div class="answer-points-host">${answer.points} pontos</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStrikes() {
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`strikeInd${i}`);
        if (ind) {
            ind.classList.toggle('active', i <= gameState.strikes);
        }
    }
}

function renderTeamButtons() {
    const container = document.getElementById('teamButtons');
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => `
        <button class="btn-team ${gameState.controllingTeam === i ? 'active' : ''}"
                onclick="setControllingTeam(${i})">
            ${team.name}
        </button>
    `).join('');
}

function renderAwardButtons() {
    const container = document.getElementById('awardButtons');
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => `
        <button class="btn-award" onclick="awardPoints(${i})">
            🏆 Dar pontos a ${team.name}
        </button>
    `).join('');
}

function renderPowerups() {
    const container = document.getElementById('powerupsGrid');
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => {
        const powerups = team.powerups || { pass: false, extra: false };
        return `
            <div class="powerup-row">
                <span class="powerup-team-name">${team.name || 'Equipa'}</span>
                <div class="powerup-buttons">
                    <button class="btn-powerup pass ${!powerups.pass ? 'used' : ''}"
                            onclick="usePowerup(${i}, 'pass')"
                            ${!powerups.pass ? 'disabled' : ''}>
                    🔄 Passar
                </button>
                <button class="btn-powerup extra ${!powerups.extra ? 'used' : ''}"
                        onclick="usePowerup(${i}, 'extra')"
                        ${!powerups.extra ? 'disabled' : ''}>
                    ➕ Extra
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function updateRoundInfo() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round) return;
    
    const roundBadge = document.getElementById('roundBadge');
    if (roundBadge) roundBadge.textContent = `Ronda ${gameState.currentRound + 1}/${gameState.rounds.length}`;
    
    // Phase badge
    const phaseBadge = document.getElementById('phaseBadge');
    if (phaseBadge) {
        if (isStealMode) {
            phaseBadge.textContent = '🏴‍☠️ Roubar';
            phaseBadge.className = 'phase-badge steal';
        } else if (gameState.phase === 'faceoff') {
            phaseBadge.textContent = 'Face-off';
            phaseBadge.className = 'phase-badge';
        } else {
            phaseBadge.textContent = 'A jogar';
            phaseBadge.className = 'phase-badge';
        }
    }
    
    // Multiplier
    const multiplierBadge = document.getElementById('multiplierBadge');
    if (multiplierBadge) {
        if (round.multiplier > 1) {
            multiplierBadge.textContent = `${round.multiplier}x`;
        } else {
            multiplierBadge.textContent = '';
        }
    }
}

function updateRoundPoints() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    let total = 0;
    round.revealed.forEach((isRevealed, i) => {
        const answer = round.question.answers[i];
        if (isRevealed && answer && typeof answer.points === 'number') {
            total += answer.points * round.multiplier;
        }
    });
    
    const pointsDisplay = document.getElementById('roundPointsDisplay');
    if (pointsDisplay) pointsDisplay.textContent = total;
}

// ============================================
// ANSWER REVEAL
// ============================================

function revealAnswer(index) {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    if (round.revealed[index]) return;
    
    const answer = round.question.answers[index];
    if (!answer || !answer.text || !answer.text.trim()) return;
    
    // Update state
    round.revealed[index] = true;
    gameState.phase = 'playing';
    
    // Clear strikes when answer is correct
    if (gameState.strikes > 0 && !extraAnswerActive) {
        // Don't clear strikes - they accumulate until 3
    }
    
    // Reset extra answer flag
    extraAnswerActive = false;
    
    // Save state
    Storage.saveGameState(gameState);
    
    // Broadcast to display
    Sync.broadcast(Sync.EVENTS.REVEAL_ANSWER, { index, answer });
    
    // Play sound locally
    Sounds.play('ding');
    
    // Update UI
    renderAnswers();
    updateRoundPoints();
    
    // Log
    addLog(`Revelado: "${answer.text}" (${answer.points} pts)`);
    
    // Check if all answers revealed
    checkRoundComplete();
}

function checkRoundComplete() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    const allRevealed = round.question.answers.every((a, i) => {
        return !a || !a.text || !a.text.trim() || round.revealed[i];
    });
    
    if (allRevealed) {
        addLog('Todas as respostas reveladas!');
    }
}

function revealAllAnswers() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    if (!confirm('Revelar todas as respostas restantes?')) return;
    
    // Revelar cada resposta com um pequeno delay para animação
    let delay = 0;
    round.question.answers.forEach((answer, i) => {
        if (answer && answer.text && answer.text.trim() && !round.revealed[i]) {
            setTimeout(() => {
                round.revealed[i] = true;
                Storage.saveGameState(gameState);
                Sync.broadcast(Sync.EVENTS.REVEAL_ANSWER, { index: i, answer });
                renderAnswers();
                updateRoundPoints();
            }, delay);
            delay += 300;
        }
    });
    
    addLog('Todas as respostas reveladas!');
}

function addStrike() {
    if (gameState.strikes >= 3) return;
    
    gameState.strikes++;
    const wrongGuessEl = document.getElementById('wrongGuess');
    const wrongGuess = wrongGuessEl ? wrongGuessEl.value.trim() : '';
    
    if (wrongGuess) {
        addLog(`❌ Errado: "${wrongGuess}"`);
        if (wrongGuessEl) wrongGuessEl.value = '';
    } else {
        addLog(`❌ Strike ${gameState.strikes}`);
    }
    
    // Save and sync
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.ADD_STRIKE, { count: gameState.strikes });
    
    // Play buzzer
    Sounds.play('buzzer');
    
    // Update UI
    renderStrikes();
    
    // Check for 3 strikes
    if (gameState.strikes >= 3 && !isStealMode) {
        setTimeout(() => {
            if (confirm('3 Strikes! Ativar modo roubar?')) {
                enableSteal();
            }
        }, 1500);
    }
}

function handleWrongInput(event) {
    if (event.key === 'Enter') {
        addStrike();
    }
}

function resetStrikes() {
    gameState.strikes = 0;
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.ADD_STRIKE, { count: 0 });
    renderStrikes();
    addLog('Strikes limpos');
}

// ============================================
// TEAM MANAGEMENT
// ============================================

function setControllingTeam(teamIndex) {
    const team = gameState.teams[teamIndex];
    if (!team) return;
    
    gameState.controllingTeam = teamIndex;
    Storage.saveGameState(gameState);
    
    Sync.broadcast(Sync.EVENTS.CHANGE_TEAM, { teamIndex });
    
    renderScoreboard();
    renderTeamButtons();
    
    addLog(`${team.name} está a jogar`);
}

function awardPoints(teamIndex) {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    const team = gameState.teams[teamIndex];
    if (!team) return;
    
    // Verificar se já foram atribuídos pontos nesta ronda
    if (round.pointsAwarded) {
        alert('Os pontos desta ronda já foram atribuídos!');
        return;
    }
    
    // Calculate points
    let points = 0;
    round.revealed.forEach((isRevealed, i) => {
        const answer = round.question.answers[i];
        if (isRevealed && answer && typeof answer.points === 'number') {
            points += answer.points * round.multiplier;
        }
    });
    
    if (points === 0) {
        alert('Não há pontos para atribuir!');
        return;
    }
    
    // Marcar como atribuídos
    round.pointsAwarded = true;
    
    // Award points
    team.score += points;
    
    // Save and sync
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.UPDATE_SCORE, { 
        teamIndex, 
        score: team.score 
    });
    
    // Play sound
    Sounds.play('points');
    
    // Update UI
    renderScoreboard();
    
    addLog(`${team.name} ganhou ${points} pontos!`);
}

// ============================================
// POWER-UPS
// ============================================

function usePowerup(teamIndex, powerup) {
    const team = gameState.teams[teamIndex];
    if (!team || !team.powerups || !team.powerups[powerup]) return;
    
    // Mark as used
    team.powerups[powerup] = false;
    Storage.saveGameState(gameState);
    
    // Broadcast
    Sync.broadcast(Sync.EVENTS.USE_POWERUP, { teamIndex, powerup });
    
    // Handle powerup effect
    if (powerup === 'pass') {
        addLog(`${team.name} usou PASSAR VEZ`);
        // Switch to next team
        const nextTeam = (teamIndex + 1) % gameState.teams.length;
        setControllingTeam(nextTeam);
    } else if (powerup === 'extra') {
        addLog(`${team.name} usou RESPOSTA EXTRA`);
        extraAnswerActive = true;
        // Reset one strike if exists
        if (gameState.strikes > 0) {
            gameState.strikes--;
            Storage.saveGameState(gameState);
            renderStrikes();
        }
    }
    
    renderPowerups();
}

// ============================================
// STEAL MODE
// ============================================

function enableSteal() {
    isStealMode = true;
    const stealBtn = document.getElementById('stealBtn');
    if (stealBtn) {
        stealBtn.classList.add('active');
        stealBtn.textContent = '✓ Modo Roubar Ativo';
    }
    
    updateRoundInfo();
    addLog('Modo roubar ativado!');
    
    // Reset strikes for steal attempt
    gameState.strikes = 0;
    Storage.saveGameState(gameState);
    renderStrikes();
}

function disableSteal() {
    isStealMode = false;
    const stealBtn = document.getElementById('stealBtn');
    if (stealBtn) {
        stealBtn.classList.remove('active');
        stealBtn.textContent = '🏴‍☠️ Modo Roubar';
    }
    updateRoundInfo();
}

// ============================================
// ROUND MANAGEMENT
// ============================================

function nextRound() {
    // Check if there are more rounds
    if (gameState.currentRound >= gameState.rounds.length - 1) {
        if (confirm('Esta é a última ronda! Terminar o jogo?')) {
            endGame();
        }
        return;
    }
    
    // Move to next round
    gameState.currentRound++;
    gameState.strikes = 0;
    gameState.controllingTeam = null;
    gameState.phase = 'faceoff';
    isStealMode = false;
    extraAnswerActive = false;
    
    // Save and sync
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.NEW_ROUND, {});
    
    // Reset UI
    disableSteal();
    resetTimer();
    
    // Re-render
    renderAll();
    
    addLog(`--- Ronda ${gameState.currentRound + 1} ---`);
}

// ============================================
// TIMER
// ============================================

function startTimer() {
    if (timerInterval) return;
    
    Sync.broadcast(Sync.EVENTS.TIMER_START, { seconds: currentTimer });
    
    timerInterval = setInterval(() => {
        if (!isPaused) {
            currentTimer--;
            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) timerDisplay.textContent = currentTimer;
            
            Sync.broadcast(Sync.EVENTS.TIMER_UPDATE, { seconds: currentTimer });
            
            if (currentTimer <= 5) {
                Sounds.play('tick');
            }
            
            if (currentTimer <= 0) {
                stopTimer();
                Sounds.play('buzzer');
                addLog('⏱️ Tempo esgotado!');
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    Sync.broadcast(Sync.EVENTS.TIMER_STOP, {});
}

function resetTimer() {
    stopTimer();
    currentTimer = gameState ? gameState.timer : 20;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.textContent = currentTimer;
}

// ============================================
// PAUSE
// ============================================

function togglePause() {
    isPaused = !isPaused;
    
    const btn = document.getElementById('pauseBtn');
    if (btn) {
        if (isPaused) {
            btn.textContent = '▶️ Continuar';
            btn.classList.add('paused');
            Sync.broadcast(Sync.EVENTS.PAUSE_GAME, {});
            addLog('Jogo pausado');
        } else {
            btn.textContent = '⏸️ Pausar';
            btn.classList.remove('paused');
            Sync.broadcast(Sync.EVENTS.RESUME_GAME, {});
            addLog('Jogo retomado');
        }
    }
    
    gameState.paused = isPaused;
    Storage.saveGameState(gameState);
}

// ============================================
// GAME END
// ============================================

function endGame() {
    // Verificar se há equipas
    if (!gameState.teams || gameState.teams.length === 0) {
        alert('Nenhuma equipa encontrada!');
        return;
    }
    
    // Find winner (handle ties)
    let maxScore = -1;
    let winners = [];
    
    gameState.teams.forEach((team, i) => {
        if (team.score > maxScore) {
            maxScore = team.score;
            winners = [{ index: i, team: team }];
        } else if (team.score === maxScore) {
            winners.push({ index: i, team: team });
        }
    });
    
    // Verificar se encontrou vencedores
    if (winners.length === 0) {
        alert('Erro ao determinar vencedor!');
        return;
    }
    
    // Mark game as finished
    gameState.finished = true;
    Storage.saveGameState(gameState);
    
    // Handle tie
    let winnerText = '';
    if (winners.length > 1) {
        const names = winners.map(w => w.team.name).join(' e ');
        winnerText = `EMPATE! ${names}`;
        
        // Broadcast to display
        Sync.broadcast(Sync.EVENTS.GAME_OVER, {
            teamName: `EMPATE: ${names}`,
            score: maxScore
        });
    } else {
        const winner = winners[0].team;
        winnerText = winner.name;
        
        // Broadcast to display
        Sync.broadcast(Sync.EVENTS.GAME_OVER, {
            teamName: winner.name,
            score: winner.score
        });
    }
    
    // Play victory sound
    Sounds.play('victory');
    
    addLog(`🎉 ${winnerText} venceu com ${maxScore} pontos!`);
    
    // Show confirmation
    setTimeout(() => {
        if (confirm(`${winnerText} venceu com ${maxScore} pontos!\n\nVoltar ao menu principal?`)) {
            Storage.clearGameState();
            window.location.href = 'index.html';
        }
    }, 2000);
}

// ============================================
// DISPLAY WINDOW
// ============================================

function openDisplay() {
    window.open('display.html', 'FamilyFeud_Display', 
        'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
}

// ============================================
// SYNC
// ============================================

function syncState() {
    Sync.broadcast(Sync.EVENTS.SYNC_STATE, gameState);
}

// ============================================
// LOG
// ============================================

function addLog(message) {
    const container = document.getElementById('logEntries');
    if (!container) return;
    
    const time = new Date().toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${time}</span>${message}`;
    
    container.insertBefore(entry, container.firstChild);
    
    // Keep only last 50 entries
    while (container.children.length > 50) {
        container.removeChild(container.lastChild);
    }
}

// ============================================
// CONFIRM DIALOG
// ============================================

function showConfirm(title, message, onConfirm) {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const modal = document.getElementById('confirmModal');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            closeConfirm();
            onConfirm();
        };
    }
    if (modal) modal.classList.add('active');
}

function closeConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    // Space - Add strike (when not typing)
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        addStrike();
    }
    
    // P - Pause
    if (e.key.toLowerCase() === 'p' && document.activeElement.tagName !== 'INPUT') {
        togglePause();
    }
    
    // T - Start/Stop timer
    if (e.key.toLowerCase() === 't' && document.activeElement.tagName !== 'INPUT') {
        if (timerInterval) {
            stopTimer();
        } else {
            startTimer();
        }
    }
    
    // Number keys 1-8 - Reveal answer
    if (e.key >= '1' && e.key <= '8' && document.activeElement.tagName !== 'INPUT') {
        const index = parseInt(e.key) - 1;
        revealAnswer(index);
    }
    
    // N - Next round
    if (e.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT') {
        nextRound();
    }
    
    // Escape - Close modal
    if (e.key === 'Escape') {
        closeConfirm();
    }
});

// Prevent leaving page accidentally
window.onbeforeunload = function() {
    if (gameState && !gameState.finished) {
        return 'O jogo ainda está a decorrer. Tens a certeza que queres sair?';
    }
};
