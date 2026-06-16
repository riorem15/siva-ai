class SivaVisuals {
    constructor() {
        this.ctx = null;
    }
    
    initAudio() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    setState(state) {
        const body = document.getElementById('app-body');
        const statusText = document.getElementById('core-status');
        const sivaOrb = document.getElementById('siva-orb');
        if (!body || !statusText) return;
        
        body.className = ''; 
        if (sivaOrb) sivaOrb.style.opacity = '1';

        if (state === 'idle') {
            body.classList.add('state-idle');
            statusText.innerText = 'STANDBY';
        } else if (state === 'sleep') {
            body.classList.add('state-idle');
            statusText.innerText = 'SLEEPING';
            if (sivaOrb) sivaOrb.style.opacity = '0.3';
        } else if (state === 'active') {
            body.classList.add('state-active');
            statusText.innerText = 'LISTENING';
        } else if (state === 'processing') {
            body.classList.add('state-processing');
            statusText.innerText = 'PROCESSING';
        } else if (state === 'speaking') {
            body.classList.add('state-active'); 
            statusText.innerText = 'SPEAKING';
        }
    }

    playEpicTransform() {
        try {
            this.initAudio();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            
            const now = this.ctx.currentTime;
            
            // Sub-bass sweep
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(150, now);
            osc1.frequency.exponentialRampToValueAtTime(40, now + 1.5);
            
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.8, now + 0.2);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(now);
            osc1.stop(now + 1.5);

            // High tech chime
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(800, now + 0.3);
            osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.6);
            
            gain2.gain.setValueAtTime(0, now + 0.3);
            gain2.gain.linearRampToValueAtTime(0.1, now + 0.4);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(now + 0.3);
            osc2.stop(now + 1.0);
            
        } catch (e) {
            console.log("Audio play blocked", e);
        }
    }
}

window.sivaVisuals = new SivaVisuals();
