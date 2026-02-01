// Web Speech API Wake Word Detection
// Optimized for "hi lingo" / "hey lingo" detection

class WebSpeechWakeWord {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onWakeWordDetected = null;
        this.lastDetectionTime = 0; // Debounce timestamp
        this.debounceMs = 2000; // 2 seconds debounce
    }

    init() {
        if (!('webkitSpeechRecognition' in window)) {
            console.error('❌ Web Speech API not supported');
            return false;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Grammar hints for better accuracy
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        if (SpeechGrammarList) {
            const grammar = '#JSGF V1.0; grammar wakeword; public <wakeword> = hi lingo | hey lingo;';
            const grammarList = new SpeechGrammarList();
            grammarList.addFromString(grammar, 1);
            this.recognition.grammars = grammarList;
        }

        this.recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.toLowerCase().trim();
                const confidence = event.results[i][0].confidence;
                const isFinal = event.results[i].isFinal;

                // Log ALL results for debugging (both interim and final)
                if (isFinal) {
                    console.log(`🎤 Wake word FINAL: "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
                } else {
                    console.log(`🎤 Wake word interim: "${transcript}"`);
                }

                // Normalize transcript
                const normalized = transcript
                    .replace(/\s+/g, ' ')
                    .replace(/[.,!?]/g, '')
                    .replace(/[0-9]/g, ''); // Remove numbers

                // Target wake words
                const targets = ['hi lingo', 'hey lingo'];

                // Check with fuzzy matching (Levenshtein distance)
                let isWakeWord = false;
                for (const target of targets) {
                    const distance = this.levenshteinDistance(normalized, target);
                    const maxLength = Math.max(normalized.length, target.length);
                    const similarity = 1 - (distance / maxLength);

                    // If similarity > 70%, consider it a match
                    if (similarity > 0.7) {
                        console.log(`✅ Fuzzy match: "${normalized}" ~ "${target}" (${(similarity * 100).toFixed(0)}% similar)`);
                        isWakeWord = true;
                        break;
                    }
                }

                if (isWakeWord) {
                    // Debounce: prevent multiple detections within 2 seconds
                    const now = Date.now();
                    if (now - this.lastDetectionTime < this.debounceMs) {
                        console.log('⏭️ Skipping duplicate detection (debounce)');
                        continue;
                    }

                    this.lastDetectionTime = now;
                    console.log(`⚡ Wake word detected: "${transcript}"`);
                    this.stop();
                    if (this.onWakeWordDetected) {
                        this.onWakeWordDetected();
                    }
                    break;
                }
            }
        };

        this.recognition.onerror = (event) => {
            // Ignore common non-critical errors
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // These are expected - don't log
                return;
            }

            // Network errors are temporary - just warn and retry
            if (event.error === 'network') {
                console.warn('⚠️ Wake word network error (will auto-retry)');
            } else {
                console.error('❌ Wake word error:', event.error);
            }

            // Auto-restart on network errors
            if (this.isListening && event.error === 'network') {
                setTimeout(() => {
                    if (this.isListening) {
                        console.log('🔄 Restarting wake word after network error...');
                        this.start();
                    }
                }, 500);
            }
        };

        this.recognition.onend = () => {
            // Auto-restart if should still be listening
            if (this.isListening) {
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            // Already running, ignore
                        }
                    }
                }, 100);
            }
        };

        console.log('✅ Web Speech API wake word initialized');
        return true;
    }

    start() {
        if (!this.recognition) {
            console.error('❌ Wake word not initialized');
            return false;
        }

        if (this.isListening) {
            console.log('⚠️ Already listening for wake word');
            return true;
        }

        try {
            console.log('👂 Starting wake word listening...');
            this.isListening = true;
            this.recognition.start();
            console.log('✅ Wake word listening started');
            return true;
        } catch (error) {
            if (error.message && error.message.includes('already started')) {
                console.log('⚠️ Wake word already running');
                this.isListening = true;
                return true;
            }
            console.error('❌ Error starting wake word:', error);
            this.isListening = false;
            return false;
        }
    }

    stop() {
        if (!this.isListening) return;

        try {
            console.log('🛑 Stopping wake word listening');
            this.isListening = false;
            if (this.recognition) {
                this.recognition.stop();
            }
        } catch (error) {
            console.warn('Error stopping wake word:', error);
        }
    }

    setCallback(callback) {
        this.onWakeWordDetected = callback;
    }

    // Levenshtein distance algorithm for fuzzy matching
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[len1][len2];
    }
}

// Export for use in voiceembed.js
window.WebSpeechWakeWord = WebSpeechWakeWord;
