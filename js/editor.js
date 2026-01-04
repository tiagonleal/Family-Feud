/* ============================================
   FAMILY FEUD - EDITOR LOGIC
   ============================================ */

let questions = [];
let currentQuestionId = null;
let saveTimeout = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    generateAnswerInputs();
});

function loadQuestions() {
    questions = Storage.getQuestions();
    renderQuestionsList();
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
// QUESTIONS LIST
// ============================================

function renderQuestionsList() {
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="empty-list">
                <p>Sem perguntas ainda.</p>
                <p>Clica em "+ Nova" para começar!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = questions.map((q, i) => {
        const answers = q.answers || [];
        const answersCount = answers.filter(a => a && a.text && a.text.trim() !== '').length;
        const totalPoints = answers.reduce((sum, a) => sum + ((a && a.points) || 0), 0);
        
        return `
            <div class="question-item ${q.id === currentQuestionId ? 'active' : ''}" 
                 onclick="selectQuestion(${q.id})">
                <div class="q-number">Pergunta ${i + 1}</div>
                <div class="q-text">${q.text || '(Sem texto)'}</div>
                <div class="q-stats">
                    <span>📝 ${answersCount}/8 respostas</span>
                    <span>⭐ ${totalPoints} pts</span>
                </div>
            </div>
        `;
    }).join('');
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
    renderQuestionsList();
    updateQuestionCount();
    selectQuestion(newQ.id);
}

function selectQuestion(id) {
    currentQuestionId = id;
    const question = questions.find(q => q.id === id);
    
    if (!question) return;
    
    // Show editor form
    const emptyState = document.getElementById('emptyState');
    const editorForm = document.getElementById('editorForm');
    if (emptyState) emptyState.style.display = 'none';
    if (editorForm) editorForm.style.display = 'block';
    
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
    
    // Update active state in list
    renderQuestionsList();
    
    // Focus on question text if empty
    if (!question.text && questionTextEl) {
        questionTextEl.focus();
    }
}

function deleteCurrentQuestion() {
    if (!currentQuestionId) return;
    
    if (confirm('Tens a certeza que queres eliminar esta pergunta?')) {
        questions = questions.filter(q => q.id !== currentQuestionId);
        Storage.saveQuestions(questions);
        
        currentQuestionId = null;
        const emptyState = document.getElementById('emptyState');
        const editorForm = document.getElementById('editorForm');
        if (emptyState) emptyState.style.display = 'flex';
        if (editorForm) editorForm.style.display = 'none';
        
        renderQuestionsList();
        updateQuestionCount();
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
    
    // Save
    const success = Storage.saveQuestions(questions);
    
    // Update status
    const status = document.getElementById('saveStatus');
    if (status) {
        if (success) {
            status.textContent = '✓ Guardado automaticamente';
            status.className = 'auto-save-status';
        } else {
            status.textContent = '✗ Erro ao guardar';
            status.className = 'auto-save-status error';
        }
    }
    
    // Update list (mostra contagem de respostas atualizada)
    renderQuestionsList();
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
        renderQuestionsList();
        updateQuestionCount();
        
        // Reset selection
        currentQuestionId = null;
        const emptyState = document.getElementById('emptyState');
        const editorForm = document.getElementById('editorForm');
        if (emptyState) emptyState.style.display = 'flex';
        if (editorForm) editorForm.style.display = 'none';
        
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
