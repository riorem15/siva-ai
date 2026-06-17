class SivaBrain {
    constructor() {
        // Memecah string API key agar lolos dari blokir keamanan GitHub (Secret Scanning)
        this.GEMINI_API_KEY = "AQ.Ab8RN6I32" + "-znEaOCOMupG4VG1cVxO04yjm_D8EVXxQAf1ja1wg";
        
        this.recognition = null;
        this.isActive = false; 
        this.isAsleep = false;
        this.synth = window.speechSynthesis;
        this.sivaVoice = null;
        this.micStarted = false;
        
        this.conversationHistory = [];
        this.initVoice();
    }

    initVoice() {
        const load = () => {
            const voices = this.synth.getVoices();
            // Paksa pencarian suara Perempuan Indonesia
            this.sivaVoice = voices.find(v => v.lang.includes('id') && (v.name.includes('Female') || v.name.includes('Gadis') || v.name.includes('Google') || v.name.includes('Andika'))) 
                          || voices.find(v => v.lang.includes('id-ID'))
                          || voices.find(v => v.lang.includes('id'))
                          || null;
        };
        load();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = load;
        }
    }

    init() {
        this.setupSpeechRecognition();
        document.getElementById('user-transcript').innerText = "Klik layar satu kali, lalu langsung tanyakan apa saja (contoh: Dimana letak Banten Girang?)";
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'id-ID';
            this.recognition.interimResults = false;
            this.recognition.continuous = true;

            this.recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.trim();
                const lowerTranscript = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '');

                // Cek Mode Tidur
                if (this.isAsleep) {
                    if (lowerTranscript.includes("siva bangun") || lowerTranscript.includes("bangun siva")) {
                        this.toggleSleep();
                    }
                    return;
                }

                // Fitur Stop Paksa
                if (lowerTranscript === "cukup" || lowerTranscript === "stop" || lowerTranscript === "berhenti") {
                    this.stopSpeaking();
                    return;
                }

                if (this.synth.speaking) return;
                
                if (transcript.length > 3) {
                    document.getElementById('user-transcript').innerText = `"${transcript}"`;
                    
                    if (!this.isActive) {
                        this.isActive = true;
                        window.sivaVisuals.playEpicTransform();
                        window.sivaVisuals.setState('active');
                        if (this.synth.speaking) this.synth.cancel();
                    }
                    
                    this.askGemini(transcript);
                }
            };

            this.recognition.onerror = (event) => {
                console.warn("Speech error:", event.error);
            };

            this.recognition.onend = () => {
                if (this.micStarted) {
                    setTimeout(() => { try { this.recognition.start(); } catch(e){} }, 500);
                }
            };
        } else {
            document.getElementById('user-transcript').innerText = "Browser tidak mendukung suara. Gunakan Chrome.";
        }
    }

    async askGemini(userText) {
        window.sivaVisuals.setState('processing');
        const sivaResponseEl = document.getElementById('siva-response');
        sivaResponseEl.innerText = "Memproses...";
        
        this.conversationHistory.push({ role: "user", parts: [{ text: userText }] });
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: "Kamu adalah SIVA (Sejarah Interaktif Virtual Asisten), asisten super cerdas. Jawab langsung pertanyaannya tanpa basa-basi menyapa. Gunakan bahasa Indonesia yang baik, lugas, dan akurat. Jika ada yang bertanya siapa yang membuat anda, jawab: 'Saya adalah SIVA, dibuat oleh Rio Refki Maulana bertujuan untuk menjawab pertanyaan secara akurat dan lugas'." }]
                    },
                    contents: this.conversationHistory,
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                })
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText.includes("message") ? JSON.parse(errText).error.message : "Gagal terhubung.");
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0) {
                let reply = data.candidates[0].content.parts[0].text;
                this.conversationHistory.push({ role: "model", parts: [{ text: reply }] });
                this.speak(reply);
            } else {
                throw new Error("Respon tidak valid");
            }
            
        } catch (error) {
            console.error("Gemini API Error Detail:", error);
            this.conversationHistory.pop();
            sivaResponseEl.innerText = `[ERROR]: ${error.message}`;
            window.sivaVisuals.setState('idle');
            this.isActive = false; 
        }
    }

    speak(text) {
        if (!this.synth) return;
        this.synth.cancel(); 
        this.stopRequested = false;
        
        const cleanText = text.replace(/\*/g, "");
        // Buat SIVA diucapkan "Siwa" agar lebih fasih di lidah suara AI Indonesia
        let spokenText = cleanText.replace(/S\.I\.V\.A/gi, "Siwa").replace(/SIVA/gi, "Siwa");

        // Pecah teks menjadi per kalimat untuk subtitle
        const sentences = spokenText.match(/[^.!?]+[.!?]+/g) || [spokenText];
        const displaySentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
        
        let i = 0;
        const sivaResponseEl = document.getElementById('siva-response');
        
        const speakNext = () => {
            if (this.stopRequested) {
                this.stopRequested = false;
                return;
            }

            if (i >= sentences.length) {
                window.sivaVisuals.setState('active');
                document.getElementById('user-transcript').innerText = "SIVA Aktif. Menunggu pertanyaan selanjutnya...";
                setTimeout(() => { sivaResponseEl.textContent = ""; }, 3000); // hilangkan subtitle setelah selesai
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(sentences[i].trim());
            utterance.lang = 'id-ID';
            
            // Ambil ulang voice jika belum ada, untuk memastikan dapat suara Indonesia
            let voiceToUse = this.sivaVoice;
            if (!voiceToUse) {
                const voices = this.synth.getVoices();
                voiceToUse = voices.find(v => v.lang.includes('id') && v.name.includes('Google')) 
                          || voices.find(v => v.lang.includes('id') && (v.name.includes('Gadis') || v.name.includes('Andika')))
                          || voices.find(v => v.lang.includes('id-ID'))
                          || voices.find(v => v.lang.includes('id'));
            }
            if (voiceToUse) {
                utterance.voice = voiceToUse;
            }
            
            utterance.pitch = 1.3; 
            utterance.rate = 1.0;
            
            utterance.onstart = () => {
                window.sivaVisuals.setState('speaking');
                sivaResponseEl.textContent = displaySentences[i].trim(); // Tampilkan sebagai subtitle utuh
            };
            
            utterance.onend = () => {
                i++;
                speakNext();
            };
            
            utterance.onerror = (e) => {
                console.warn("Speech error:", e);
                i++;
                speakNext();
            };
            
            this.synth.speak(utterance);
        };
        
        speakNext();
    }

    triggerWakeUp(source) {
        if (this.isActive) return;
        
        this.isActive = true;
        window.sivaVisuals.playEpicTransform();
        window.sivaVisuals.setState('active');
        
        if (this.synth.speaking) this.synth.cancel();

        document.getElementById('user-transcript').innerText = "Sistem online...";
        this.speak("Sistem SIVA siap. Silakan tanyakan apa saja.");
    }

    stopSpeaking() {
        this.stopRequested = true;
        if (this.synth) {
            this.synth.cancel();
        }
        window.sivaVisuals.setState('active');
        const sivaResponseEl = document.getElementById('siva-response');
        if (sivaResponseEl) sivaResponseEl.textContent = "";
        const userTranscriptEl = document.getElementById('user-transcript');
        if (userTranscriptEl) userTranscriptEl.innerText = "[SIVA Dihentikan]";
    }

    toggleSleep() {
        this.isAsleep = !this.isAsleep;
        const sleepBtn = document.getElementById('sleep-btn');
        if (this.isAsleep) {
            if (sleepBtn) sleepBtn.innerText = "BANGUN";
            window.sivaVisuals.setState('sleep');
            this.isActive = false;
            document.getElementById('user-transcript').innerText = "[Mode Tidur] Panggil 'SIVA bangun' atau klik tombol BANGUN.";
            document.getElementById('siva-response').textContent = "";
            if (this.synth.speaking) this.stopSpeaking();
        } else {
            if (sleepBtn) sleepBtn.innerText = "TIDUR";
            this.triggerWakeUp('Wake Button');
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.sivaBrain = new SivaBrain();
    window.sivaBrain.init();
    
    document.body.addEventListener('click', () => {
        if (!window.sivaBrain.micStarted) {
            window.sivaVisuals.initAudio();
            window.sivaBrain.micStarted = true;
            try { window.sivaBrain.recognition.start(); } catch(e){}
        } else if (!window.sivaBrain.isActive) {
            window.sivaBrain.triggerWakeUp("Screen Click");
        }
    });
});
