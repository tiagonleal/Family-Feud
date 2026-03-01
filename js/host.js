/* ============================================
   FAMILY FEUD - HOST LOGIC
   ============================================ */

let gameState = null;
let timerInterval = null;
let currentTimer = 20;
let isPaused = false;
let isStealMode = false;
let extraAnswerActive = false;
let hasRequestedFullscreen = false;

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
    
    // Verificar se o estado do jogo é válido
    if (!gameState.teams || gameState.teams.length < 2 || !gameState.rounds || gameState.rounds.length === 0) {
        alert('Estado do jogo inválido! Precisas de pelo menos 2 equipas.');
        Storage.clearGameState();
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize
    currentTimer = gameState.timer;
    
    // Setup sync listener
    Sync.onMessage(handleSyncMessage);
    
    // Initial render
    renderAll();
    
    // Sync state to display
    syncState();
    
    // Add log entry
    addLog('Jogo iniciado');
    
    // Se está em face-off, iniciar automaticamente (delay para dar tempo ao display abrir)
    if (gameState.phase === 'faceoff' && gameState.controllingTeam === null) {
        setTimeout(() => {
            startFaceoff();
        }, 2000);
    }
    
    // Tentar fullscreen automático - precisa de interação do utilizador
    document.addEventListener('click', requestHostFullscreenOnce, { once: true });
    document.addEventListener('keypress', requestHostFullscreenOnce, { once: true });
}

function requestHostFullscreenOnce() {
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
                <div class="host-team-name">${escapeHtml(team.name)}</div>
                <div class="host-team-players">${team.players && team.players.length > 0 ? team.players.map(p => escapeHtml(p)).join(', ') : 'Sem jogadores'}</div>
            </div>
            <div class="host-team-score-area">
                <button class="btn-score-adjust" onclick="adjustScore(${i}, -10)" title="-10 pontos">-</button>
                <div class="host-team-score" id="hostScore${i}">${team.score || 0}</div>
                <button class="btn-score-adjust" onclick="adjustScore(${i}, 10)" title="+10 pontos">+</button>
            </div>
        </div>
    `).join('');
}

function renderQuestion() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question) return;
    
    const questionEl = document.getElementById('currentQuestion');
    if (questionEl) {
        const isRevealed = round.questionRevealed;
        questionEl.innerHTML = `
            <div class="question-text" id="questionText">
                ${escapeHtml(round.question.text) || '(sem pergunta)'}
            </div>
            ${!isRevealed ? '<div class="question-hidden-notice">⚠️ A pergunta ainda NÃO aparece no ecrã público</div>' : '<div class="question-revealed-badge">✓ Visível no ecrã</div>'}
            <div class="question-controls">
                ${!isRevealed ? `<button class="btn-reveal-question" onclick="revealQuestion()">👁️ Revelar no Ecrã</button>` : ''}
                <button class="btn-skip" onclick="skipQuestion()">⏭️ Saltar Pergunta</button>
            </div>
        `;
    }
}

function renderAnswers() {
    const container = document.getElementById('answersGrid');
    if (!container) return;
    
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    // Garantir que revealed existe
    if (!round.revealed) {
        round.revealed = Array(round.question.answers.length).fill(false);
    }
    
    // Garantir que stolen existe
    if (!round.stolen) {
        round.stolen = [];
    }
    
    // Esconder botão "Revelar Todas" se a ronda já terminou
    const btnRevealAll = document.getElementById('btnRevealAll');
    if (btnRevealAll) {
        const allRevealed = round.question.answers.every((a, i) => {
            return !a || !a.text || !a.text.trim() || round.revealed[i];
        });
        btnRevealAll.style.display = (allRevealed || round.pointsAwarded) ? 'none' : '';
    }
    
    // Reorganizar respostas para o grid CSS (2 colunas)
    // O grid coloca items em ordem: [1,5], [2,6], [3,7], [4,8]
    // Então precisamos intercalar: esquerda[0], direita[0], esquerda[1], direita[1]...
    const totalAnswers = round.question.answers.length;
    
    const renderAnswer = (i) => {
        const answer = round.question.answers[i] || { text: '', points: 0 };
        const hasText = answer.text && answer.text.trim() !== '';
        const isRevealed = round.revealed[i];
        const isStolen = round.stolen[i];
        
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
            <div class="host-answer ${isRevealed ? 'revealed' : ''} ${isStolen ? 'stolen' : ''}" 
                 onclick="${isRevealed ? '' : `revealAnswer(${i})`}">
                <span class="answer-num-badge">${i + 1}</span>
                <div class="answer-info">
                    <div class="answer-text-host">${escapeHtml(answer.text)}</div>
                    <div class="answer-points-host">${answer.points} pontos${isStolen ? ' (não conta)' : ''}</div>
                </div>
            </div>
        `;
    };
    
    let html = '';
    
    if (totalAnswers <= 4) {
        // 4 ou menos: ordem normal 1,2,3,4
        for (let i = 0; i < totalAnswers; i++) {
            html += renderAnswer(i);
        }
    } else {
        // 5-8: intercalar para grid - [1,5], [2,6], [3,7], [4,8]
        // Esquerda: índices 0,1,2,3  Direita: índices 4,5,6,7
        const leftCount = 4;
        const rightCount = totalAnswers - 4;
        const maxRows = Math.max(leftCount, rightCount);
        
        for (let row = 0; row < maxRows; row++) {
            // Coluna esquerda (índice row)
            if (row < leftCount) {
                html += renderAnswer(row);
            } else {
                html += '<div class="host-answer empty" style="visibility: hidden;"></div>';
            }
            // Coluna direita (índice 4 + row)
            if (row < rightCount) {
                html += renderAnswer(4 + row);
            } else {
                // Placeholder para manter o grid alinhado
                html += '<div class="host-answer empty" style="visibility: hidden;"></div>';
            }
        }
    }
    
    container.innerHTML = html;
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
    if (!container) return; // Container removido do layout
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => `
        <button class="btn-team ${gameState.controllingTeam === i ? 'active' : ''}"
                onclick="setControllingTeam(${i})">
            ${escapeHtml(team.name)}
        </button>
    `).join('');
}

function renderAwardButtons() {
    const container = document.getElementById('awardButtons');
    if (!container) return;
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => `
        <button class="btn-award" onclick="awardPoints(${i})">
            🏆 Dar pontos a ${escapeHtml(team.name)}
        </button>
    `).join('');
}

function renderPowerups() {
    const container = document.getElementById('powerupsGrid');
    if (!container) return;
    
    if (!gameState.teams || gameState.teams.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = gameState.teams.map((team, i) => {
        const powerups = team.powerups || { pass: false, extra: false };
        return `
            <div class="powerup-row">
                <span class="powerup-team-name">${escapeHtml(team.name) || 'Equipa'}</span>
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
        const mult = round.multiplier || 1;
        if (mult > 1) {
            multiplierBadge.textContent = `${mult}x`;
        } else {
            multiplierBadge.textContent = '';
        }
    }
}

function updateRoundPoints() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    
    const multiplier = round.multiplier || 1;
    const stolen = round.stolen || [];
    let total = 0;
    round.revealed.forEach((isRevealed, i) => {
        const answer = round.question.answers[i];
        // Não contar respostas stolen
        if (isRevealed && !stolen[i] && answer && typeof answer.points === 'number') {
            total += answer.points * multiplier;
        }
    });
    
    const pointsDisplay = document.getElementById('roundPointsDisplay');
    if (pointsDisplay) pointsDisplay.textContent = total;
}

// ============================================
// ANSWER REVEAL
// ============================================

// Face-off state
let faceoffState = {
    phase: 'buzzer',           // buzzer, answering, checking-better, answering-other
    buzzerTeam: null,          // Equipa que carregou no buzzer
    buzzerAnswer: null,        // Resposta da equipa do buzzer (index ou null se errou)
    currentTeamIndex: 0,       // Índice na teamsOrder
    teamsOrder: [],            // Ordem das outras equipas (exclui buzzerTeam)
    waitingForAnswer: false,   // Está à espera de clique na resposta
    bestAnswer: null,          // Melhor resposta encontrada (menor índice)
    bestTeam: null             // Equipa com a melhor resposta
};

function revealAnswer(index) {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    if (round.revealed[index]) return;
    
    const answer = round.question.answers[index];
    if (!answer || !answer.text || !answer.text.trim()) return;
    
    // Se está em face-off e à espera de resposta
    if (gameState.phase === 'faceoff' && faceoffState.waitingForAnswer) {
        // Revelar a resposta
        round.revealed[index] = true;
        Storage.saveGameState(gameState);
        Sync.broadcast(Sync.EVENTS.REVEAL_ANSWER, { index, answer });
        Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'ding' });
        renderAnswers();
        updateRoundPoints();
        
        // Processar resposta do face-off
        handleFaceoffAnswer(index, answer);
        return;
    }
    
    // Se está em face-off mas não está à espera de resposta, ignorar
    if (gameState.phase === 'faceoff') {
        return;
    }
    
    // MODO ROUBAR: Se acertou, rouba com sucesso!
    if (isStealMode) {
        stealSuccess(index);
        return;
    }
    
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
    // Som apenas no display
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'ding' });
    
    // Update UI
    renderAnswers();
    updateRoundPoints();
    
    // Log
    addLog(`Revelado: "${answer.text}" (${answer.points} pts)`);
    
    // Verificar se todas as respostas foram reveladas
    const allRevealed = round.question.answers.every((a, i) => {
        return !a || !a.text || !a.text.trim() || round.revealed[i];
    });
    
    if (allRevealed) {
        // Última resposta revelada - terminar ronda automaticamente
        addLog('Todas as respostas reveladas! Ronda terminada.');
        stopTimer();
        
        // Dar pontos automaticamente à equipa controladora após 1.5s
        setTimeout(() => {
            if (gameState.controllingTeam !== null && !round.pointsAwarded) {
                awardPoints(gameState.controllingTeam);
            }
        }, 1500);
    } else {
        // Timer automático: reset e iniciar após cada resposta revelada
        resetTimer();
        startTimer();
    }
}

// ============================================
// FACE-OFF SYSTEM (Regras originais do programa)
// ============================================

// Helper: obter o nome do jogador atual do face-off para uma equipa
function getCurrentFaceoffPlayer(teamIndex) {
    const team = gameState.teams[teamIndex];
    if (!team || !team.players || team.players.length === 0) return team ? team.name : 'Equipa';

    // Garantir que faceoffPlayerIndices existe
    if (!gameState.faceoffPlayerIndices) {
        gameState.faceoffPlayerIndices = Array(gameState.teams.length).fill(0);
    }

    const playerIndex = gameState.faceoffPlayerIndices[teamIndex] % team.players.length;
    return team.players[playerIndex];
}

// Helper: avançar todos os jogadores do face-off (+1 com wrap)
// Cada equipa avança sequencialmente pelo seu próprio tamanho.
function advanceFaceoffPlayers() {
    if (!gameState.faceoffPlayerIndices) {
        gameState.faceoffPlayerIndices = Array(gameState.teams.length).fill(0);
    }

    gameState.teams.forEach((team, i) => {
        if (!team.players || team.players.length <= 1) {
            gameState.faceoffPlayerIndices[i] = 0;
            return;
        }
        gameState.faceoffPlayerIndices[i] = (gameState.faceoffPlayerIndices[i] + 1) % team.players.length;
    });

    Storage.saveGameState(gameState);
}

function startFaceoff() {
    faceoffState = {
        phase: 'buzzer',           // buzzer, answering, checking-better
        buzzerTeam: null,          // Equipa que carregou no buzzer
        buzzerAnswer: null,        // Resposta da equipa do buzzer (index ou null se errou)
        currentTeamIndex: 0,       // Índice da equipa atual a tentar
        teamsOrder: [],            // Ordem das equipas a tentar (exclui buzzerTeam)
        waitingForAnswer: false,   // Está à espera de clique na resposta
        bestAnswer: null,          // Melhor resposta encontrada até agora
        bestTeam: null             // Equipa com melhor resposta
    };

    // Limpar equipa ativa no display durante face-off (nenhuma está selecionada ainda)
    Sync.broadcast(Sync.EVENTS.CHANGE_TEAM, { teamIndex: -1, isFaceoff: false });

    // Mostrar painel de face-off em vez de popup bloqueante
    showFaceoffPanel();
}

function showFaceoffPanel() {
    // Remove painel anterior se existir
    const existing = document.getElementById('faceoffPanel');
    if (existing) existing.remove();
    const existingOverlay = document.getElementById('faceoffBuzzerOverlay');
    if (existingOverlay) existingOverlay.remove();

    if (!gameState.teams || gameState.teams.length < 2) return;

    // Mostrar jogadores atuais do face-off
    let playersLine = gameState.teams.map((team, i) => {
        const player = getCurrentFaceoffPlayer(i);
        return `<strong>${escapeHtml(player)}</strong> <small>(${escapeHtml(team.name)})</small>`;
    }).join(' vs ');

    let teamButtons = '';
    gameState.teams.forEach((team, i) => {
        const player = getCurrentFaceoffPlayer(i);
        teamButtons += `<button onclick="faceoffBuzzer(${i})" class="btn-faceoff-buzzer" style="background: ${team.color || '#4a90d9'}">
            <span class="faceoff-buzzer-player">${escapeHtml(player)}</span>
            <span class="faceoff-buzzer-team">${escapeHtml(team.name)}</span>
        </button>`;
    });

    // Overlay fullscreen com backdrop para o buzzer
    const overlayHtml = `
        <div class="faceoff-buzzer-overlay" id="faceoffBuzzerOverlay">
            <div class="faceoff-buzzer-backdrop"></div>
            <div class="faceoff-buzzer-content">
                <div class="faceoff-buzzer-header">FACE-OFF</div>
                <div class="faceoff-buzzer-matchup">${playersLine}</div>
                <div class="faceoff-buzzer-question">Quem carregou primeiro?</div>
                <div class="faceoff-buzzer-buttons">
                    ${teamButtons}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);

    // Broadcast matchup para o display público
    const faceoffPlayers = gameState.teams.map((team, i) => ({
        playerName: getCurrentFaceoffPlayer(i),
        teamName: team.name,
        teamColor: team.color || '#4a90d9'
    }));
    Sync.broadcast(Sync.EVENTS.FACEOFF_UPDATE, { phase: 'matchup', players: faceoffPlayers });
}

function hideBuzzerOverlay() {
    const overlay = document.getElementById('faceoffBuzzerOverlay');
    if (overlay) overlay.remove();
}

function updateFaceoffPanel(message, buttons) {
    // Remover overlay do buzzer se existir
    hideBuzzerOverlay();

    // Criar/atualizar painel pequeno lateral
    let panel = document.getElementById('faceoffPanel');
    if (!panel) {
        const panelHtml = `
            <div class="faceoff-panel" id="faceoffPanel">
                <div class="faceoff-panel-header">🔔 FACE-OFF</div>
                <div class="faceoff-panel-content">
                    <p>${message}</p>
                    <div class="faceoff-panel-buttons">${buttons}</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', panelHtml);
    } else {
        const content = panel.querySelector('.faceoff-panel-content');
        if (content) {
            content.innerHTML = `<p>${message}</p><div class="faceoff-panel-buttons">${buttons}</div>`;
        }
    }
}

function hideFaceoffPanel() {
    const panel = document.getElementById('faceoffPanel');
    if (panel) panel.remove();
    hideBuzzerOverlay();
}

function faceoffBuzzer(teamIndex) {
    const team = gameState.teams[teamIndex];
    if (!team) return;

    const player = getCurrentFaceoffPlayer(teamIndex);

    // Guardar equipa do buzzer
    faceoffState.buzzerTeam = teamIndex;
    faceoffState.buzzerAnswer = null;
    faceoffState.bestAnswer = null;
    faceoffState.bestTeam = null;

    // Criar ordem das outras equipas (para quando falham)
    faceoffState.teamsOrder = [];
    for (let i = 1; i < gameState.teams.length; i++) {
        faceoffState.teamsOrder.push((teamIndex + i) % gameState.teams.length);
    }
    faceoffState.currentTeamIndex = 0;

    faceoffState.phase = 'answering';
    faceoffState.waitingForAnswer = true;

    addLog(`🔔 ${player} (${team.name}) carregou primeiro!`);

    // Esconder overlay do face-off no display público
    Sync.broadcast(Sync.EVENTS.FACEOFF_UPDATE, { phase: 'end' });

    // Revelar a pergunta no display automaticamente
    const round = gameState.rounds[gameState.currentRound];
    if (round && round.question && !round.questionRevealed) {
        round.questionRevealed = true;
        Storage.saveGameState(gameState);
        Sync.broadcast(Sync.EVENTS.REVEAL_QUESTION, {
            questionText: round.question.text
        });
        renderAll();
    }

    // Notificar display sobre qual equipa está ativa no face-off
    Sync.broadcast(Sync.EVENTS.CHANGE_TEAM, { teamIndex: teamIndex, isFaceoff: true });

    // Mostrar painel - espera resposta
    updateFaceoffPanel(
        `<strong>${escapeHtml(player)}</strong> <small>(${escapeHtml(team.name)})</small> responde!<br><small>Clica na resposta no quadro ou:</small>`,
        `<button onclick="faceoffMiss(event)" class="btn-faceoff-wrong">✕ ERROU</button>`
    );
}

function handleFaceoffAnswer(index, answer) {
    faceoffState.waitingForAnswer = false;
    
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers) return;
    
    const numAnswers = round.question.answers.filter(a => a && a.text && a.text.trim()).length;
    
    if (faceoffState.phase === 'answering') {
        // Equipa do buzzer acertou
        faceoffState.buzzerAnswer = index;
        faceoffState.bestAnswer = index;
        faceoffState.bestTeam = faceoffState.buzzerTeam;

        const team = gameState.teams[faceoffState.buzzerTeam];
        const player = getCurrentFaceoffPlayer(faceoffState.buzzerTeam);
        addLog(`✓ ${player} (${team.name}) acertou: "${answer.text}" (#${index + 1})`);

        // Se acertou a #1, ganha automaticamente
        if (index === 0) {
            addLog(`🏆 ${player} (${team.name}) acertou a #1!`);
            showPlayOrPassPanel(faceoffState.buzzerTeam);
        } else {
            // Verificar se há possibilidade de acertar melhor (respostas acima ainda não reveladas)
            const canBeatIt = canAnyoneGetBetter(index);

            if (canBeatIt && faceoffState.teamsOrder.length > 0) {
                // Próxima equipa pode tentar acertar melhor
                askIfBetterAnswer();
            } else {
                // Ninguém pode bater, equipa do buzzer ganha
                addLog(`🏆 ${team.name} ganha! (Sem possibilidade de resposta melhor)`);
                showPlayOrPassPanel(faceoffState.buzzerTeam);
            }
        }
    } else if (faceoffState.phase === 'checking-better') {
        // Outra equipa acertou uma resposta enquanto tentava bater a melhor
        const currentTeamIdx = faceoffState.teamsOrder[faceoffState.currentTeamIndex];
        const currentTeam = gameState.teams[currentTeamIdx];
        if (!currentTeam) return;

        const player = getCurrentFaceoffPlayer(currentTeamIdx);
        addLog(`✓ ${player} (${currentTeam.name}) acertou: "${answer.text}" (#${index + 1})`);

        // Verificar se é melhor
        if (index < faceoffState.bestAnswer) {
            faceoffState.bestAnswer = index;
            faceoffState.bestTeam = currentTeamIdx;
            addLog(`🎯 ${currentTeam.name} tem agora a melhor resposta!`);
        }

        // Se acertou a #1, essa equipa ganha
        if (index === 0) {
            addLog(`🏆 ${currentTeam.name} acertou a #1!`);
            showPlayOrPassPanel(currentTeamIdx);
        } else {
            // Verificar se ainda há mais equipas e possibilidade de melhor
            faceoffState.currentTeamIndex++;
            const canBeatIt = canAnyoneGetBetter(faceoffState.bestAnswer);

            if (canBeatIt && faceoffState.currentTeamIndex < faceoffState.teamsOrder.length) {
                askIfBetterAnswer();
            } else {
                // Não há mais equipas ou não há como bater - vencedor é bestTeam
                decideFaceoffWinner();
            }
        }
    } else if (faceoffState.phase === 'answering-other') {
        // Outra equipa (não buzzer) acertou depois do buzzer ter errado
        const currentTeamIdx = faceoffState.teamsOrder[faceoffState.currentTeamIndex];
        const currentTeam = gameState.teams[currentTeamIdx];
        if (!currentTeam) return;

        const player = getCurrentFaceoffPlayer(currentTeamIdx);
        addLog(`✓ ${player} (${currentTeam.name}) acertou: "${answer.text}" (#${index + 1})`);

        faceoffState.bestAnswer = index;
        faceoffState.bestTeam = currentTeamIdx;

        // Se acertou a #1, ganha automaticamente
        if (index === 0) {
            addLog(`🏆 ${currentTeam.name} acertou a #1!`);
            showPlayOrPassPanel(currentTeamIdx);
        } else {
            // Verificar se outras equipas podem tentar acertar melhor
            faceoffState.currentTeamIndex++;
            const canBeatIt = canAnyoneGetBetter(index);

            if (canBeatIt && faceoffState.currentTeamIndex < faceoffState.teamsOrder.length) {
                // Mudar para fase de verificar se alguém bate
                askIfBetterAnswer();
            } else {
                // Esta equipa ganha
                addLog(`🏆 ${currentTeam.name} ganha!`);
                showPlayOrPassPanel(faceoffState.bestTeam);
            }
        }
    }
}

function canAnyoneGetBetter(currentBest) {
    // Verifica se existe alguma resposta melhor (índice menor) ainda não revelada
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return false;
    
    for (let i = 0; i < currentBest; i++) {
        const answer = round.question.answers[i];
        if (answer && answer.text && answer.text.trim() && !round.revealed[i]) {
            return true;
        }
    }
    return false;
}

function askIfBetterAnswer() {
    const nextTeamIndex = faceoffState.teamsOrder[faceoffState.currentTeamIndex];
    const nextTeam = gameState.teams[nextTeamIndex];
    const bestTeam = gameState.teams[faceoffState.bestTeam];
    if (!nextTeam || !bestTeam) return;

    const player = getCurrentFaceoffPlayer(nextTeamIndex);

    faceoffState.phase = 'checking-better';
    faceoffState.waitingForAnswer = true;

    // Notificar display sobre qual equipa está ativa no face-off
    Sync.broadcast(Sync.EVENTS.CHANGE_TEAM, { teamIndex: nextTeamIndex, isFaceoff: true });

    addLog(`❓ ${player} (${nextTeam.name}) tenta acertar melhor que #${faceoffState.bestAnswer + 1}...`);

    // Se só há uma equipa a mais, só pode dizer "não acertou"
    // Se há mais equipas, pode dizer "errou" (perdeu vez) ou revelar resposta
    const remainingTeams = faceoffState.teamsOrder.length - faceoffState.currentTeamIndex;

    let buttons = '';
    if (remainingTeams === 1) {
        buttons = `<button onclick="faceoffDidNotBeat(event)" class="btn-faceoff-wrong">✕ Não acertou melhor</button>`;
    } else {
        buttons = `<button onclick="faceoffMiss(event)" class="btn-faceoff-wrong">✕ ERROU (próxima equipa tenta)</button>`;
    }

    updateFaceoffPanel(
        `<strong>${escapeHtml(player)}</strong> <small>(${escapeHtml(nextTeam.name)})</small> acertou melhor que #${faceoffState.bestAnswer + 1}?<br><small>${escapeHtml(bestTeam.name)} tem a #${faceoffState.bestAnswer + 1}. Clica na resposta se acertou ou:</small>`,
        buttons
    );
}

function faceoffMiss(evt) {
    // Desabilitar botão imediatamente para prevenir double-clicks
    const btn = evt?.target;
    if (btn) btn.disabled = true;
    
    // Verificar se realmente estamos à espera de uma resposta
    if (!faceoffState.waitingForAnswer) {
        console.log('faceoffMiss chamado mas waitingForAnswer é false');
        return;
    }
    
    faceoffState.waitingForAnswer = false;
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'buzzer' });
    
    if (faceoffState.phase === 'answering') {
        // Equipa do buzzer errou
        const team = gameState.teams[faceoffState.buzzerTeam];
        if (!team) return;

        const player = getCurrentFaceoffPlayer(faceoffState.buzzerTeam);
        addLog(`✕ ${player} (${team.name}) errou!`);
        faceoffState.buzzerAnswer = null;

        // Próxima equipa tenta
        if (faceoffState.teamsOrder.length > 0) {
            const nextTeamIndex = faceoffState.teamsOrder[0];
            const nextTeam = gameState.teams[nextTeamIndex];
            const nextPlayer = getCurrentFaceoffPlayer(nextTeamIndex);

            // A próxima equipa agora tenta responder
            faceoffState.currentTeamIndex = 0;
            faceoffState.phase = 'answering-other';
            faceoffState.waitingForAnswer = true;

            // Notificar display sobre qual equipa está ativa
            Sync.broadcast(Sync.EVENTS.CHANGE_TEAM, { teamIndex: nextTeamIndex, isFaceoff: true });

            updateFaceoffPanel(
                `<strong>${escapeHtml(nextPlayer)}</strong> <small>(${escapeHtml(nextTeam.name)})</small> responde!<br><small>Clica na resposta ou:</small>`,
                `<button onclick="faceoffOtherMiss(event)" class="btn-faceoff-wrong">✕ ERROU</button>`
            );
        }
    } else if (faceoffState.phase === 'checking-better') {
        // Equipa tentando bater errou - próxima tenta
        const teamIdx = faceoffState.teamsOrder[faceoffState.currentTeamIndex];
        const team = gameState.teams[teamIdx];
        if (!team) return;

        const player = getCurrentFaceoffPlayer(teamIdx);
        addLog(`✕ ${player} (${team.name}) errou!`);

        faceoffState.currentTeamIndex++;

        if (faceoffState.currentTeamIndex < faceoffState.teamsOrder.length) {
            // Ainda há mais equipas
            askIfBetterAnswer();
        } else {
            // Não há mais equipas - vencedor é bestTeam
            decideFaceoffWinner();
        }
    }
}

function faceoffOtherMiss(evt) {
    // Desabilitar botão imediatamente para prevenir double-clicks
    const btn = evt?.target;
    if (btn) btn.disabled = true;
    
    // Verificar se realmente estamos à espera de uma resposta
    if (!faceoffState.waitingForAnswer) {
        console.log('faceoffOtherMiss chamado mas waitingForAnswer é false');
        return;
    }
    
    faceoffState.waitingForAnswer = false;
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'buzzer' });
    
    // Obter equipa atual
    const currentTeamIdx = faceoffState.teamsOrder[faceoffState.currentTeamIndex];
    const team = gameState.teams[currentTeamIdx];
    if (!team) return;

    const player = getCurrentFaceoffPlayer(currentTeamIdx);
    addLog(`✕ ${player} (${team.name}) errou!`);
    
    faceoffState.currentTeamIndex++;
    
    // Verificar se alguém já acertou
    if (faceoffState.bestTeam !== null) {
        // Alguém já acertou - verificar se todas as equipas já tentaram
        if (faceoffState.currentTeamIndex >= faceoffState.teamsOrder.length) {
            // Todas as equipas já tentaram, decide vencedor
            decideFaceoffWinner();
        } else {
            // Ainda há equipas para tentar bater
            askIfBetterAnswer();
        }
    } else {
        // Ninguém acertou ainda
        if (faceoffState.currentTeamIndex >= faceoffState.teamsOrder.length) {
            // Todas erraram - recomeçar alternância
            allTeamsMissed();
        } else {
            // Próxima equipa tenta
            askNextTeamToAnswer();
        }
    }
}

function faceoffDidNotBeat(evt) {
    // Desabilitar botão imediatamente para prevenir double-clicks
    const btn = evt?.target;
    if (btn) btn.disabled = true;
    
    // Última equipa não conseguiu bater - vencedor é bestTeam
    if (!faceoffState.waitingForAnswer) {
        console.log('faceoffDidNotBeat chamado mas waitingForAnswer é false');
        return;
    }
    
    faceoffState.waitingForAnswer = false;
    const team = gameState.teams[faceoffState.teamsOrder[faceoffState.currentTeamIndex]];
    if (!team) return;
    
    addLog(`${team.name} não acertou melhor`);
    decideFaceoffWinner();
}

function allTeamsMissed() {
    // Todas as equipas erraram - avançar para os próximos jogadores
    advanceFaceoffPlayers();

    addLog(`⚠️ Todos erraram! Próximos jogadores...`);

    // O buzzer já foi carregado - não voltar a perguntar quem carregou.
    // Apenas avançar jogadores e recomeçar a alternância de respostas,
    // começando pela equipa 0 (ordem circular).
    faceoffState.phase = 'answering-other';
    faceoffState.currentTeamIndex = 0;
    faceoffState.bestAnswer = null;
    faceoffState.bestTeam = null;
    faceoffState.buzzerAnswer = null;
    faceoffState.waitingForAnswer = false;
    // Manter buzzerTeam - o buzzer já aconteceu

    // Reconstruir teamsOrder: todas as equipas em ordem circular
    faceoffState.teamsOrder = [];
    for (let i = 0; i < gameState.teams.length; i++) {
        faceoffState.teamsOrder.push(i);
    }

    // Mostrar matchup no display com os novos jogadores
    const faceoffPlayers = gameState.teams.map((team, i) => ({
        playerName: getCurrentFaceoffPlayer(i),
        teamName: team.name,
        teamColor: team.color || '#4a90d9'
    }));
    Sync.broadcast(Sync.EVENTS.FACEOFF_UPDATE, { phase: 'matchup', players: faceoffPlayers });

    // Mostrar os novos jogadores no host antes de pedir resposta
    let playersLine = gameState.teams.map((team, i) => {
        const player = getCurrentFaceoffPlayer(i);
        return `<strong>${escapeHtml(player)}</strong> <small>(${escapeHtml(team.name)})</small>`;
    }).join(' vs ');

    updateFaceoffPanel(
        `⚠️ Todos erraram! Novos jogadores:<br>${playersLine}`,
        `<button onclick="proceedAfterAllMissed()" class="btn-faceoff-play">▶️ Continuar</button>`
    );
}

function proceedAfterAllMissed() {
    // Pedir resposta à primeira equipa diretamente (sem buzzer)
    askNextTeamToAnswer();
}

function askNextTeamToAnswer() {
    // Próxima equipa a tentar responder
    const nextTeamIndex = faceoffState.teamsOrder[faceoffState.currentTeamIndex];
    const nextTeam = gameState.teams[nextTeamIndex];

    if (!nextTeam) {
        addLog('⚠️ Erro: equipa não encontrada');
        return;
    }

    const player = getCurrentFaceoffPlayer(nextTeamIndex);

    faceoffState.phase = 'answering-other';
    faceoffState.waitingForAnswer = true;

    // Notificar display sobre qual equipa está ativa
    Sync.broadcast(Sync.EVENTS.CHANGE_TEAM, { teamIndex: nextTeamIndex, isFaceoff: true });

    addLog(`🔔 ${player} (${nextTeam.name}) tenta responder...`);

    updateFaceoffPanel(
        `<strong>${escapeHtml(player)}</strong> <small>(${escapeHtml(nextTeam.name)})</small> responde!<br><small>Clica na resposta ou:</small>`,
        `<button onclick="faceoffOtherMiss(event)" class="btn-faceoff-wrong">✕ ERROU</button>`
    );
}

function decideFaceoffWinner() {
    if (faceoffState.bestTeam === null) {
        // Nenhuma resposta foi acertada - não deveria acontecer
        addLog('⚠️ Erro no face-off');
        hideFaceoffPanel();
        return;
    }
    
    const winnerTeam = gameState.teams[faceoffState.bestTeam];
    if (!winnerTeam) return;
    
    addLog(`🏆 ${winnerTeam.name} ganha o face-off com a #${faceoffState.bestAnswer + 1}!`);
    showPlayOrPassPanel(faceoffState.bestTeam);
}

function showPlayOrPassPanel(teamIndex) {
    const team = gameState.teams[teamIndex];
    if (!team || !gameState.teams || gameState.teams.length < 2) return;
    
    hideFaceoffPanel(); // Limpar painel anterior primeiro
    
    let passButtons = '';
    gameState.teams.forEach((t, i) => {
        if (i !== teamIndex) {
            passButtons += `<button onclick="faceoffPass(${i})" class="btn-faceoff-pass">Passar para ${escapeHtml(t.name)}</button>`;
        }
    });
    
    // Recriar o painel
    const panelHtml = `
        <div class="faceoff-panel" id="faceoffPanel">
            <div class="faceoff-panel-header">🏆 VENCEDOR</div>
            <div class="faceoff-panel-content">
                <p><strong>${escapeHtml(team.name)}</strong> ganhou!<br>Jogar ou passar?</p>
                <div class="faceoff-panel-buttons">
                    <button onclick="faceoffPlay(${teamIndex})" class="btn-faceoff-play">▶️ JOGAR</button>${passButtons}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', panelHtml);
}

function faceoffPlay(teamIndex) {
    hideFaceoffPanel();

    const team = gameState.teams[teamIndex];
    if (!team) return;

    // Limpar face-off do display público
    Sync.broadcast(Sync.EVENTS.FACEOFF_UPDATE, { phase: 'end' });

    // Avançar jogadores para o próximo face-off
    advanceFaceoffPlayers();

    setControllingTeam(teamIndex);
    gameState.phase = 'playing';
    Storage.saveGameState(gameState);
    updateRoundInfo();

    // Iniciar timer automaticamente quando a equipa começa a jogar
    resetTimer();
    startTimer();

    addLog(`▶️ ${team.name} joga!`);
}

function faceoffPass(teamIndex) {
    hideFaceoffPanel();

    const team = gameState.teams[teamIndex];
    if (!team) return;

    // Limpar face-off do display público
    Sync.broadcast(Sync.EVENTS.FACEOFF_UPDATE, { phase: 'end' });

    // Avançar jogadores para o próximo face-off
    advanceFaceoffPlayers();

    setControllingTeam(teamIndex);
    gameState.phase = 'playing';
    Storage.saveGameState(gameState);
    updateRoundInfo();

    // Iniciar timer automaticamente quando a equipa começa a jogar
    resetTimer();
    startTimer();

    addLog(`Passou para ${team.name}!`);
}

// ============================================
// QUESTION REVEAL & SKIP
// ============================================

function revealQuestion() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question) return;
    
    round.questionRevealed = true;
    Storage.saveGameState(gameState);
    
    // Sincronizar com display
    Sync.broadcast(Sync.EVENTS.REVEAL_QUESTION, { 
        questionText: round.question.text 
    });
    
    // Re-render
    renderQuestion();
    addLog('📢 Pergunta revelada no ecrã!');
}

function skipQuestion() {
    showConfirm('Saltar Pergunta?', 'A pergunta NÃO será contada como jogada. Podes jogá-la noutra sessão.', () => {
        const round = gameState.rounds[gameState.currentRound];
        if (!round || !round.question) return;
        
        // Limpar estados antes de saltar
        hideFaceoffPanel();
        disableSteal();
        stopTimer();
        
        // NÃO marcar pergunta como usada - o skip serve para não contar
        // A pergunta poderá ser jogada noutra sessão
        
        addLog(`⏭️ Pergunta saltada (não contou): "${round.question.text}"`);
        
        // Avançar para próxima ronda
        if (gameState.currentRound >= gameState.rounds.length - 1) {
            showConfirm('Última Ronda', 'Esta era a última ronda! Terminar o jogo?', () => {
                endGame();
            });
        } else {
            nextRound();
        }
    });
}

function checkRoundComplete() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    
    const allRevealed = round.question.answers.every((a, i) => {
        return !a || !a.text || !a.text.trim() || round.revealed[i];
    });
    
    if (allRevealed) {
        addLog('Todas as respostas reveladas!');
    }
}

function revealAllAnswers() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    
    // Não permitir revelar todas durante face-off
    if (gameState.phase === 'faceoff') {
        showAlert('Erro', 'Não podes revelar todas as respostas durante o face-off!');
        return;
    }
    
    // Não permitir revelar todas em modo roubar
    if (isStealMode) {
        showAlert('Erro', 'Não podes revelar todas em modo roubar!');
        return;
    }
    
    showConfirm('Revelar Todas?', 'Revelar todas as respostas restantes?', () => {
        // Revelar cada resposta com um pequeno delay para animação
        let delay = 0;
        let lastIndex = -1;
        
        round.question.answers.forEach((answer, i) => {
            if (answer && answer.text && answer.text.trim() && !round.revealed[i]) {
                lastIndex = i; // Guardar o índice da última
                setTimeout(() => {
                    round.revealed[i] = true;
                    Storage.saveGameState(gameState);
                    Sync.broadcast(Sync.EVENTS.REVEAL_ANSWER, { index: i, answer });
                    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'ding' });
                    renderAnswers();
                    updateRoundPoints();
                }, delay);
                delay += 300;
            }
        });
        
        // Após revelar todas, terminar ronda automaticamente
        if (lastIndex >= 0) {
            setTimeout(() => {
                addLog('Todas as respostas reveladas! Ronda terminada.');
                stopTimer();
                
                // Dar pontos automaticamente à equipa controladora
                if (gameState.controllingTeam !== null && !round.pointsAwarded) {
                    awardPoints(gameState.controllingTeam);
                }
            }, delay + 500);
        }
    });
}

function addStrike() {
    // Não permitir strikes durante face-off
    if (gameState.phase === 'faceoff') {
        showAlert('Erro', 'Não podes adicionar strikes durante o face-off! Usa os botões "ERROU".');
        return;
    }
    
    // No modo roubar, um erro = roubo falhado
    if (isStealMode) {
        stealFail();
        return;
    }
    
    if (gameState.strikes >= 3) return;
    
    gameState.strikes++;
    const wrongGuessEl = document.getElementById('wrongGuess');
    const wrongGuess = wrongGuessEl ? wrongGuessEl.value.trim() : '';
    
    if (wrongGuess) {
        addLog(`❌ Errado: "${wrongGuess}"`);
        // Envia a resposta errada para o display COM a equipa que errou
        Sync.broadcast(Sync.EVENTS.WRONG_GUESS, { 
            guess: wrongGuess, 
            teamIndex: gameState.controllingTeam 
        });
        if (wrongGuessEl) wrongGuessEl.value = '';
    } else {
        addLog(`❌ Strike ${gameState.strikes}`);
    }
    
    // Save and sync
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.ADD_STRIKE, { count: gameState.strikes });
    // Som apenas no display
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'buzzer' });
    
    // Update UI
    renderStrikes();
    
    // Reset e reiniciar timer após cada strike
    if (timerInterval) {
        stopTimer();
    }
    resetTimer();
    startTimer();
    
    // 3 strikes = modo roubar automático
    if (gameState.strikes >= 3) {
        setTimeout(() => {
            enableSteal();
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
    
    // Reset e reiniciar timer APENAS se não estiver em modo roubar OU face-off
    if (!isStealMode && gameState.phase !== 'faceoff') {
        resetTimer();
        startTimer();
    }
    
    addLog('Strikes limpos');
}

// ============================================
// TEAM MANAGEMENT
// ============================================

function adjustScore(teamIndex, delta) {
    const team = gameState.teams[teamIndex];
    if (!team) return;

    if (typeof team.score !== 'number') team.score = 0;
    team.score = Math.max(0, team.score + delta);

    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.UPDATE_SCORE, { teamIndex, score: team.score });
    renderScoreboard();

    addLog(`✏️ ${team.name}: ${delta > 0 ? '+' : ''}${delta} pontos (total: ${team.score})`);
}

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
        showAlert('Aviso', 'Os pontos desta ronda já foram atribuídos!');
        return;
    }
    
    // Calculate points
    const multiplier = round.multiplier || 1;
    const stolen = round.stolen || [];
    let points = 0;
    if (!round.revealed) {
        showAlert('Erro', 'Estado da ronda inválido!');
        return;
    }
    round.revealed.forEach((isRevealed, i) => {
        const answer = round.question.answers[i];
        // Não contar respostas stolen
        if (isRevealed && !stolen[i] && answer && typeof answer.points === 'number') {
            points += answer.points * multiplier;
        }
    });
    
    if (points === 0) {
        showAlert('Aviso', 'Não há pontos para atribuir!');
        return;
    }
    
    // Marcar como atribuídos
    round.pointsAwarded = true;
    
    // Marcar pergunta como usada nas estatísticas
    if (round.question.id) {
        Storage.markQuestionUsed(round.question.id);
    }
    
    // Award points
    if (typeof team.score !== 'number') team.score = 0;
    team.score += points;
    
    // Save and sync
    Storage.saveGameState(gameState);
    
    // Enviar animação de pontos antes de atualizar o score
    Sync.broadcast(Sync.EVENTS.AWARD_POINTS, { 
        teamIndex, 
        points,
        newScore: team.score 
    });
    // Som apenas no display
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'points' });
    
    // Update UI
    renderScoreboard();
    
    addLog(`${team.name} ganhou ${points} pontos!`);
}

// ============================================
// POWER-UPS
// ============================================

function usePowerup(teamIndex, powerup) {
    const team = gameState.teams[teamIndex];
    if (!team || !team.powerups || !team.powerups[powerup] || gameState.teams.length < 2) return;
    
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
            Sync.broadcast(Sync.EVENTS.ADD_STRIKE, { count: gameState.strikes });
            renderStrikes();
        }
    }
    
    renderPowerups();
}

// ============================================
// STEAL MODE
// ============================================

function enableSteal() {
    // Não permitir modo roubar durante face-off
    if (gameState.phase === 'faceoff') {
        showAlert('Erro', 'Não podes ativar modo roubar durante o face-off!');
        return;
    }
    
    // Validar que há pelo menos 2 equipas
    if (!gameState.teams || gameState.teams.length < 2) {
        showAlert('Erro', 'É necessário pelo menos 2 equipas para modo roubar!');
        return;
    }
    
    // Não permitir se já está em modo roubar
    if (isStealMode) {
        return;
    }
    
    isStealMode = true;

    // Garantir que o timer para ao entrar em modo roubar
    stopTimer();
    
    // Mudar para a outra equipa automaticamente
    // Se controllingTeam é null ou inválido, assumir equipa 0 ficou com strikes
    const currentTeamIndex = gameState.controllingTeam ?? 0;
    // Selecionar próxima equipa em ordem (suporta 2+ equipas)
    const otherTeam = (currentTeamIndex + 1) % gameState.teams.length;
    const currentTeam = gameState.teams[currentTeamIndex];
    const stealingTeam = gameState.teams[otherTeam];
    
    addLog(`🔚 ${currentTeam?.name || 'Equipa'} ficou com 3 strikes!`);
    addLog(`🏴‍☠️ ${stealingTeam?.name || 'Outra equipa'} pode roubar!`);
    
    setControllingTeam(otherTeam);
    
    const stealBtn = document.getElementById('stealBtn');
    if (stealBtn) {
        stealBtn.classList.add('active');
        stealBtn.textContent = '✓ Modo Roubar Ativo';
    }
    
    updateRoundInfo();
    
    // Limpar strikes localmente (não broadcast para evitar conflitos)
    gameState.strikes = 0;
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.ADD_STRIKE, { count: 0 });
    renderStrikes();

    // Show steal panel
    showStealPanel();

    // Timer fixo de 5 segundos para o roubo
    currentTimer = 5;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.textContent = currentTimer;
    startTimer();
}

function showStealPanel() {
    const stealingTeam = gameState.teams[gameState.controllingTeam];
    
    updateFaceoffPanel(
        `🏴‍☠️ <strong>${escapeHtml(stealingTeam?.name || 'Equipa')}</strong> pode roubar!<br>Uma chance apenas!`,
        `<small style="color: #aaa;">Clica numa resposta para acertar, ou "Strike" para errar</small>`
    );
}

function disableSteal() {
    isStealMode = false;
    hideFaceoffPanel();
    const stealBtn = document.getElementById('stealBtn');
    if (stealBtn) {
        stealBtn.classList.remove('active');
        stealBtn.textContent = '🏴‍☠️ Modo Roubar';
    }
    updateRoundInfo();
}

// Roubo bem-sucedido: equipa que roubou ganha os pontos já revelados + revela resto a cinzento
function stealSuccess(correctIndex) {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    
    // Verificar se já foram atribuídos pontos (proteção contra dupla chamada)
    if (round.pointsAwarded) {
        return;
    }
    
    const stealingTeam = gameState.teams[gameState.controllingTeam];
    const multiplier = round.multiplier || 1;
    
    // Marcar a resposta correta
    round.revealed[correctIndex] = true;
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'ding' });

    // Parar timer quando a ronda termina (modo roubar)
    stopTimer();
    
    // Calcular pontos (só as já reveladas, incluindo esta) - NÃO inclui as stolen
    let points = 0;
    round.question.answers.forEach((ans, i) => {
        if (round.revealed[i] && !round.stolen?.[i] && ans && ans.points) {
            points += ans.points * multiplier;
        }
    });
    
    // Marcar ronda como pontos atribuídos
    round.pointsAwarded = true;
    
    // Dar pontos à equipa
    if (stealingTeam) {
        if (typeof stealingTeam.score !== 'number') stealingTeam.score = 0;
        stealingTeam.score += points;
        addLog(`🏴‍☠️ ${stealingTeam.name} roubou ${points} pontos!`);
    }
    
    // Marcar respostas não reveladas como "stolen" (cinzento)
    if (!round.stolen) round.stolen = [];
    round.question.answers.forEach((ans, i) => {
        if (!round.revealed[i] && ans && ans.text && ans.text.trim()) {
            round.stolen[i] = true;
            round.revealed[i] = true; // Marca como revelada para mostrar
        }
    });
    
    // Marcar pergunta como usada
    if (round.question.id) {
        Storage.markQuestionUsed(round.question.id);
    }
    
    // Salvar e sincronizar
    Storage.saveGameState(gameState);
    // Enviar também o evento de revelar a resposta correta para animações do display
    const correctAnswer = round.question.answers[correctIndex];
    if (correctAnswer && correctAnswer.text && correctAnswer.text.trim()) {
        Sync.broadcast(Sync.EVENTS.REVEAL_ANSWER, { index: correctIndex, answer: correctAnswer });
    }
    Sync.broadcast(Sync.EVENTS.STEAL_SUCCESS, { 
        teamIndex: gameState.controllingTeam,
        points,
        stolen: round.stolen
    });
    
    // Atualizar UI
    renderAnswers();
    renderScoreboard();
    updateRoundPoints();
    disableSteal();
    
    addLog('Ronda terminada!');
}

// Roubo falhado: pontos vão para a equipa que perdeu os 3 strikes
function stealFail() {
    const round = gameState.rounds[gameState.currentRound];
    if (!round || !round.question || !round.question.answers || !round.revealed) return;
    
    // Verificar se já foram atribuídos pontos (proteção contra dupla chamada)
    if (round.pointsAwarded) {
        return;
    }
    
    // Parar timer quando a ronda termina (modo roubar)
    stopTimer();
    
    // A equipa que rouba é a controllingTeam atual
    // A equipa que tinha os 3 strikes é a anterior (circular)
    const stealingTeamIndex = gameState.controllingTeam ?? 0;
    const strikeTeamIndex = (stealingTeamIndex - 1 + gameState.teams.length) % gameState.teams.length;
    const strikeTeam = gameState.teams[strikeTeamIndex];
    
    // Calcular pontos revelados (excluindo stolen)
    const multiplier = round.multiplier || 1;
    let points = 0;
    round.question.answers.forEach((ans, i) => {
        if (round.revealed[i] && !round.stolen?.[i] && ans && ans.points) {
            points += ans.points * multiplier;
        }
    });
    
    // Dar pontos à equipa que tinha os 3 strikes
    if (strikeTeam && points > 0) {
        if (typeof strikeTeam.score !== 'number') strikeTeam.score = 0;
        strikeTeam.score += points;
        addLog(`❌ Roubo falhado! ${strikeTeam.name} fica com ${points} pontos.`);
    } else {
        addLog('❌ Roubo falhado!');
    }
    
    // Marcar ronda como terminada
    round.pointsAwarded = true;
    
    // Marcar TODAS as respostas não reveladas como stolen (cinzento)
    if (!round.stolen) round.stolen = [];
    round.question.answers.forEach((ans, i) => {
        if (!round.revealed[i] && ans && ans.text && ans.text.trim()) {
            round.stolen[i] = true;
            round.revealed[i] = true;
        }
    });
    
    // Marcar pergunta como usada
    if (round.question.id) {
        Storage.markQuestionUsed(round.question.id);
    }
    
    // Salvar e sincronizar
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.STEAL_FAIL, { 
        stolen: round.stolen,
        strikeTeamIndex: strikeTeamIndex,
        points: points
    });
    
    // Atualizar UI
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'buzzer' });
    renderAnswers();
    disableSteal();
    
    addLog('Ronda terminada!');
}

// ============================================
// ROUND MANAGEMENT
// ============================================

function nextRound() {
    // Check if there are more rounds
    if (gameState.currentRound >= gameState.rounds.length - 1) {
        showConfirm('Última Ronda', 'Esta é a última ronda! Terminar o jogo?', () => {
            endGame();
        });
        return;
    }
    
    // Verificar se estamos a transitar para rondas duplas
    const currentRound = gameState.rounds[gameState.currentRound];
    const nextRoundData = gameState.rounds[gameState.currentRound + 1];
    const transitionToDouble = currentRound && nextRoundData && 
                               (currentRound.multiplier || 1) === 1 && 
                               (nextRoundData.multiplier || 1) === 2;
    
    // Move to next round
    gameState.currentRound++;
    gameState.strikes = 0;
    gameState.controllingTeam = null;
    gameState.phase = 'faceoff';
    isStealMode = false;
    extraAnswerActive = false;
    
    // Limpar painéis visuais
    hideFaceoffPanel();
    disableSteal();
    stopTimer();
    
    // Reset faceoff state
    faceoffState = {
        phase: 'buzzer',
        buzzerTeam: null,
        buzzerAnswer: null,
        currentTeamIndex: 0,
        teamsOrder: [],
        waitingForAnswer: false,
        bestAnswer: null,
        bestTeam: null
    };
    
    // Se estamos a transitar para rondas duplas, mostrar animação
    if (transitionToDouble) {
        showDoublePointsPopup();
        Sync.broadcast(Sync.EVENTS.DOUBLE_POINTS_TRANSITION, {});
    }
    
    // Save and sync
    Storage.saveGameState(gameState);
    Sync.broadcast(Sync.EVENTS.NEW_ROUND, {});
    Sync.broadcast(Sync.EVENTS.ADD_STRIKE, { count: 0 }); // Limpar strikes no display
    
    // Reset UI
    disableSteal();
    resetTimer();
    
    // Re-render
    renderAll();
    
    addLog(`--- Ronda ${gameState.currentRound + 1} ---`);
    
    // Iniciar face-off automaticamente
    setTimeout(() => {
        startFaceoff();
    }, 500);
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
                Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'tick' });
            }
            
            if (currentTimer <= 0) {
                stopTimer();
                Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'timeup' });
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

function confirmEndGame() {
    showConfirm('Terminar Jogo?', 'Tens a certeza que queres terminar o jogo agora?', () => {
        endGame();
    });
}

function endGame() {
    // Verificar se há equipas
    if (!gameState.teams || gameState.teams.length === 0) {
        showAlert('Erro', 'Nenhuma equipa encontrada!');
        return;
    }
    
    // Find winner (handle ties)
    let maxScore = -1;
    let winners = [];
    
    gameState.teams.forEach((team, i) => {
        const score = team.score || 0;
        if (score > maxScore) {
            maxScore = score;
            winners = [{ index: i, team: team }];
        } else if (score === maxScore) {
            winners.push({ index: i, team: team });
        }
    });
    
    // Verificar se encontrou vencedores
    if (winners.length === 0) {
        showAlert('Erro', 'Erro ao determinar vencedor!');
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
    
    // Som apenas no display
    Sync.broadcast(Sync.EVENTS.PLAY_SOUND, { sound: 'victory' });
    
    addLog(`🎉 ${winnerText} venceu com ${maxScore} pontos!`);
    
    // Show confirmation after animation
    setTimeout(() => {
        showConfirm('🎉 Fim do Jogo!', `${winnerText} venceu com ${maxScore} pontos!\n\nVoltar ao menu principal?`, () => {
            Storage.clearGameState();
            window.location.href = 'index.html';
        });
    }, 2000);
}

// ============================================
// DISPLAY WINDOW
// ============================================

async function openDisplay() {
    // Tentar usar a API de multi-screen para abrir no segundo ecrã
    let left = 0;
    let top = 0;
    let width = 1920;
    let height = 1080;
    
    try {
        // API moderna para detetar múltiplos ecrãs
        if ('getScreenDetails' in window) {
            const screenDetails = await window.getScreenDetails();
            const screens = screenDetails.screens;
            
            // Encontrar um ecrã diferente do atual
            const currentScreen = screenDetails.currentScreen;
            const secondScreen = screens.find(s => s !== currentScreen) || screens[0];
            
            if (secondScreen && secondScreen !== currentScreen) {
                left = secondScreen.availLeft;
                top = secondScreen.availTop;
                width = secondScreen.availWidth;
                height = secondScreen.availHeight;
                addLog(`📺 Display será aberto no segundo ecrã`);
            }
        }
    } catch (err) {
        console.log('Multi-screen API não disponível, usando método padrão');
    }
    
    // Abrir janela no segundo ecrã (ou ecrã atual se não houver segundo)
    const displayWindow = window.open(
        'display.html', 
        'FamilyFeud_Display', 
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,fullscreen=yes`
    );
    
    if (!displayWindow || displayWindow.closed || typeof displayWindow.closed === 'undefined') {
        showAlert('Popup Bloqueado', 'O browser bloqueou a janela do Display!\n\nPor favor, permite popups para este site.\n\nAlternativamente, abre display.html manualmente noutra janela/ecrã.');
    } else {
        // Tentar maximizar e fullscreen a janela do display
        setTimeout(() => {
            try {
                displayWindow.focus();
                // A janela do display tentará fullscreen sozinha ao receber o primeiro clique
            } catch (e) {
                console.log('Erro ao focar display:', e);
            }
        }, 1000);
    }
}

// ============================================
// SYNC
// ============================================

function syncState() {
    Sync.broadcast(Sync.EVENTS.SYNC_STATE, gameState);
}

// ============================================
// LOG (apenas console para debug)
// ============================================

function addLog(message) {
    const time = new Date().toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    console.log(`[${time}] ${message}`);
}

// ============================================
// CONFIRM/ALERT DIALOGS
// ============================================

function showAlert(title, message) {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modal = document.getElementById('confirmModal');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) {
        confirmBtn.textContent = 'OK';
        confirmBtn.onclick = () => {
            closeConfirm();
        };
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (modal) modal.classList.add('active');
}

function showConfirm(title, message, onConfirm) {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modal = document.getElementById('confirmModal');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) {
        confirmBtn.textContent = 'Confirmar';
        confirmBtn.onclick = () => {
            closeConfirm();
            onConfirm();
        };
    }
    if (cancelBtn) cancelBtn.style.display = '';
    if (modal) modal.classList.add('active');
}

function closeConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// DOUBLE POINTS TRANSITION POPUP
// ============================================

function showDoublePointsPopup() {
    // Criar popup rápido no host
    const popup = document.createElement('div');
    popup.className = 'double-points-popup-host';
    popup.innerHTML = `
        <div class="double-popup-content">
            <div class="double-popup-icon">⚡</div>
            <div class="double-popup-text">PONTOS DUPLOS!</div>
            <div class="double-popup-subtext">As próximas rondas valem 2x</div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Animar entrada
    setTimeout(() => popup.classList.add('active'), 50);
    
    // Remover após 2.5 segundos
    setTimeout(() => {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 500);
    }, 2500);
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
