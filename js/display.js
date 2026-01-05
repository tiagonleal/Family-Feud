/* ============================================
   FAMILY FEUD - DISPLAY LOGIC
   ============================================ */

let gameState = null;
let hasRequestedFullscreen = false;

// Escape HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
        // Mostrar mensagem ao utilizador
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; font-family: Arial, sans-serif;">
                <h1 style="font-size: 3rem; margin-bottom: 1rem;">⏳ À espera do jogo...</h1>
                <p style="font-size: 1.5rem; color: #888;">Inicia um jogo no menu principal</p>
                <button onclick="location.reload()" style="margin-top: 2rem; padding: 15px 30px; font-size: 1.2rem; background: #4ecdc4; border: none; border-radius: 10px; cursor: pointer;">🔄 Atualizar</button>
            </div>
        `;
        return;
    }
    
    // Setup sync listener
    Sync.onMessage(handleSyncMessage);
    
    // Initial render
    renderScoreboard();
    renderCurrentRound();
    
    // Inicializa sons
    Sounds.init();
    
    // Mostrar overlay para entrar em fullscreen
    showFullscreenPrompt();
}

function showFullscreenPrompt() {
    // Criar overlay que pede clique para fullscreen
    const overlay = document.createElement('div');
    overlay.id = 'fullscreenPrompt';
    overlay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: rgba(0,0,0,0.95); color: white; font-family: Arial, sans-serif; cursor: pointer; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
            <h1 style="font-size: 4rem; color: #ffd700; margin-bottom: 1rem;">🎮 FAMILY FEUD</h1>
            <p style="font-size: 2rem; margin-bottom: 2rem;">Clica em qualquer sítio para começar</p>
            <div style="font-size: 1.5rem; color: #4ecdc4; animation: pulse 2s infinite;">👆 CLICA AQUI 👆</div>
            <p style="font-size: 1rem; color: #888; margin-top: 2rem;">O ecrã entrará em modo fullscreen</p>
        </div>
    `;
    
    overlay.addEventListener('click', () => {
        // Remover overlay
        overlay.remove();
        
        // Entrar em fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen não disponível:', err);
            });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        
        hasRequestedFullscreen = true;
    });
    
    document.body.appendChild(overlay);
}

function requestFullscreenOnce() {
    if (hasRequestedFullscreen) return;
    hasRequestedFullscreen = true;
    
    // Tentar fullscreen
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('Fullscreen não disponível:', err);
        });
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
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
            
        case Sync.EVENTS.REVEAL_QUESTION:
            revealQuestionOnDisplay(data.questionText);
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
            clearWrongGuesses(); // Limpar wrong guesses da ronda anterior
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
            
        case Sync.EVENTS.STEAL_SUCCESS:
            handleStealSuccess(data);
            break;
            
        case Sync.EVENTS.STEAL_FAIL:
            handleStealFail(data);
            break;
            
        case Sync.EVENTS.WRONG_GUESS:
            showWrongGuess(data.guess, data.teamIndex);
            break;
            
        case Sync.EVENTS.AWARD_POINTS:
            animatePointsToTeam(data.teamIndex, data.points, data.newScore);
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
                    <div class="team-name">${escapeHtml(team.name) || 'Equipa'}</div>
                    <div class="team-powerups">
                        <span class="powerup-icon ${!powerups.pass ? 'used' : ''}" title="Passar Vez">🔄</span>
                        <span class="powerup-icon ${!powerups.extra ? 'used' : ''}" title="Resposta Extra">➕</span>
                    </div>
                </div>
                <div class="team-score" id="score${i}">${team.score || 0}</div>
            </div>
        `;
    }).join('');
    
    // Render wrong guesses containers
    renderWrongGuessesContainers();
}

function renderWrongGuessesContainers() {
    const container = document.getElementById('wrongGuessesContainer');
    if (!container || !gameState || !gameState.teams) return;
    
    // Criar um container para cada equipa
    container.innerHTML = gameState.teams.map((team, i) => {
        const position = i === 0 ? 'left' : 'right';
        return `<div class="team-wrong-guesses ${position}" id="wrongGuesses${i}"></div>`;
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
        const mult = round.multiplier || 1;
        if (mult > 1) {
            multiplier.textContent = `${mult}x PONTOS`;
            multiplier.classList.add('visible');
        } else {
            multiplier.classList.remove('visible');
        }
    }
    
    // Mostrar pergunta APENAS se foi revelada pelo host
    const questionDisplay = document.getElementById('questionDisplay');
    const questionText = document.getElementById('questionText');
    
    if (questionDisplay && questionText) {
        if (round.questionRevealed) {
            questionDisplay.classList.add('visible');
            questionText.textContent = round.question.text || '';
        } else {
            questionDisplay.classList.remove('visible');
            questionText.textContent = '';
        }
    }
    
    // Render answer board
    renderAnswerBoard(round);
    
    // Update round points
    updateRoundPoints();
}

function revealQuestionOnDisplay(questionText) {
    const questionDisplay = document.getElementById('questionDisplay');
    const questionTextEl = document.getElementById('questionText');
    
    if (questionDisplay && questionTextEl) {
        questionTextEl.textContent = questionText || '';
        questionDisplay.classList.add('visible');
        
        // Animação
        questionDisplay.style.animation = 'none';
        setTimeout(() => {
            questionDisplay.style.animation = 'slideDown 0.5s ease';
        }, 10);
    }
    
    // Atualizar estado local
    if (gameState && gameState.rounds && gameState.rounds[gameState.currentRound]) {
        gameState.rounds[gameState.currentRound].questionRevealed = true;
    }
}

function renderAnswerBoard(round) {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    const answerBoard = document.querySelector('.answer-board');
    
    if (!leftColumn || !rightColumn) return;
    if (!round || !round.question || !round.question.answers) return;
    
    // As respostas já vêm filtradas e ordenadas do menu.js
    const answers = round.question.answers;
    const totalAnswers = answers.length;
    
    // Garantir que stolen existe
    const stolen = round.stolen || [];
    
    // Adicionar/remover classe para centrar quando há 4 ou menos respostas
    if (answerBoard) {
        if (totalAnswers <= 4) {
            answerBoard.classList.add('single-column');
        } else {
            answerBoard.classList.remove('single-column');
        }
    }
    
    // Calcular quantas respostas em cada coluna
    // Esquerda: primeiros 4 (ou todas se <=4)
    // Direita: 5, 6, 7, 8 (se existirem)
    
    let leftHtml = '';
    let rightHtml = '';
    
    // Renderizar respostas: primeiros 4 na esquerda, resto na direita
    for (let i = 0; i < totalAnswers; i++) {
        const answer = answers[i];
        const isRevealed = round.revealed && round.revealed[i];
        const isStolen = stolen[i]; // Resposta revelada por roubo (cinzento)
        const hasAnswer = answer && answer.text && answer.text.trim() !== '';
        
        const panelHtml = isRevealed ? `
            <div class="answer-panel revealed ${isStolen ? 'stolen' : ''}" id="answer${i}">
                <div class="answer-content">
                    <span class="answer-text">${hasAnswer ? escapeHtml(answer.text) : ''}</span>
                </div>
                <div class="answer-num-box">
                    <span class="answer-points-num">${hasAnswer ? answer.points : ''}</span>
                </div>
            </div>
        ` : `
            <div class="answer-panel hidden" id="answer${i}">
                <div class="answer-num-box">
                    <span class="answer-order-num">${i + 1}</span>
                </div>
            </div>
        `;
        
        // Se temos 4 ou menos respostas: todas na esquerda
        if (totalAnswers <= 4) {
            leftHtml += panelHtml;
        } else {
            // 5-8 respostas: primeiros 4 (índices 0-3) na esquerda, resto (4-7) na direita
            if (i < 4) {
                leftHtml += panelHtml;
            } else {
                rightHtml += panelHtml;
            }
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
    
    // Obter informação sobre stolen
    const round = gameState.rounds[gameState.currentRound];
    if (!round) return;
    
    const isStolen = round.stolen && round.stolen[index];
    const hasAnswer = answer && answer.text && answer.text.trim() !== '';
    
    // Recriar o HTML completo do painel quando revelado
    panel.className = `answer-panel revealed ${isStolen ? 'stolen' : ''}`;
    panel.innerHTML = `
        <div class="answer-content">
            <span class="answer-text">${hasAnswer ? escapeHtml(answer.text) : ''}</span>
        </div>
        <div class="answer-num-box">
            <span class="answer-points-num">${hasAnswer ? answer.points : ''}</span>
        </div>
    `;
    
    // Show points popup - passa o índice para posicionar
    if (answer && answer.points) {
        showPointsPopup(answer.points, index);
    }
    
    // Update game state locally
    if (gameState && gameState.rounds && gameState.rounds[gameState.currentRound] && gameState.rounds[gameState.currentRound].revealed) {
        gameState.rounds[gameState.currentRound].revealed[index] = true;
    }
    
    // Update round points display
    updateRoundPoints();
}

function showPointsPopup(points, answerIndex) {
    const popup = document.getElementById('pointsPopup');
    if (!popup) return;
    
    const value = popup.querySelector('.points-value');
    if (!value) return;
    
    // Posicionar o popup perto da resposta revelada
    const answerPanel = document.getElementById(`answer${answerIndex}`);
    if (answerPanel) {
        const rect = answerPanel.getBoundingClientRect();
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top + rect.height / 2}px`;
        popup.style.transform = 'translate(-50%, -50%)';
    } else {
        // Fallback para o centro
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
    }
    
    value.textContent = `+${points}`;
    popup.classList.add('active');
    
    // Hide after animation
    setTimeout(() => {
        popup.classList.remove('active');
    }, 1200);
}

function updateRoundPoints() {
    // Reload state to get latest
    gameState = Storage.getGameState();
    
    if (!gameState) return;
    
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    
    const multiplier = round.multiplier || 1;
    const stolen = round.stolen || [];
    let total = 0;
    round.revealed.forEach((isRevealed, i) => {
        const answer = round.question.answers[i];
        // Não contar respostas stolen (reveladas a cinzento)
        if (isRevealed && !stolen[i] && answer && typeof answer.points === 'number') {
            total += answer.points * multiplier;
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
    
    // Show overlay
    overlay.classList.add('active');
    
    // Mostrar TODOS os strikes até count (não resetar os anteriores)
    for (let i = 1; i <= 3; i++) {
        const strike = document.getElementById(`strike${i}`);
        if (strike) {
            if (i <= count) {
                // Adicionar com delay progressivo para animação
                setTimeout(() => {
                    strike.classList.add('visible');
                }, i * 100);
            } else {
                strike.classList.remove('visible');
            }
        }
    }
    
    // Hide overlay after delay (mas manter os strikes visíveis)
    setTimeout(() => {
        overlay.classList.remove('active');
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

function animatePointsToTeam(teamIndex, points, newScore) {
    const roundPointsEl = document.getElementById('roundPoints');
    const teamPanel = document.getElementById(`team${teamIndex}`);
    const scoreEl = document.getElementById(`score${teamIndex}`);
    
    if (!teamPanel || !scoreEl) {
        // Fallback: just update the score
        updateTeamScore(teamIndex, newScore);
        return;
    }
    
    // Obter posições
    const startRect = roundPointsEl ? roundPointsEl.getBoundingClientRect() : { 
        left: window.innerWidth / 2, 
        top: window.innerHeight / 2,
        width: 0,
        height: 0
    };
    const endRect = scoreEl.getBoundingClientRect();
    
    // Criar elemento flutuante de pontos
    const flyingPoints = document.createElement('div');
    flyingPoints.className = 'flying-points';
    flyingPoints.textContent = `+${points}`;
    
    // Posicionar no centro (onde estão os round-points)
    flyingPoints.style.left = `${startRect.left + startRect.width / 2}px`;
    flyingPoints.style.top = `${startRect.top + startRect.height / 2}px`;
    
    document.body.appendChild(flyingPoints);
    
    // Esconder o round-points temporariamente
    if (roundPointsEl) {
        roundPointsEl.classList.remove('visible');
    }
    
    // Forçar reflow
    flyingPoints.offsetHeight;
    
    // Animar para a posição do score da equipa
    flyingPoints.style.left = `${endRect.left + endRect.width / 2}px`;
    flyingPoints.style.top = `${endRect.top + endRect.height / 2}px`;
    flyingPoints.classList.add('animate');
    
    // Quando animação terminar, atualizar score e remover elemento
    setTimeout(() => {
        updateTeamScore(teamIndex, newScore);
        flyingPoints.remove();
    }, 800);
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
    if (display) {
        display.classList.remove('visible');
    }
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
    
    // Usar textContent é seguro contra XSS
    teamEl.textContent = data.teamName || 'Vencedor';
    scoreEl.textContent = `${data.score || 0} PONTOS`;
    
    overlay.classList.add('active');
    
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

// ============================================
// STEAL MODE
// ============================================

function handleStealSuccess(data) {
    // Atualizar gameState local
    gameState = Storage.getGameState();
    
    // Mostrar animação de roubo
    showStealAnimation(true, data.teamIndex, data.points);
    
    // Atualizar scoreboard
    updateTeamScore(data.teamIndex, gameState.teams[data.teamIndex]?.score || 0);
    
    // Renderizar respostas com as roubadas a cinzento
    renderCurrentRound();
}

function handleStealFail(data) {
    // Atualizar gameState local
    gameState = Storage.getGameState();
    
    // Se há pontos, a equipa dos strikes fica com eles
    if (data.points > 0 && data.strikeTeamIndex !== undefined) {
        // Mostrar animação - equipa dos strikes ganha
        const teamName = gameState.teams[data.strikeTeamIndex]?.name || 'Equipa';
        showStealFailWithPoints(teamName, data.strikeTeamIndex, data.points);
        
        // Atualizar scoreboard
        updateTeamScore(data.strikeTeamIndex, gameState.teams[data.strikeTeamIndex]?.score || 0);
        
        // Animar pontos voando para a equipa
        setTimeout(() => {
            animatePointsToTeam(data.strikeTeamIndex, data.points, gameState.teams[data.strikeTeamIndex]?.score || 0);
        }, 1500);
    } else {
        // Sem pontos - apenas mostrar falha
        showStealAnimation(false, null, 0);
    }
    
    // Renderizar respostas com todas as não-reveladas a cinzento
    renderCurrentRound();
}

function showStealAnimation(success, teamIndex, points) {
    const overlay = document.createElement('div');
    overlay.className = 'steal-overlay';
    
    if (success) {
        const teamName = gameState.teams[teamIndex]?.name || 'Equipa';
        overlay.innerHTML = `
            <div class="steal-content success">
                <div class="steal-icon">🏴‍☠️</div>
                <div class="steal-text">ROUBADO!</div>
                <div class="steal-team">${escapeHtml(teamName)}</div>
                <div class="steal-points">+${points} PONTOS</div>
            </div>
        `;
    } else {
        overlay.innerHTML = `
            <div class="steal-content fail">
                <div class="steal-icon">❌</div>
                <div class="steal-text">ROUBO FALHADO!</div>
                <div class="steal-subtext">Ninguém ganha os pontos</div>
            </div>
        `;
    }
    
    document.body.appendChild(overlay);
    
    // Animação de entrada
    setTimeout(() => overlay.classList.add('active'), 50);
    
    // Remover após 3 segundos
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 500);
    }, 3000);
}

function showStealFailWithPoints(teamName, teamIndex, points) {
    const overlay = document.createElement('div');
    overlay.className = 'steal-overlay';
    
    overlay.innerHTML = `
        <div class="steal-content fail">
            <div class="steal-icon">❌</div>
            <div class="steal-text">ROUBO FALHADO!</div>
            <div class="steal-team">${escapeHtml(teamName)}</div>
            <div class="steal-subtext">fica com +${points} pontos</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Animação de entrada
    setTimeout(() => overlay.classList.add('active'), 50);
    
    // Remover após 3 segundos
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 500);
    }, 3000);
}

// ============================================
// WRONG GUESS DISPLAY
// ============================================

function showWrongGuess(guess, teamIndex) {
    if (!guess) return;
    
    // Usar teamIndex passado, ou fallback para controllingTeam do gameState
    const team = teamIndex !== undefined ? teamIndex : (gameState ? gameState.controllingTeam : 0);
    
    // Criar overlay temporário para mostrar a resposta errada (flash no centro)
    const overlay = document.createElement('div');
    overlay.className = 'wrong-guess-overlay';
    overlay.innerHTML = `
        <div class="wrong-guess-content">
            <div class="wrong-guess-text">${escapeHtml(guess)}</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Animação de entrada
    setTimeout(() => overlay.classList.add('active'), 50);
    
    // Remover após o strike desaparecer (2 segundos)
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }, 2000);
    
    // Adicionar permanentemente à lista da equipa
    addWrongGuessToTeam(guess, team);
}

function addWrongGuessToTeam(guess, teamIndex) {
    if (teamIndex === undefined || teamIndex === null) return;
    
    const container = document.getElementById(`wrongGuesses${teamIndex}`);
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'wrong-guess-item';
    item.textContent = guess;
    
    container.appendChild(item);
}

function clearWrongGuesses() {
    // Limpar todas as listas de wrong guesses (chamado quando muda de ronda)
    if (!gameState || !gameState.teams) return;
    
    gameState.teams.forEach((team, i) => {
        const container = document.getElementById(`wrongGuesses${i}`);
        if (container) container.innerHTML = '';
    });}