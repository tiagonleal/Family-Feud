/* ============================================
   FAMILY FEUD - SOUND SYSTEM
   Usa Web Audio API para gerar sons sem ficheiros externos
   ============================================ */

const Sounds = {
    audioContext: null,
    enabled: true,
    volume: 0.7,

    init() {
        // Criar AudioContext quando o utilizador interage
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
        
        // Tentar criar imediatamente também
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('AudioContext will be created on user interaction');
        }
    },

    play(soundType) {
        if (!this.enabled) return;
        
        // Criar context se não existir
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                return;
            }
        }

        // Resume se estiver suspenso
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        switch (soundType) {
            case 'ding':
                this.playDing();
                break;
            case 'reveal':
                this.playReveal();
                break;
            case 'buzzer':
                this.playBuzzer();
                break;
            case 'tick':
                this.playTick();
                break;
            case 'victory':
                this.playVictory();
                break;
            case 'points':
                this.playPoints();
                break;
            default:
                console.log('Unknown sound:', soundType);
        }
    },

    // Som de resposta correta - DING agudo e satisfatório
    playDing() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Criar oscilador principal
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(880, now); // A5
        osc2.frequency.setValueAtTime(1760, now); // A6 (harmónico)

        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
    },

    // Som de revelar resposta - Whoosh subindo
    playReveal() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    },

    // Som de erro - BUZZER grave e desagradável
    playBuzzer() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Criar múltiplos osciladores para som mais "sujo"
        const oscillators = [];
        const gainNode = ctx.createGain();
        
        const frequencies = [100, 150, 200];
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(gainNode);
            oscillators.push(osc);
        });

        // Distorção leve
        const distortion = ctx.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(50);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.02);
        gainNode.gain.setValueAtTime(this.volume * 0.4, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.7);

        gainNode.connect(distortion);
        distortion.connect(ctx.destination);

        oscillators.forEach(osc => {
            osc.start(now);
            osc.stop(now + 0.7);
        });
    },

    // Som de tick do timer
    playTick() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    },

    // Som de vitória - Fanfarra
    playVictory() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Sequência de notas ascendentes
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const duration = 0.2;

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const startTime = now + (i * duration);

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.02);
            gainNode.gain.setValueAtTime(this.volume * 0.3, startTime + duration - 0.05);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        });

        // Nota final longa
        setTimeout(() => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const osc3 = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const finalTime = ctx.currentTime;

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc3.type = 'sine';
            
            osc1.frequency.setValueAtTime(523.25, finalTime); // C5
            osc2.frequency.setValueAtTime(659.25, finalTime); // E5
            osc3.frequency.setValueAtTime(783.99, finalTime); // G5

            gainNode.gain.setValueAtTime(0, finalTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, finalTime + 0.1);
            gainNode.gain.setValueAtTime(this.volume * 0.4, finalTime + 1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, finalTime + 2);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            osc3.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc1.start(finalTime);
            osc2.start(finalTime);
            osc3.start(finalTime);
            osc1.stop(finalTime + 2);
            osc2.stop(finalTime + 2);
            osc3.stop(finalTime + 2);
        }, notes.length * duration * 1000);
    },

    // Som de ganhar pontos - Coins/Cha-ching
    playPoints() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const startTime = now + (i * 0.08);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000 + (i * 200), startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.15, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        }
    },

    // Função auxiliar para criar curva de distorção
    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }

        return curve;
    },

    // Controlo de volume
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    },

    // Ativar/desativar sons
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },

    mute() {
        this.enabled = false;
    },

    unmute() {
        this.enabled = true;
    }
};

// Exportar para uso global
window.Sounds = Sounds;
