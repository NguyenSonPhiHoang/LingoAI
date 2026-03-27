/**
 * 3D Avatar Viewer with Lip-sync and Eye Blinking
 * Uses Three.js to render GLB character model
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Debug mode - set to false in production
const DEBUG_MODE = false;

// Debug logging helper
const debug = {
    log: (...args) => DEBUG_MODE && debug.log(...args),
    error: (...args) => DEBUG_MODE && debug.error(...args),
    warn: (...args) => DEBUG_MODE && debug.warn(...args)
};

class AvatarViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.isBlinking = false;
        this.isSpeaking = false;

        // Idle animation state
        this.idleHeadRotation = { x: 0, y: 0 };
        this.targetHeadRotation = { x: 0, y: 0 };
        this.nextHeadMoveTime = Date.now() + 3000; // First move after 3s

        // Eye movement state
        this.eyeLookMorphs = null;
        this.currentEyeLook = { x: 0, y: 0 }; // -1 to 1 range
        this.targetEyeLook = { x: 0, y: 0 };
        this.nextEyeMoveTime = Date.now() + 2000; // First eye move after 2s

        // Smile state
        this.smileMorphs = null;
        this.currentSmile = 0;
        this.targetSmile = 0; // Default: không cười
        this.isSmiling = false;
        this.smileEndTime = 0;

        this.audioContext = null;
        this.analyser = null;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent background

        // Create camera (positioned for shoulders-up view)
        this.camera = new THREE.PerspectiveCamera(
            30, // FOV - increased for closer view
            1, // Aspect ratio (1:1 for circular container)
            0.1,
            1000
        );
        this.camera.position.set(0, 1.4, 1.2); // Closer to face, adjusted height
        this.camera.lookAt(0, 1.35, 0); // Look at upper chest/neck level

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(400, 400); // Circular container size
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Updated from outputEncoding
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 2, 1);
        this.scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-1, 0, -1);
        this.scene.add(fillLight);

        // Load model
        this.loadModel();

        // Start animation loop
        this.animate();

        // Start random blinking
        this.startBlinking();

        // Listen for tab visibility changes
        // When user returns to tab, reset blend shapes to prevent deformation
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.model) {
                debug.log('👁️ Tab became visible - resetting blend shapes');
                this.resetAllBlendShapes();
            }
        });
    }

    resetAllBlendShapes() {
        if (!this.model) return;

        this.model.traverse((child) => {
            if (child.isMesh && child.morphTargetInfluences) {
                for (let i = 0; i < child.morphTargetInfluences.length; i++) {
                    child.morphTargetInfluences[i] = 0;
                }
            }
        });

        // Also reset smile state
        this.isSmiling = false;
        this.targetSmile = 0;
        this.currentSmile = 0;

        debug.log('✅ All blend shapes reset');
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load(
            '/models/character.glb',
            (gltf) => {
                this.model = gltf.scene;

                // Scale and position model (move down to show shoulders-up)
                this.model.scale.set(1.5, 1.5, 1.5);
                this.model.position.set(0, -1.2, 0); // Move down to frame shoulders at bottom

                this.scene.add(this.model);

                // Set up animation mixer if model has animations
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                }

                // Find bones for animation
                this.findBones();

                debug.log('✅ Avatar model loaded successfully');
            },
            (progress) => {
                const percent = (progress.loaded / progress.total) * 100;
                debug.log(`Loading avatar: ${percent.toFixed(0)}%`);
            },
            (error) => {
                debug.error('❌ Error loading avatar model:', error);
            }
        );
    }

    findBones() {
        if (!this.model) return;

        debug.log('🔍 Searching for bones and blend shapes in model...');
        let allBones = [];
        let allMorphTargets = [];

        // Find jaw bone for lip-sync
        this.model.traverse((child) => {
            // Log all bones for debugging
            if (child.isBone) {
                allBones.push(child.name);
            }

            // Check for blend shapes (morph targets)
            if (child.isMesh && child.morphTargetDictionary) {
                const morphNames = Object.keys(child.morphTargetDictionary);
                allMorphTargets.push(...morphNames);

                // Look for mouth-related blend shapes
                morphNames.forEach(name => {
                    const lowerName = name.toLowerCase();
                    if (lowerName.includes('mouth') || lowerName.includes('jaw') ||
                        lowerName.includes('viseme') || lowerName.includes('aa') ||
                        lowerName.includes('open')) {
                        if (!this.mouthMorphs) this.mouthMorphs = [];
                        this.mouthMorphs.push({ mesh: child, name: name });
                        debug.log('✅ Found mouth blend shape:', name);
                    }

                    // Look for smile blend shapes
                    if (lowerName.includes('smile') || lowerName.includes('mouthsmile')) {
                        if (!this.smileMorphs) this.smileMorphs = [];
                        this.smileMorphs.push({ mesh: child, name: name });
                        debug.log('✅ Found smile blend shape:', name);
                    }
                });
            }

            if (child.isBone || child.isSkinnedMesh) {
                const name = child.name.toLowerCase();

                // Find jaw bone (broader search)
                if (name.includes('jaw') || name.includes('chin') ||
                    name.includes('mouth') || name.includes('lower')) {
                    this.jawBone = child;
                    debug.log('✅ Found jaw bone:', child.name);
                }

                // Find Head bone as fallback
                if (name === 'head') {
                    this.headBone = child;
                    debug.log('✅ Found head bone:', child.name);
                }

                // Find eye bones
                if (name.includes('eye') || name.includes('eyelid')) {
                    if (!this.eyeBones) this.eyeBones = [];
                    this.eyeBones.push(child);
                    debug.log('✅ Found eye bone:', child.name);
                }
            }
        });

        debug.log('📋 All bones in model:', allBones);
        debug.log('📋 All morph targets:', allMorphTargets);

        // Find eye look blend shapes
        this.model.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary) {
                const dict = child.morphTargetDictionary;

                if (dict['eyeLookUpLeft'] !== undefined || dict['eyeLookDownLeft'] !== undefined) {
                    this.eyeLookMorphs = {
                        mesh: child,
                        upLeft: dict['eyeLookUpLeft'],
                        upRight: dict['eyeLookUpRight'],
                        downLeft: dict['eyeLookDownLeft'],
                        downRight: dict['eyeLookDownRight'],
                        inLeft: dict['eyeLookInLeft'],
                        inRight: dict['eyeLookInRight'],
                        outLeft: dict['eyeLookOutLeft'],
                        outRight: dict['eyeLookOutRight']
                    };
                    debug.log('✅ Found eye look blend shapes');
                }
            }
        });

        if (!this.jawBone && !this.mouthMorphs && !this.headBone) {
            debug.error('❌ No jaw bone, blend shapes, or head bone found! Lip-sync will not work.');
        } else if (!this.jawBone && this.mouthMorphs) {
            debug.log('💡 Using blend shapes for lip-sync');
        } else if (!this.jawBone && this.headBone) {
            debug.log('💡 Using head bone rotation for speech animation');
        }
    }

    startBlinking() {
        const blink = () => {
            if (!this.isSpeaking && !this.isBlinking) {
                this.blink();
            }
            // Random interval between 2-6 seconds
            const nextBlink = 2000 + Math.random() * 4000;
            setTimeout(blink, nextBlink);
        };
        blink();
    }

    blink() {
        if (!this.eyeBones || this.isBlinking) return;

        this.isBlinking = true;
        const duration = 150; // Blink duration in ms

        // Close eyes
        this.eyeBones.forEach(bone => {
            if (bone.scale) {
                bone.scale.y = 0.1; // Close
            }
        });

        // Open eyes after duration
        setTimeout(() => {
            this.eyeBones.forEach(bone => {
                if (bone.scale) {
                    bone.scale.y = 1; // Open
                }
            });
            this.isBlinking = false;
        }, duration);
    }

    smile(duration = 10000) {
        // Trigger smile animation
        debug.log(`😊 Avatar smiling for ${duration / 1000}s`);
        this.isSmiling = true;
        this.targetSmile = 0.25; // Cười nhẹ (25%)
        this.smileEndTime = Date.now() + duration;
    }

    startSpeaking(audioElement) {
        if (!audioElement) return;

        this.isSpeaking = true;

        // Create audio context for analysis
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
        }

        // Connect audio to analyser
        const source = this.audioContext.createMediaElementSource(audioElement);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Start lip-sync animation
        this.animateLipSync();

        // Stop when audio ends
        audioElement.onended = () => {
            this.stopSpeaking();
        };
    }

    // Simple lip-sync without audio analysis (for Web Speech API)
    startSpeakingSimple(textLength) {
        debug.log('🎤 Starting simple lip-sync, text length:', textLength);
        debug.log('Jaw bone:', !!this.jawBone, '| Blend shapes:', !!this.mouthMorphs, '| Head bone:', !!this.headBone);

        if (!this.jawBone && !this.mouthMorphs && !this.headBone) {
            debug.error('❌ Cannot start lip-sync: No animation method available!');
            return;
        }

        this.isSpeaking = true;

        // Reset head to center when speaking starts
        if (this.headBone) {
            this.targetHeadRotation = { x: 0, y: 0 };
            this.idleHeadRotation = { x: 0, y: 0 };
            this.headBone.rotation.x = -0.35; // Keep head tilted up (same as idle)
            this.headBone.rotation.y = 0; // Face forward
        }

        this.animateSimpleLipSync();
    }

    animateSimpleLipSync() {
        if (!this.isSpeaking) {
            debug.log('⏹️ Stopped speaking');
            return;
        }

        // Alternate between open and closed mouth for natural speech
        // Real speech has consonants (closed) and vowels (open)
        const shouldOpen = Math.random() > 0.4; // 60% open, 40% closed
        const randomOpen = shouldOpen ? (Math.random() * 0.3 + 0.1) : 0; // 0.1-0.4 or 0
        const targetRotation = randomOpen;

        // Method 1: Use jaw bone rotation (preferred)
        if (this.jawBone && this.jawBone.rotation) {
            const oldRotation = this.jawBone.rotation.x || 0;
            this.jawBone.rotation.x = THREE.MathUtils.lerp(
                oldRotation,
                targetRotation,
                0.3
            );
            if (Math.random() < 0.1) {
                debug.log('👄 Jaw rotation:', this.jawBone.rotation.x.toFixed(3));
            }
        }
        // Method 2: Use blend shapes (morph targets)
        else if (this.mouthMorphs && this.mouthMorphs.length > 0) {
            this.mouthMorphs.forEach(({ mesh, name }) => {
                const index = mesh.morphTargetDictionary[name];
                if (index !== undefined) {
                    // Natural mouth movement - alternates between open and closed
                    const targetValue = shouldOpen ? (randomOpen * 0.4) : 0; // 0.04-0.16 or 0
                    mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
                        mesh.morphTargetInfluences[index] || 0,
                        targetValue,
                        0.4 // Faster lerp for snappier movement
                    );
                }
            });
            if (Math.random() < 0.1) {
                debug.log('👄 Blend shape:', shouldOpen ? 'OPEN' : 'CLOSED', (shouldOpen ? randomOpen * 0.4 : 0).toFixed(3));
            }
        }
        // Method 3: Head bone rotation - DISABLED (user doesn't want head movement)
        // else if (this.headBone && this.headBone.rotation) { ... }

        // Continue animation with random intervals (faster for more natural speech rhythm)
        if (this.isSpeaking) {
            const nextFrame = 60 + Math.random() * 80; // 60-140ms (faster than before)
            setTimeout(() => this.animateSimpleLipSync(), nextFrame);
        }
    }

    animateLipSync() {
        if (!this.isSpeaking || !this.analyser || !this.jawBone) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalized = average / 255; // 0-1

        // Map volume to jaw rotation (open mouth)
        const maxRotation = 0.3; // Max jaw open angle in radians
        const targetRotation = normalized * maxRotation;

        // Smooth jaw movement
        if (this.jawBone.rotation) {
            this.jawBone.rotation.x = THREE.MathUtils.lerp(
                this.jawBone.rotation.x || 0,
                targetRotation,
                0.3
            );
        }

        // Continue animation
        if (this.isSpeaking) {
            requestAnimationFrame(() => this.animateLipSync());
        }
    }

    stopSpeaking() {
        debug.log('🛑 Stopping lip-sync');
        this.isSpeaking = false;

        // Close mouth - jaw bone
        if (this.jawBone && this.jawBone.rotation) {
            this.jawBone.rotation.x = 0;
        }

        // Reset ALL blend shapes to prevent face deformation
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh && child.morphTargetInfluences) {
                    // Reset ALL morph targets to 0
                    for (let i = 0; i < child.morphTargetInfluences.length; i++) {
                        child.morphTargetInfluences[i] = 0;
                    }
                }
            });
        }

        // Don't reset head bone - it causes unwanted head movement
        // Head bone should stay in its original position
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Idle head movement (only when not speaking)
        if (this.headBone && !this.isSpeaking) {
            const now = Date.now();

            // Check if it's time for a new head movement
            if (now >= this.nextHeadMoveTime) {
                // Random head rotation - ONLY left/right (Y axis) - very subtle
                this.targetHeadRotation.y = (Math.random() - 0.5) * 0.15; // -0.075 to 0.075 radians (~±4 degrees)

                // Next movement in 2-4 seconds (increased frequency)
                this.nextHeadMoveTime = now + 2000 + Math.random() * 2000;
            }

            // Smoothly interpolate to target rotation
            const lerpSpeed = delta * 0.8; // Smooth transition
            this.idleHeadRotation.y += (this.targetHeadRotation.y - this.idleHeadRotation.y) * lerpSpeed;

            // STRICT clamp to prevent any excessive rotation
            this.idleHeadRotation.y = Math.max(-0.1, Math.min(0.1, this.idleHeadRotation.y));

            // Apply rotation - tilt up + subtle left/right movement
            this.headBone.rotation.x = -0.35; // Tilt head up (fixed)
            this.headBone.rotation.y = this.idleHeadRotation.y; // Subtle left/right
        }

        // Idle smile animation (always active)
        if (this.smileMorphs && !this.isSpeaking) {
            const now = Date.now();

            // Check if smile should end
            if (this.isSmiling && now >= this.smileEndTime) {
                debug.log('😐 Smile ended');
                this.isSmiling = false;
                this.targetSmile = 0; // Về mặt bình thường
            }

            // Smoothly interpolate to target smile
            const smileLerpSpeed = delta * 0.5; // Slow, gentle transition
            this.currentSmile += (this.targetSmile - this.currentSmile) * smileLerpSpeed;

            // Apply smile to all smile blend shapes
            this.smileMorphs.forEach(({ mesh, name }) => {
                const index = mesh.morphTargetDictionary[name];
                if (index !== undefined) {
                    mesh.morphTargetInfluences[index] = this.currentSmile;
                }
            });
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    smile(duration = 5000) {
        if (!this.smileMorphs) {
            debug.warn('⚠️ No smile morphs available');
            return;
        }

        debug.log(`😊 Starting smile for ${duration}ms`);
        this.isSmiling = true;
        this.targetSmile = 0.25; // Smile intensity (0-1) - subtle smile
        this.smileEndTime = Date.now() + duration;
    }

    dispose() {
        // Clean up resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other scripts (ES Module)
export default AvatarViewer;
window.AvatarViewer = AvatarViewer; // Also add to window for compatibility
