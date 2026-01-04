/* ============================================
   FAMILY FEUD - MENU LOGIC
   ============================================ */

let selectedTeams = 2;
let teamsData = [];

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
    initMenu();
});

function initMenu() {
    // Verifica se há jogo em progresso
    if (Storage.hasActiveGame()) {
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) continueBtn.style.display = 'flex';
    }

    // Setup team selector buttons
    document.querySelectorAll('.team-num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.team-num-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTeams = parseInt(btn.dataset.teams);
            generateTeamConfigs();
        });
    });

    // Initialize with 2 teams
    generateTeamConfigs();
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openNewGame() {
    const modal = document.getElementById('newGameModal');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('newGameModal');
    if (modal) modal.classList.remove('active');
}

function openEditor() {
    window.location.href = 'editor.html';
}

function openConverter() {
    window.location.href = 'converter.html';
}

function continueGame() {
    // Abre as duas janelas do jogo
    openGameWindows();
}

// ============================================
// TEAM CONFIGURATION
// ============================================

function generateTeamConfigs() {
    const container = document.getElementById('teamsConfig');
    const teamColors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00'];
    const teamEmojis = ['🔴', '🔵', '🟢', '🟠'];
    
    teamsData = [];
    
    let html = '';
    for (let i = 0; i < selectedTeams; i++) {
        teamsData.push({
            name: `Equipa ${i + 1}`,
            players: [],
            color: teamColors[i]
        });
        
        html += `
            <div class="team-config" data-team="${i}">
                <h4>${teamEmojis[i]} Equipa ${i + 1}</h4>
                <input type="text" 
                       placeholder="Nome da equipa" 
                       value="Equipa ${i + 1}"
                       onchange="updateTeamName(${i}, this.value)">
                <div class="players-section">
                    <input type="text" 
                           placeholder="Nome do jogador (Enter para adicionar)"
                           id="playerInput${i}"
                           onkeypress="handlePlayerInput(event, ${i})">
                    <div class="players-list" id="playersList${i}"></div>
                </div>
            </div>
        `;
    }
    
    if (container) container.innerHTML = html;
}

function updateTeamName(teamIndex, name) {
    if (!teamsData[teamIndex]) return;
    teamsData[teamIndex].name = name || `Equipa ${teamIndex + 1}`;
}

function handlePlayerInput(event, teamIndex) {
    if (event.key === 'Enter') {
        const input = document.getElementById(`playerInput${teamIndex}`);
        const team = teamsData[teamIndex];
        if (!input || !team) return;
        
        const name = input.value.trim();
        
        if (name && team.players && team.players.length < 20) {
            team.players.push(name);
            input.value = '';
            renderPlayersList(teamIndex);
        }
    }
}

function renderPlayersList(teamIndex) {
    const container = document.getElementById(`playersList${teamIndex}`);
    const team = teamsData[teamIndex];
    if (!container || !team) return;
    
    const players = team.players || [];
    
    container.innerHTML = players.map((player, i) => `
        <span class="player-tag">
            ${escapeHtml(player)}
            <button onclick="removePlayer(${teamIndex}, ${i})">&times;</button>
        </span>
    `).join('');
}

function removePlayer(teamIndex, playerIndex) {
    if (!teamsData[teamIndex] || !teamsData[teamIndex].players) return;
    teamsData[teamIndex].players.splice(playerIndex, 1);
    renderPlayersList(teamIndex);
}

// ============================================
// ROUNDS CONFIGURATION
// ============================================

function changeRounds(type, delta) {
    const input = document.getElementById(type === 'normal' ? 'normalRounds' : 'doubleRounds');
    if (!input) return;
    
    let value = parseInt(input.value) + delta;
    value = Math.max(0, Math.min(20, value));
    input.value = value;
}

function changeTimer(delta) {
    const input = document.getElementById('timerSeconds');
    if (!input) return;
    
    let value = parseInt(input.value) + delta;
    value = Math.max(5, Math.min(120, value));
    input.value = value;
}

// ============================================
// START GAME
// ============================================

function startGame() {
    // Adicionar jogadores pendentes nos inputs antes de validar
    for (let i = 0; i < selectedTeams; i++) {
        const input = document.getElementById(`playerInput${i}`);
        if (input && input.value.trim()) {
            const name = input.value.trim();
            if (!teamsData[i]) teamsData[i] = { name: `Equipa ${i + 1}`, players: [] };
            if (!teamsData[i].players) teamsData[i].players = [];
            if (teamsData[i].players.length < 20) {
                teamsData[i].players.push(name);
                input.value = '';
                renderPlayersList(i);
            }
        }
    }
    
    // Validar configuração
    const questions = Storage.getQuestions();
    const normalRoundsEl = document.getElementById('normalRounds');
    const doubleRoundsEl = document.getElementById('doubleRounds');
    
    const normalRounds = normalRoundsEl ? (parseInt(normalRoundsEl.value) || 0) : 0;
    const doubleRounds = doubleRoundsEl ? (parseInt(doubleRoundsEl.value) || 0) : 0;
    const totalRounds = normalRounds + doubleRounds;
    
    if (totalRounds === 0) {
        alert('Precisas de pelo menos 1 ronda!');
        return;
    }
    
    // Verificar se cada equipa tem pelo menos 1 jogador
    for (let i = 0; i < selectedTeams; i++) {
        if (!teamsData[i] || !teamsData[i].players || teamsData[i].players.length === 0) {
            alert(`A equipa ${teamsData[i]?.name || (i + 1)} precisa de pelo menos 1 jogador!`);
            return;
        }
    }
    
    // Verificar perguntas com respostas válidas
    const validQuestions = questions.filter(q => 
        q.text && q.text.trim() !== '' && 
        q.answers && q.answers.some(a => a && a.text && a.text.trim() !== '')
    );
    
    if (validQuestions.length < totalRounds) {
        alert(`Precisas de pelo menos ${totalRounds} perguntas válidas!\nTens apenas ${validQuestions.length} perguntas com texto e respostas.\n\nVai ao Editor de Perguntas para adicionar mais.`);
        return;
    }

    // Criar estado inicial do jogo
    const gameState = createInitialGameState(normalRounds, doubleRounds);
    
    // Guardar estado
    Storage.saveGameState(gameState);
    
    // Fechar modal
    closeModal();
    
    // Abrir janelas do jogo
    openGameWindows();
}

function createInitialGameState(normalRounds, doubleRounds) {
    const questions = Storage.getQuestions();
    const questionStats = Storage.getQuestionStats();
    const totalRounds = normalRounds + doubleRounds;
    
    // Filtrar apenas perguntas válidas (com pelo menos 1 resposta)
    const validQuestions = questions.filter(q => 
        q.text && q.text.trim() !== '' && 
        q.answers && q.answers.some(a => a && a.text && a.text.trim() !== '')
    );
    
    // Ordenar por número de vezes usadas (menos usadas primeiro) e depois randomizar dentro do mesmo grupo
    const sortedByUsage = [...validQuestions].map(q => ({
        ...q,
        usageCount: questionStats[q.id] || 0
    }));
    
    // Agrupar por usage count
    const grouped = {};
    sortedByUsage.forEach(q => {
        if (!grouped[q.usageCount]) grouped[q.usageCount] = [];
        grouped[q.usageCount].push(q);
    });
    
    // Randomizar dentro de cada grupo e juntar (menos usadas primeiro)
    const usageCounts = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    let prioritizedQuestions = [];
    usageCounts.forEach(count => {
        const shuffledGroup = grouped[count].sort(() => Math.random() - 0.5);
        prioritizedQuestions = prioritizedQuestions.concat(shuffledGroup);
    });
    
    // Selecionar as necessárias
    const selectedQuestions = prioritizedQuestions.slice(0, totalRounds);
    
    // Ordenar as respostas de cada pergunta por pontuação (maior primeiro)
    // E filtrar respostas vazias
    selectedQuestions.forEach(q => {
        if (q.answers) {
            // Filtrar respostas com texto
            q.answers = q.answers.filter(a => a && a.text && a.text.trim() !== '');
            // Ordenar por pontos
            q.answers.sort((a, b) => {
                const pointsA = (a && typeof a.points === 'number') ? a.points : 0;
                const pointsB = (b && typeof b.points === 'number') ? b.points : 0;
                return pointsB - pointsA;
            });
        }
    });
    
    // Criar estrutura das rondas
    const rounds = [];
    
    // Adicionar rondas normais
    for (let i = 0; i < normalRounds; i++) {
        const q = selectedQuestions[i];
        const answerCount = q && q.answers ? q.answers.length : 0;
        rounds.push({
            question: q,
            multiplier: 1,
            revealed: Array(answerCount).fill(false),
            completed: false,
            questionRevealed: false  // Pergunta ainda não foi revelada no display
        });
    }
    
    // Adicionar rondas duplas
    for (let i = 0; i < doubleRounds; i++) {
        const q = selectedQuestions[normalRounds + i];
        const answerCount = q && q.answers ? q.answers.length : 0;
        rounds.push({
            question: q,
            multiplier: 2,
            revealed: Array(answerCount).fill(false),
            completed: false,
            questionRevealed: false  // Pergunta ainda não foi revelada no display
        });
    }
    const timerSecondsEl = document.getElementById('timerSeconds');
    const timerValue = timerSecondsEl ? (parseInt(timerSecondsEl.value) || 20) : 20;
    
    return {
        id: Date.now(),
        teams: teamsData.slice(0, selectedTeams).map((team, i) => ({
            ...team,
            score: 0,
            powerups: {
                pass: true,      // Passar a vez
                extra: true      // Resposta extra
            }
        })),
        rounds: rounds,
        currentRound: 0,
        currentTeam: 0,
        controllingTeam: null,  // Equipa que controla após face-off
        roundPoints: 0,         // Pontos acumulados na ronda
        strikes: 0,
        timer: timerValue,
        timerRunning: false,
        paused: false,
        finished: false,
        phase: 'faceoff'        // faceoff, playing, steal
    };
}

function openGameWindows() {
    // Abre a janela do display (para o ecrã grande)
    const displayWindow = window.open('display.html', 'FamilyFeud_Display', 
        'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,fullscreen=yes');
    
    if (!displayWindow || displayWindow.closed || typeof displayWindow.closed === 'undefined') {
        alert('⚠️ O browser bloqueou a janela do Display!\n\nPor favor, permite popups para este site e tenta novamente.\n\nAlternativamente, abre display.html manualmente noutra janela/ecrã.');
    }
    
    // Redireciona a janela atual para o painel do host
    setTimeout(() => {
        window.location.href = 'host.html';
    }, 500);
}

function shutdownServer() {
    const confirmed = confirm(
        '⏹️ PARAR SERVIDOR\n\n' +
        'Para parar completamente:\n\n' +
        '→ FECHA A JANELA PRETA DO TERMINAL\n\n' +
        '(É a janela onde correste run.bat)\n\n' +
        'Queres fechar esta janela do browser agora?'
    );
    
    if (confirmed) {
        // Limpar estado do jogo
        Storage.clearGameState();
        
        // Fechar janela
        window.close();
        
        // Se não conseguir fechar (restrições do browser), mostrar mensagem
        setTimeout(() => {
            document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0a0f2c; color: white; font-family: Arial, sans-serif; text-align: center;">
                    <h1 style="color: #ffd700; font-size: 3rem;">⏹️ Para Parar</h1>
                    <p style="font-size: 1.5rem; max-width: 500px; line-height: 1.6;">
                        <strong style="color: #ff6b6b;">Fecha a janela preta do terminal</strong>
                    </p>
                    <p style="margin-top: 20px; color: #888; font-size: 1.1rem;">Clica no X da janela onde correste run.bat</p>
                    <p style="margin-top: 40px; color: #666;">Podes fechar esta janela do browser também.</p>
                </div>
            `;
        }, 100);
    }
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
    const modal = document.getElementById('newGameModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Tecla Escape para fechar modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
