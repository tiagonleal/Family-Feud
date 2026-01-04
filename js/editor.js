/* ============================================
   FAMILY FEUD - EDITOR LOGIC
   ============================================ */

let questions = [];
let filteredQuestions = [];
let currentQuestionId = null;
let saveTimeout = null;
let searchQuery = '';

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
    loadQuestions();
    generateAnswerInputs();
});

function loadQuestions() {
    questions = Storage.getQuestions();
    filteredQuestions = questions;
    renderQuestionsGrid();
    updateQuestionCount();
}

function generateAnswerInputs() {
    const container = document.getElementById('answersList');
    if (!container) return;
    
    let html = '';
    
    for (let i = 0; i < 8; i++) {
        html += `
            <div class="answer-input-row">
                <span class="answer-number-badge">${i + 1}</span>
                <input type="text" 
                       id="answer${i}" 
                       placeholder="Resposta ${i + 1}"
                       oninput="autoSave()">
                <div class="points-input">
                    <input type="number" 
                           id="points${i}" 
                           placeholder="0"
                           min="0" 
                           max="100"
                           oninput="autoSave()">
                    <span>pts</span>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// QUESTIONS GRID
// ============================================

function renderQuestionsGrid() {
    const container = document.getElementById('questionsGrid');
    const gridCount = document.getElementById('gridCount');
    const searchClear = document.getElementById('searchClear');
    
    if (!container) return;
    
    // Atualizar contador
    if (gridCount) {
        const total = questions.length;
        const showing = filteredQuestions.length;
        if (searchQuery) {
            gridCount.textContent = `${showing} de ${total} perguntas`;
        } else {
            gridCount.textContent = `${total} perguntas`;
        }
    }
    
    // Mostrar/esconder botão de limpar pesquisa
    if (searchClear) {
        searchClear.style.display = searchQuery ? 'block' : 'none';
    }
    
    if (filteredQuestions.length === 0) {
        if (searchQuery) {
            container.innerHTML = `
                <div class="empty-grid">
                    <div class="empty-icon">🔍</div>
                    <h3>Nenhuma pergunta encontrada</h3>
                    <p>Tenta outra pesquisa ou <button class="link-btn" onclick="clearSearch()">limpa a pesquisa</button></p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-grid">
                    <div class="empty-icon">❓</div>
                    <h3>Sem perguntas ainda</h3>
                    <p>Clica em "+ Nova Pergunta" para começar!</p>
                </div>
            `;
        }
        return;
    }
    
    container.innerHTML = filteredQuestions.map((q, filteredIndex) => {
        // Encontrar índice real na lista completa
        const realIndex = questions.findIndex(qu => qu.id === q.id);
        const answers = q.answers || [];
        const answersCount = answers.filter(a => a && a.text && a.text.trim() !== '').length;
        const totalPoints = answers.reduce((sum, a) => sum + ((a && a.points) || 0), 0);
        const questionPreview = q.text ? (q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text) : '(Sem texto)';
        
        return `
            <div class="question-card" onclick="selectQuestion(${q.id})">
                <div class="card-number">#${realIndex + 1}</div>
                <div class="card-title">${escapeHtml(questionPreview)}</div>
                <div class="card-stats">
                    <span class="stat-answers">📝 ${answersCount}</span>
                    <span class="stat-points">⭐ ${totalPoints} pts</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterQuestions() {
    const searchInput = document.getElementById('searchInput');
    searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    if (!searchQuery) {
        filteredQuestions = questions;
    } else {
        filteredQuestions = questions.filter(q => {
            // Pesquisar apenas no texto da pergunta
            return q.text && q.text.toLowerCase().includes(searchQuery);
        });
    }
    
    renderQuestionsGrid();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    filteredQuestions = questions;
    renderQuestionsGrid();
}

function updateQuestionCount() {
    const countEl = document.getElementById('questionCount');
    if (countEl) countEl.textContent = questions.length;
}

// ============================================
// QUESTION MANAGEMENT
// ============================================

function newQuestion() {
    const newQ = {
        id: Date.now(),
        text: '',
        answers: Array(8).fill(null).map(() => ({ text: '', points: 0 })),
        createdAt: new Date().toISOString()
    };
    
    questions.push(newQ);
    Storage.saveQuestions(questions);
    filterQuestions(); // Refresh filtered list
    updateQuestionCount();
    selectQuestion(newQ.id);
}

function selectQuestion(id) {
    currentQuestionId = id;
    const question = questions.find(q => q.id === id);
    
    if (!question) return;
    
    // Hide grid, show editor
    const gridView = document.getElementById('questionsGridView');
    const editorPanel = document.getElementById('questionEditorPanel');
    if (gridView) gridView.style.display = 'none';
    if (editorPanel) editorPanel.style.display = 'flex';
    
    // Fill form
    const questionTextEl = document.getElementById('questionText');
    if (questionTextEl) questionTextEl.value = question.text || '';
    
    const answers = question.answers || [];
    for (let i = 0; i < 8; i++) {
        const answer = answers[i] || { text: '', points: 0 };
        const answerEl = document.getElementById(`answer${i}`);
        const pointsEl = document.getElementById(`points${i}`);
        if (answerEl) answerEl.value = answer.text || '';
        if (pointsEl) pointsEl.value = answer.points || '';
    }
    
    // Focus on question text if empty
    if (!question.text && questionTextEl) {
        questionTextEl.focus();
    }
}

function backToGrid() {
    currentQuestionId = null;
    
    // Show grid, hide editor
    const gridView = document.getElementById('questionsGridView');
    const editorPanel = document.getElementById('questionEditorPanel');
    if (gridView) gridView.style.display = 'flex';
    if (editorPanel) editorPanel.style.display = 'none';
    
    // Refresh grid
    filterQuestions();
}

function deleteCurrentQuestion() {
    if (!currentQuestionId) return;
    
    if (confirm('Tens a certeza que queres eliminar esta pergunta?')) {
        questions = questions.filter(q => q.id !== currentQuestionId);
        Storage.saveQuestions(questions);
        
        updateQuestionCount();
        backToGrid();
    }
}

// ============================================
// AUTO SAVE
// ============================================

function autoSave() {
    // Clear existing timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Update status
    const status = document.getElementById('saveStatus');
    if (status) {
        status.textContent = '💾 A guardar...';
        status.className = 'auto-save-status saving';
    }
    
    // Debounce save
    saveTimeout = setTimeout(() => {
        saveCurrentQuestion();
    }, 500);
}

function saveCurrentQuestion() {
    if (!currentQuestionId) return;
    
    const index = questions.findIndex(q => q.id === currentQuestionId);
    if (index === -1) return;
    
    // Get form data
    const questionTextEl = document.getElementById('questionText');
    const text = questionTextEl ? questionTextEl.value : '';
    const answers = [];
    
    for (let i = 0; i < 8; i++) {
        const answerEl = document.getElementById(`answer${i}`);
        const pointsEl = document.getElementById(`points${i}`);
        answers.push({
            text: answerEl ? answerEl.value : '',
            points: pointsEl ? (parseInt(pointsEl.value) || 0) : 0
        });
    }
    
    // NÃO ordenar aqui - apenas ao selecionar outra pergunta ou ao jogar
    // Isso evita confusão enquanto o utilizador está a editar
    
    // Update question
    questions[index] = {
        ...questions[index],
        text,
        answers,
        updatedAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const success = Storage.saveQuestions(questions);
    
    // Update status
    const status = document.getElementById('saveStatus');
    if (status) {
        if (success) {
            status.textContent = '✓ Guardado';
            status.className = 'auto-save-status';
        } else {
            status.textContent = '✗ Erro ao guardar';
            status.className = 'auto-save-status error';
        }
    }
    
    // Update list (mostra contagem de respostas atualizada)
    renderQuestionsGrid();
}

function autoExportQuestions() {
    // Criar JSON string
    const jsonContent = JSON.stringify(questions, null, 2);
    
    // Criar blob
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // Criar URL
    const url = URL.createObjectURL(blob);
    
    // Criar link invisível e fazer download
    const link = document.createElement('a');
    link.href = url;
    link.download = `family-feud-questions-${new Date().toISOString().split('T')[0]}.json`;
    
    // Simular clique
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL
    URL.revokeObjectURL(url);
}

// ============================================
// IMPORT/EXPORT
// ============================================

function sortAnswers() {
    if (!currentQuestionId) return;
    
    // Get current answers from form
    const answers = [];
    for (let i = 0; i < 8; i++) {
        const answerEl = document.getElementById(`answer${i}`);
        const pointsEl = document.getElementById(`points${i}`);
        answers.push({
            text: answerEl ? answerEl.value : '',
            points: pointsEl ? (parseInt(pointsEl.value) || 0) : 0
        });
    }
    
    // Sort by points (highest first)
    answers.sort((a, b) => b.points - a.points);
    
    // Re-populate the form
    for (let i = 0; i < 8; i++) {
        const answerEl = document.getElementById(`answer${i}`);
        const pointsEl = document.getElementById(`points${i}`);
        if (answerEl) answerEl.value = answers[i].text || '';
        if (pointsEl) pointsEl.value = answers[i].points || '';
    }
    
    // Trigger save
    autoSave();
}

function exportQuestions() {
    if (questions.length === 0) {
        alert('Não há perguntas para exportar!');
        return;
    }
    
    Storage.downloadQuestionsFile();
}

async function importQuestions(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const imported = await Storage.importQuestionsFromFile(file);
        questions = imported;
        filteredQuestions = questions;
        renderQuestionsGrid();
        updateQuestionCount();
        
        // Reset selection e voltar ao grid
        currentQuestionId = null;
        const gridView = document.getElementById('questionsGridView');
        const editorPanel = document.getElementById('questionEditorPanel');
        if (gridView) gridView.style.display = 'flex';
        if (editorPanel) editorPanel.style.display = 'none';
        
        alert(`${imported.length} perguntas importadas com sucesso!`);
    } catch (e) {
        console.error('Import error:', e);
        alert('Erro ao importar ficheiro. Verifica se o formato está correto.');
    }
    
    // Reset file input
    event.target.value = '';
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    // Ctrl+N - Nova pergunta
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newQuestion();
    }
    
    // Ctrl+S - Guardar (já guarda automaticamente, mas para satisfação do utilizador)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (currentQuestionId) {
            saveCurrentQuestion();
        }
    }
    
    // Delete - Eliminar pergunta (quando não está a escrever em input)
    if (e.key === 'Delete' && document.activeElement.tagName !== 'INPUT') {
        deleteCurrentQuestion();
    }
});
