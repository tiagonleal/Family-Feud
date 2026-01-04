/* ============================================
   FAMILY FEUD - STORAGE MANAGEMENT
   ============================================ */

const Storage = {
    KEYS: {
        QUESTIONS: 'familyFeud_questions',
        GAME_STATE: 'familyFeud_gameState',
        SETTINGS: 'familyFeud_settings',
        QUESTION_STATS: 'familyFeud_questionStats'  // Estatísticas de perguntas usadas
    },

    // ============================================
    // QUESTIONS
    // ============================================

    getQuestions() {
        try {
            const data = localStorage.getItem(this.KEYS.QUESTIONS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading questions:', e);
            return [];
        }
    },

    saveQuestions(questions) {
        try {
            localStorage.setItem(this.KEYS.QUESTIONS, JSON.stringify(questions));
            // Também exporta para ficheiro automaticamente
            this.exportQuestionsToFile(questions);
            return true;
        } catch (e) {
            console.error('Error saving questions:', e);
            return false;
        }
    },

    // ============================================
    // QUESTION STATS (tracking de perguntas usadas)
    // ============================================
    
    getQuestionStats() {
        try {
            const data = localStorage.getItem(this.KEYS.QUESTION_STATS);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error loading question stats:', e);
            return {};
        }
    },
    
    saveQuestionStats(stats) {
        try {
            localStorage.setItem(this.KEYS.QUESTION_STATS, JSON.stringify(stats));
            return true;
        } catch (e) {
            console.error('Error saving question stats:', e);
            return false;
        }
    },
    
    markQuestionUsed(questionId) {
        const stats = this.getQuestionStats();
        stats[questionId] = (stats[questionId] || 0) + 1;
        return this.saveQuestionStats(stats);
    },
    
    getQuestionUsageCount(questionId) {
        const stats = this.getQuestionStats();
        return stats[questionId] || 0;
    },

    addQuestion(question) {
        const questions = this.getQuestions();
        question.id = Date.now();
        question.createdAt = new Date().toISOString();
        questions.push(question);
        return this.saveQuestions(questions);
    },

    updateQuestion(id, updatedQuestion) {
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === id);
        if (index !== -1) {
            questions[index] = { ...questions[index], ...updatedQuestion };
            return this.saveQuestions(questions);
        }
        return false;
    },

    deleteQuestion(id) {
        const questions = this.getQuestions();
        const filtered = questions.filter(q => q.id !== id);
        return this.saveQuestions(filtered);
    },

    // ============================================
    // GAME STATE
    // ============================================

    getGameState() {
        try {
            const data = localStorage.getItem(this.KEYS.GAME_STATE);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading game state:', e);
            return null;
        }
    },

    saveGameState(state) {
        try {
            localStorage.setItem(this.KEYS.GAME_STATE, JSON.stringify(state));
            return true;
        } catch (e) {
            console.error('Error saving game state:', e);
            return false;
        }
    },

    clearGameState() {
        localStorage.removeItem(this.KEYS.GAME_STATE);
    },

    hasActiveGame() {
        const state = this.getGameState();
        return state !== null && !state.finished;
    },

    // ============================================
    // SETTINGS
    // ============================================

    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : this.getDefaultSettings();
        } catch (e) {
            console.error('Error loading settings:', e);
            return this.getDefaultSettings();
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    getDefaultSettings() {
        return {
            soundEnabled: true,
            musicVolume: 0.5,
            sfxVolume: 0.8,
            timerSeconds: 20
        };
    },

    // ============================================
    // FILE EXPORT/IMPORT
    // ============================================

    exportQuestionsToFile(questions) {
        // Cria o conteúdo do ficheiro
        const data = JSON.stringify(questions, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        
        // Guarda referência para download manual se necessário
        this.lastExportBlob = blob;
        this.lastExportData = data;
        
        console.log('Questions exported to memory. Use downloadQuestionsFile() to save.');
    },

    downloadQuestionsFile() {
        if (!this.lastExportBlob) {
            const questions = this.getQuestions();
            this.exportQuestionsToFile(questions);
        }
        
        const url = URL.createObjectURL(this.lastExportBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'questions.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async importQuestionsFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const questions = JSON.parse(e.target.result);
                    if (Array.isArray(questions)) {
                        this.saveQuestions(questions);
                        resolve(questions);
                    } else {
                        reject(new Error('Invalid file format'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
};

// Broadcast Channel para sincronizar entre janelas
const GameChannel = new BroadcastChannel('familyFeud_channel');

const Sync = {
    // Envia evento para todas as janelas
    broadcast(type, data) {
        GameChannel.postMessage({ type, data, timestamp: Date.now() });
    },

    // Adiciona listener para eventos
    onMessage(callback) {
        GameChannel.addEventListener('message', (event) => {
            callback(event.data);
        });
    },

    // Tipos de eventos
    EVENTS: {
        REVEAL_ANSWER: 'reveal_answer',
        REVEAL_QUESTION: 'reveal_question',
        ADD_STRIKE: 'add_strike',
        UPDATE_SCORE: 'update_score',
        CHANGE_TEAM: 'change_team',
        NEW_ROUND: 'new_round',
        GAME_OVER: 'game_over',
        TIMER_START: 'timer_start',
        TIMER_STOP: 'timer_stop',
        TIMER_UPDATE: 'timer_update',
        PAUSE_GAME: 'pause_game',
        RESUME_GAME: 'resume_game',
        USE_POWERUP: 'use_powerup',
        PLAY_SOUND: 'play_sound',
        SYNC_STATE: 'sync_state',
        STEAL_SUCCESS: 'steal_success',
        STEAL_FAIL: 'steal_fail',
        WRONG_GUESS: 'wrong_guess',
        AWARD_POINTS: 'award_points'
    }
};

// Exporta para uso global
window.Storage = Storage;
window.Sync = Sync;
window.GameChannel = GameChannel;
