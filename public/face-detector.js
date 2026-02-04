/**
 * Face Detector using MediaPipe Face Detection
 * 
 * Detects face presence and triggers greeting when face is stable for 2 seconds.
 * Session-based: Greets once per session, resets after 5 seconds of no face detected.
 */

// Debug mode - set to false in production
const DEBUG_MODE = false;

// Debug logging helper
const debug = {
    log: (...args) => DEBUG_MODE && console.log(...args),
    error: (...args) => DEBUG_MODE && console.error(...args)
};

class FaceDetector {
    constructor(greetingCallback) {
        this.greetingCallback = greetingCallback;

        // Detection state
        this.faceDetected = false;
        this.faceStartTime = null;
        this.GREETING_DELAY = 2000; // 2 seconds

        // Session state
        this.hasGreeted = false;
        this.lastFaceLostTime = null;
        this.RESET_SESSION_TIMEOUT = 5000; // 5 seconds

        // Random smile
        this.lastSmileTime = 0;
        this.nextSmileDelay = this.getRandomSmileDelay();

        // MediaPipe instances
        this.faceDetection = null;
        this.camera = null;
        this.videoElement = null;
        this.isProcessingGreeting = false;

        debug.log('👤 Face Detector initialized');
    }

    getRandomSmileDelay() {
        // Random delay between 20-30 seconds
        return 20000 + Math.random() * 10000;
    }

    async init() {
        debug.log('👤 Initializing MediaPipe Face Detection...');

        try {
            // Load MediaPipe scripts if not already loaded
            await this.loadMediaPipeScripts();

            // Create video element
            this.videoElement = document.createElement('video');
            this.videoElement.id = 'face-detection-video';
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;

            // Hide video element
            this.videoElement.style.position = 'absolute';
            this.videoElement.style.left = '-9999px';
            this.videoElement.style.width = '640px';
            this.videoElement.style.height = '480px';

            document.body.appendChild(this.videoElement);

            // Wait for MediaPipe to be available
            if (!window.FaceDetection || !window.Camera) {
                throw new Error('MediaPipe libraries not loaded');
            }

            // Initialize Face Detection
            this.faceDetection = new window.FaceDetection({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
                }
            });

            this.faceDetection.setOptions({
                model: 'short', // 'short' for faces within 2 meters
                minDetectionConfidence: 0.5
            });

            // Set up results callback
            this.faceDetection.onResults((results) => {
                this.onResults(results);
            });

            // Initialize camera
            this.camera = new window.Camera(this.videoElement, {
                onFrame: async () => {
                    // Check if face detection is still active (prevent errors on cleanup)
                    if (this.faceDetection) {
                        await this.faceDetection.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });

            // Start camera
            await this.camera.start();

            debug.log('✅ MediaPipe Face Detection initialized');
            return true;

        } catch (error) {
            debug.error('❌ Failed to initialize Face Detection:', error);
            throw error;
        }
    }

    async loadMediaPipeScripts() {
        // Check if already loaded
        if (window.FaceDetection && window.Camera) {
            console.log('✅ MediaPipe already loaded');
            return;
        }

        debug.log('📦 Loading MediaPipe scripts...');

        // Load Face Detection
        await this.loadScript(
            'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/face_detection.js',
            'mediapipe-face-detection'
        );

        // Load Camera Utils
        await this.loadScript(
            'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js',
            'mediapipe-camera-utils'
        );

        debug.log('✅ MediaPipe scripts loaded');
    }

    loadScript(src, id) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            if (document.getElementById(id)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.async = true;

            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

            document.head.appendChild(script);
        });
    }

    onResults(results) {
        // Check if face detected
        if (results.detections && results.detections.length > 0) {
            const detection = results.detections[0];

            // MediaPipe stores confidence in detection.V[0].ga
            let confidence = 1.0; // Default
            if (detection.V && Array.isArray(detection.V) && detection.V.length > 0) {
                const scoreObj = detection.V[0];
                // Confidence is in the 'ga' property
                confidence = scoreObj.ga || scoreObj;
            }

            // Only process if confidence is high enough
            if (confidence >= 0.5) {
                this.onFaceDetected(detection);
            } else {
                this.onFaceLost();
            }
        } else {
            this.onFaceLost();
        }
    }

    onFaceDetected(detection) {
        // Reset face lost timer
        this.lastFaceLostTime = null;

        // First time detecting face
        if (!this.faceDetected) {
            debug.log('👤 Face detected!');
            this.faceDetected = true;
            this.faceStartTime = Date.now();
        } else {
            // Face has been detected for some time
            const faceDuration = Date.now() - this.faceStartTime;

            // Check if face has been stable for greeting delay
            if (faceDuration >= this.GREETING_DELAY && !this.isProcessingGreeting) {
                debug.log(`✅ Face stable for ${(faceDuration / 1000).toFixed(1)}s`);
                this.checkAndGreet();
            }

            // Random smile (only if already greeted)
            if (this.hasGreeted && !this.isProcessingGreeting) {
                const now = Date.now();
                const timeSinceLastSmile = now - this.lastSmileTime;

                if (timeSinceLastSmile >= this.nextSmileDelay) {
                    debug.log('😊 Triggering random smile...');
                    this.triggerSmile();
                    this.lastSmileTime = now;
                    this.nextSmileDelay = this.getRandomSmileDelay();
                }
            }
        }
    }

    onFaceLost() {
        // Face was detected but now lost
        if (this.faceDetected) {
            const faceDuration = Date.now() - this.faceStartTime;
            debug.log(`❌ Face lost (was present for ${(faceDuration / 1000).toFixed(1)}s)`);

            this.faceDetected = false;
            this.faceStartTime = null;

            // Start session reset timer
            if (this.hasGreeted && !this.lastFaceLostTime) {
                this.lastFaceLostTime = Date.now();
                debug.log('⏱️ Face lost - starting session reset timer (5s)');
            }
        }

        // Check if enough time has passed to reset session
        if (this.hasGreeted && this.lastFaceLostTime !== null) {
            const timeSinceLost = Date.now() - this.lastFaceLostTime;
            if (timeSinceLost >= this.RESET_SESSION_TIMEOUT) {
                debug.log('🔄 Session reset - user can be greeted again');
                this.hasGreeted = false;
                this.lastFaceLostTime = null;
            }
        }
    }

    async checkAndGreet() {
        // Already greeted in this session
        if (this.hasGreeted) {
            debug.log('⏭️ Already greeted in this session');
            return;
        }

        // Check if bot is speaking
        if (window.isBotSpeaking && window.isBotSpeaking()) {
            debug.log('⏸️ Bot is speaking - skip greeting');
            return;
        }

        // Check if bot is processing
        if (window.isBotProcessing && window.isBotProcessing()) {
            debug.log('⏸️ Bot is processing - skip greeting');
            return;
        }

        // Trigger greeting
        debug.log('👋 Face detected - triggering greeting');
        this.isProcessingGreeting = true;
        this.hasGreeted = true;

        // Call greeting callback
        if (this.greetingCallback) {
            this.greetingCallback({
                shouldGreet: true,
                userId: `guest_${Date.now()}`,
                isNewUser: true
            });
        }

        // Reset processing flag after a delay
        setTimeout(() => {
            this.isProcessingGreeting = false;
        }, 3000);
    }

    triggerSmile() {
        // Check if bot is speaking - don't smile while speaking
        if (window.isBotSpeaking && window.isBotSpeaking()) {
            return;
        }

        // Trigger avatar smile
        if (window.triggerAvatarSmile) {
            window.triggerAvatarSmile();
        }
    }

    stop() {
        debug.log('🛑 Stopping face detector...');

        // Stop camera
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }

        // Close face detection
        if (this.faceDetection) {
            this.faceDetection.close();
            this.faceDetection = null;
        }

        // Remove video element
        if (this.videoElement && this.videoElement.parentNode) {
            this.videoElement.parentNode.removeChild(this.videoElement);
            this.videoElement = null;
        }

        debug.log('✅ Face detector stopped');
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.FaceDetector = FaceDetector;
}
