/**
 * Eye Contact Detector với Face Recognition - Dual Mode System
 * 
 * Mode 1: EYE CONTACT MODE (Chế độ chờ)
 * - Liên tục check ánh nhìn
 * - Khi user nhìn 2 giây → Chào → Chuyển sang Face Tracking Mode
 * 
 * Mode 2: FACE TRACKING MODE (Chế độ active session)
 * - KHÔNG check ánh nhìn
 * - Liên tục detect face mỗi 3 giây
 * - Nếu face match → User vẫn đứng đó
 * - Nếu face KHÔNG match → User mới → Chuyển về Eye Contact Mode
 */

class EyeContactDetector {
    constructor(avatarBounds, greetingCallback) {
        this.avatarBounds = avatarBounds; // {x, y, width, height}
        this.greetingCallback = greetingCallback;

        // Modes
        this.MODE_EYE_CONTACT = 'eye_contact';
        this.MODE_FACE_TRACKING = 'face_tracking';
        this.currentMode = this.MODE_EYE_CONTACT;

        // Eye Contact Mode state
        this.lookingAtAvatar = false;
        this.lookStartTime = null;
        // Eye contact detection thresholds
        this.GREETING_DELAY = 1500; // 1.5 giây (giảm từ 2s)

        // Face Tracking Mode state
        this.currentUserId = null;
        this.faceTrackingInterval = null;
        this.FACE_CHECK_INTERVAL = 3000; // Check face mỗi 3 giây

        this.videoElement = null;
        this.isProcessingGreeting = false;

        // Session-based greeting (thay thế face recognition)
        this.hasGreeted = false;
        this.lastLookAwayTime = null;
        this.RESET_SESSION_TIMEOUT = 5000; // 5 giây không nhìn → reset session

        // Random smile during eye contact
        this.lastSmileTime = 0;
        this.nextSmileDelay = 20000 + Math.random() * 10000; // 20-30s

        // THÊM: Tolerance margin để gaze không bị nhảy ra ngoài
        this.GAZE_TOLERANCE = 200; // pixels - tăng từ 100px để dễ detect hơn

        // Log avatar bounds để debug
        console.log('📐 Avatar bounds:', this.avatarBounds);
        console.log(`📐 Expanded bounds (with ${this.GAZE_TOLERANCE}px tolerance):`, {
            x: this.avatarBounds.x - this.GAZE_TOLERANCE,
            y: this.avatarBounds.y - this.GAZE_TOLERANCE,
            width: this.avatarBounds.width + (this.GAZE_TOLERANCE * 2),
            height: this.avatarBounds.height + (this.GAZE_TOLERANCE * 2)
        });
    }

    getRandomSmileDelay() {
        // Random delay giữa 20-30 giây
        return 20000 + Math.random() * 10000;
    }

    async init() {
        console.log('👁️ Initializing Eye Contact Detector (Session-based)...');

        // Configure WebGazer params BEFORE starting
        webgazer.params.showVideo = false;
        webgazer.params.showFaceOverlay = false;
        webgazer.params.showFaceFeedbackBox = false;
        webgazer.params.showPredictionPoints = false;

        // Start WebGazer with gaze listener
        let lastLogTime = 0;
        await webgazer.setGazeListener((data, elapsedTime) => {
            // Debug log mỗi 3 giây để biết WebGazer có đang chạy không
            const now = Date.now();
            if (now - lastLogTime > 3000) {
                lastLogTime = now;
                if (data == null) {
                    console.log('👁️ [WebGazer] Gaze data is NULL (no face/eyes detected)');
                } else {
                    const inBounds = this.isPointInBounds(data.x, data.y);
                    console.log(`👁️ [WebGazer] Gaze: x=${Math.round(data.x)}, y=${Math.round(data.y)} | inBounds: ${inBounds} | Mode: ${this.currentMode}`);

                    // Log thêm chi tiết bounds để debug
                    if (!inBounds) {
                        console.log(`   📐 Avatar: x=${this.avatarBounds.x}-${this.avatarBounds.x + this.avatarBounds.width}, y=${this.avatarBounds.y}-${this.avatarBounds.y + this.avatarBounds.height} (tolerance: ${this.GAZE_TOLERANCE})`);
                    }
                }
            }

            if (data == null) return;

            // Chỉ check eye contact khi ở Eye Contact Mode
            if (this.currentMode === this.MODE_EYE_CONTACT) {
                this.checkEyeContact(data.x, data.y);
            }
        }).begin();

        // Hide all WebGazer UI for clean experience
        webgazer.showVideoPreview(false);
        webgazer.showPredictionPoints(false);
        webgazer.showFaceOverlay(false);
        webgazer.showFaceFeedbackBox(false);

        // Đợi WebGazer video element được tạo
        setTimeout(async () => {
            const webgazerVideo = document.querySelector('video');
            if (webgazerVideo) {
                console.log('✅ WebGazer video element found');

                // TẠO VIDEO ELEMENT RIÊNG cho face detection
                // Clone stream từ WebGazer video
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'face-detection-video';
                this.videoElement.autoplay = true;
                this.videoElement.playsInline = true;

                // Get stream từ WebGazer video
                if (webgazerVideo.srcObject) {
                    this.videoElement.srcObject = webgazerVideo.srcObject;

                    // Ẩn video này (không cần hiển thị)
                    this.videoElement.style.position = 'absolute';
                    this.videoElement.style.left = '-9999px';
                    this.videoElement.style.width = '640px';
                    this.videoElement.style.height = '480px';

                    document.body.appendChild(this.videoElement);

                    // Đợi video ready
                    await new Promise(resolve => {
                        this.videoElement.onloadedmetadata = () => {
                            console.log('✅ Face detection video ready');
                            resolve();
                        };
                    });

                    console.log('✅ Video element found and ready for face detection');
                } else {
                    console.warn('⚠️ WebGazer video has no srcObject');
                    this.videoElement = webgazerVideo; // Fallback
                }
            } else {
                console.warn('⚠️ WebGazer video element not found');
            }
        }, 2000);

        console.log('✅ Eye Contact Detector initialized');
        console.log(`📍 Starting in ${this.currentMode.toUpperCase()} mode`);
        return true;
    }

    async checkEyeContact(gazeX, gazeY) {
        const isLookingNow = this.isPointInBounds(gazeX, gazeY);

        if (isLookingNow) {
            // User đang nhìn vào avatar
            this.lastLookAwayTime = null; // Reset look away timer

            if (!this.lookingAtAvatar) {
                // Bắt đầu nhìn vào avatar
                this.lookingAtAvatar = true;
                this.lookStartTime = Date.now();
                console.log('👀 User started looking at avatar');
            } else {
                // Đang nhìn liên tục
                const lookDuration = Date.now() - this.lookStartTime;

                if (lookDuration >= this.GREETING_DELAY && !this.isProcessingGreeting) {
                    // Đã nhìn đủ 2 giây - kiểm tra và chào
                    console.log(`✅ Eye contact maintained for ${(lookDuration / 1000).toFixed(1)}s`);
                    await this.checkAndGreet();
                    this.lookingAtAvatar = false; // Reset
                }

                // Random smile trigger (chỉ khi đã greeted và bot không đang nói)
                if (this.hasGreeted && !this.isProcessingGreeting) {
                    // KIỂM TRA: Không cười khi bot đang nói
                    if (window.isBotSpeaking && window.isBotSpeaking()) {
                        return; // Skip smile khi bot đang nói
                    }

                    const now = Date.now();
                    const timeSinceLastSmile = now - this.lastSmileTime;

                    // Nếu đủ thời gian delay → trigger smile
                    if (timeSinceLastSmile >= this.nextSmileDelay) {
                        console.log('😊 Triggering random smile...');
                        this.triggerSmile();
                        this.lastSmileTime = now;
                        this.nextSmileDelay = this.getRandomSmileDelay();
                    }
                }
            }
        } else {
            // Không nhìn nữa
            if (this.lookingAtAvatar) {
                const lookDuration = Date.now() - this.lookStartTime;
                console.log(`❌ User stopped looking (${(lookDuration / 1000).toFixed(1)}s)`);
                this.lookingAtAvatar = false;
                this.lookStartTime = null;
            }

            // Bắt đầu đếm thời gian không nhìn để reset session
            if (this.hasGreeted && this.lastLookAwayTime === null) {
                this.lastLookAwayTime = Date.now();
                console.log('⏱️ User looked away - starting session reset timer (5s)');
            }

            // Kiểm tra xem đã đủ 5 giây chưa
            if (this.hasGreeted && this.lastLookAwayTime !== null) {
                const timeSinceLookAway = Date.now() - this.lastLookAwayTime;
                if (timeSinceLookAway >= this.RESET_SESSION_TIMEOUT) {
                    console.log('🔄 Session reset - user can be greeted again');
                    this.hasGreeted = false;
                    this.lastLookAwayTime = null;
                }
            }
        }
    }

    async checkAndGreet() {
        if (this.isProcessingGreeting) {
            console.log('⏭️ Already processing greeting');
            return;
        }

        // Kiểm tra đã chào trong session này chưa
        if (this.hasGreeted) {
            console.log('⏭️ Already greeted in this session');
            return;
        }

        // KIỂM TRA: Không chào khi bot đang nói
        if (window.isBotSpeaking && window.isBotSpeaking()) {
            console.log('⏸️ Bot is speaking - skipping eye contact greeting');
            return;
        }

        // KIỂM TRA: Chỉ chào khi conversation còn trống (chưa có message)
        // Tránh interrupt khi bot đang trả lời
        if (window.getConversationLength && window.getConversationLength() > 0) {
            console.log('⏸️ Conversation in progress - skipping eye contact greeting');
            return;
        }

        this.isProcessingGreeting = true;

        try {
            // TẠM THỜI BỎ FACE RECOGNITION - Chỉ chào khi eye contact
            console.log('👋 Eye contact detected - triggering greeting (no face recognition)');

            const result = {
                shouldGreet: true,
                userId: 'guest_' + Date.now(),
                isNewUser: true
            };

            // Đánh dấu đã chào
            this.hasGreeted = true;
            this.lastLookAwayTime = null; // Reset look away timer

            // Trigger greeting callback
            if (this.greetingCallback) {
                this.greetingCallback(result);
            }

            // Chuyển sang Face Tracking Mode (tạm thời disabled)
            // this.switchToFaceTrackingMode();

        } catch (error) {
            console.error('❌ Error in checkAndGreet:', error);
        } finally {
            this.isProcessingGreeting = false;
        }
    }

    triggerSmile() {
        // Gọi avatar để cười
        if (window.avatarViewer && window.avatarViewer.smile) {
            window.avatarViewer.smile(10000); // Cười trong 10 giây
        }
    }

    switchToFaceTrackingMode() {
        console.log(`🔄 Switching to FACE TRACKING mode for user: ${this.currentUserId}`);
        this.currentMode = this.MODE_FACE_TRACKING;

        // Bắt đầu face tracking interval
        this.startFaceTracking();
    }

    switchToEyeContactMode() {
        console.log('🔄 Switching to EYE CONTACT mode');
        this.currentMode = this.MODE_EYE_CONTACT;
        this.currentUserId = null;

        // Dừng face tracking interval
        this.stopFaceTracking();
    }

    startFaceTracking() {
        // Dừng interval cũ nếu có
        this.stopFaceTracking();

        console.log(`👤 Starting face tracking (check every ${this.FACE_CHECK_INTERVAL / 1000}s)`);

        // Check face mỗi 3 giây
        this.faceTrackingInterval = setInterval(async () => {
            await this.checkFaceChange();
        }, this.FACE_CHECK_INTERVAL);
    }

    stopFaceTracking() {
        if (this.faceTrackingInterval) {
            clearInterval(this.faceTrackingInterval);
            this.faceTrackingInterval = null;
            console.log('⏹️ Stopped face tracking');
        }
    }

    async checkFaceChange() {
        if (!this.videoElement) return;

        try {
            // Detect face
            const faceDescriptor = await this.faceRecognition.detectAndExtractFace(
                this.videoElement
            );

            if (!faceDescriptor) {
                console.log('⚠️ No face detected in tracking mode');
                // Không detect được face - có thể user đi ra
                // Chờ thêm 1 lần nữa trước khi switch mode
                return;
            }

            // So sánh với current user
            const matchedUser = this.faceRecognition.findMatchingUser(faceDescriptor);

            if (!matchedUser) {
                // Không match với ai cả - User mới hoàn toàn
                console.log('✨ New person detected - no match in database');

                // Lưu user mới
                const newUserId = this.faceRecognition.addNewUser(faceDescriptor);
                console.log(`💾 Saved new user: ${newUserId}`);

                // Chuyển về Eye Contact Mode để chào user mới
                this.switchToEyeContactMode();

            } else if (matchedUser.userId !== this.currentUserId) {
                // Match với user khác - User B thay thế User A
                console.log(`🔄 Different user detected: ${matchedUser.userId} (was ${this.currentUserId})`);

                // Update current user
                this.currentUserId = matchedUser.userId;

                // Chuyển về Eye Contact Mode để chào user này
                this.switchToEyeContactMode();

            } else {
                // Match với current user - User vẫn đứng đó
                console.log(`✅ Same user confirmed: ${this.currentUserId}`);

                // Update timestamp
                matchedUser.lastSeenTime = Date.now();
                this.faceRecognition.saveKnownFaces();
            }

        } catch (error) {
            console.error('❌ Error in checkFaceChange:', error);
        }
    }

    isPointInBounds(x, y) {
        // Sử dụng tolerance để mở rộng vùng detect
        const tolerance = this.GAZE_TOLERANCE;
        const inBounds = (
            x >= this.avatarBounds.x - tolerance &&
            x <= this.avatarBounds.x + this.avatarBounds.width + tolerance &&
            y >= this.avatarBounds.y - tolerance &&
            y <= this.avatarBounds.y + this.avatarBounds.height + tolerance
        );
        return inBounds;
    }

    pause() {
        webgazer.pause();
        this.stopFaceTracking();
        console.log('⏸️ Eye contact detector paused');
    }

    resume() {
        webgazer.resume();
        if (this.currentMode === this.MODE_FACE_TRACKING) {
            this.startFaceTracking();
        }
        console.log('▶️ Eye contact detector resumed');
    }

    stop() {
        webgazer.end();
        this.stopFaceTracking();
        console.log('🛑 Eye contact detector stopped');
    }

    // Debug: Get stats
    getStats() {
        return {
            mode: this.currentMode,
            currentUserId: this.currentUserId,
            faceRecognition: this.faceRecognition.getStats(),
            isLooking: this.lookingAtAvatar,
            lookDuration: this.lookingAtAvatar ? Date.now() - this.lookStartTime : 0
        };
    }

    // Debug: Clear database
    async clearDatabase() {
        await this.faceRecognition.clearDatabase();
        this.switchToEyeContactMode();
        console.log('🗑️ Face database cleared, reset to Eye Contact Mode');
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.EyeContactDetector = EyeContactDetector;
}
