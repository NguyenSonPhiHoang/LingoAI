"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Import AvatarViewer class từ Avatar-Package
// @ts-ignore - vanilla JS class
import AvatarViewer from "../../../Avatar-Package/avatar-viewer.js";

export interface AvatarViewerRef {
    startSpeaking: (textLength?: number) => void;
    stopSpeaking: () => void;
    smile: (duration?: number) => void;
}

interface AvatarViewerProps {
    width?: number;
    height?: number;
    className?: string;
}

const AvatarViewerComponent = forwardRef<AvatarViewerRef, AvatarViewerProps>(
    ({ width = 280, height = 200, className = "" }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const avatarInstanceRef = useRef<any>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            startSpeaking: (textLength?: number) => {
                if (avatarInstanceRef.current) {
                    console.log("🎤 Avatar speaking");
                    avatarInstanceRef.current.startSpeakingSimple(textLength || 100);
                }
            },
            stopSpeaking: () => {
                if (avatarInstanceRef.current) {
                    console.log("🛑 Avatar stopped speaking");
                    avatarInstanceRef.current.stopSpeaking();
                }
            },
            smile: (duration = 10000) => {
                if (avatarInstanceRef.current) {
                    console.log("😊 Avatar smiling");
                    avatarInstanceRef.current.smile(duration);
                }
            },
        }));

        useEffect(() => {
            if (!containerRef.current) return;

            // Create unique container ID
            const containerId = `avatar-container-${Date.now()}`;
            containerRef.current.id = containerId;

            // Clean up any existing canvas from previous renders (StrictMode fix)
            const existingCanvas = containerRef.current.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }

            try {
                // Initialize AvatarViewer from original package
                const avatar = new AvatarViewer(containerId);
                avatarInstanceRef.current = avatar;

                // Expose to window for face detector
                if (typeof window !== 'undefined') {
                    (window as any).avatarViewer = avatar;
                }

                // Wait for renderer to be ready, then customize
                setTimeout(() => {
                    if (avatar.renderer) {
                        avatar.renderer.setSize(width, height);
                    }

                    // Customize camera for shoulders-up view
                    if (avatar.camera) {
                        avatar.camera.fov = 30;
                        avatar.camera.position.set(0, 1.4, 1.2); // Match original settings
                        avatar.camera.lookAt(0, 1.35, 0); // Look at upper chest/neck level
                        avatar.camera.updateProjectionMatrix();
                    }
                }, 100);

                setLoading(false);
                console.log("✅ AvatarViewer initialized from original package");
            } catch (err) {
                console.error("❌ Error initializing AvatarViewer:", err);
                setError("Failed to initialize avatar");
                setLoading(false);
            }

            // Cleanup
            return () => {
                if (avatarInstanceRef.current) {
                    // Stop animation loop
                    if (avatarInstanceRef.current.animationId) {
                        cancelAnimationFrame(avatarInstanceRef.current.animationId);
                    }

                    // Cleanup renderer
                    if (avatarInstanceRef.current.renderer) {
                        avatarInstanceRef.current.renderer.dispose();
                        const canvas = avatarInstanceRef.current.renderer.domElement;
                        if (canvas && canvas.parentNode) {
                            canvas.parentNode.removeChild(canvas);
                        }
                    }

                    // Cleanup scene
                    if (avatarInstanceRef.current.scene) {
                        avatarInstanceRef.current.scene.clear();
                    }

                    avatarInstanceRef.current = null;
                }
            };
        }, [width, height]);

        return (
            <div
                className={`relative ${className}`}
                style={{
                    width,
                    height,
                    margin: 0,
                    padding: 0,
                    lineHeight: 0,
                }}
            >
                <div
                    ref={containerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        padding: 0,
                        lineHeight: 0,
                    }}
                />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-full">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}
            </div>
        );
    }
);

AvatarViewerComponent.displayName = "AvatarViewer";

export default AvatarViewerComponent;
