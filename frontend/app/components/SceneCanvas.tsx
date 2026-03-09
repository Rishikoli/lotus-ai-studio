"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryPanel as StoryPanelType } from "../types";
import { motion, useAnimation } from "motion/react";

const EMOTION_OVERLAYS: Record<string, string> = {
    tense: "radial-gradient(ellipse at center, transparent 60%, rgba(100,60,0,0.4))",
    dread: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,30,0.6))",
    peak_fear: "radial-gradient(ellipse at center, rgba(224,82,82,0.15), rgba(0,0,0,0.5))",
    revelation: "radial-gradient(ellipse at top, rgba(201,168,76,0.3), transparent 70%)",
    hopeful: "radial-gradient(ellipse at top, rgba(212,168,67,0.2), transparent 80%)",
    resolved: "none",
    calm: "none",
    comedic: "none",
};

export default function SceneCanvas({ panel }: { panel: StoryPanelType }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const isDolbyZoom = ["peak_fear", "revelation", "horror", "tense"].includes(panel.emotion);
    const emotionOverlay = EMOTION_OVERLAYS[panel.emotion] ?? "none";
    const controls = useAnimation();

    // 1. Ken Burns & Dolby Zoom logic
    useEffect(() => {
        if (!panel.image_url) return;

        controls.start({
            scale: isDolbyZoom ? [1, 1.15] : [1.05, 1.1],
            x: isDolbyZoom ? [0, 0] : [0, -10],
            y: isDolbyZoom ? [0, 0] : [0, 5],
            transition: {
                duration: isDolbyZoom ? 0.4 : 20,
                ease: isDolbyZoom ? "backOut" : "linear",
                repeat: isDolbyZoom ? 0 : Infinity,
                repeatType: "reverse"
            }
        });
    }, [panel.image_url, panel.emotion, isDolbyZoom, controls]);

    // 2. Parallax mouse tracker
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x, y });
    };

    // 4. Particle Engine (Canvas 2D)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !panel.image_url) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: any[] = [];

        const initParticles = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            particles = [];
            const count = panel.physics.includes("heavy") ? 150 : 50;

            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: panel.physics.includes("wind") ? Math.random() * 2 + 1 : (Math.random() - 0.5),
                    vy: panel.physics.includes("rain") ? Math.random() * 10 + 10 :
                        panel.physics.includes("snow") ? Math.random() * 2 + 1 :
                            panel.physics.includes("embers") ? -(Math.random() * 3 + 1) : 0,
                    size: Math.random() * 3 + 1,
                    alpha: Math.random(),
                });
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw particles
            particles.forEach(p => {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = panel.physics.includes("embers") ? "#ffaa00" :
                    panel.physics.includes("rain") ? "#88aaff" : "#ffffff";

                ctx.beginPath();
                if (panel.physics.includes("rain")) {
                    ctx.fillRect(p.x, p.y, 1, p.size * 5); // long streaks
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Physics update
                p.x += p.vx;
                p.y += p.vy;

                // Wrap boundaries
                if (p.y > canvas.height) p.y = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.x > canvas.width) p.x = 0;
                if (p.x < 0) p.x = canvas.width;

                if (panel.physics.includes("embers")) {
                    p.alpha -= 0.01;
                    if (p.alpha <= 0) {
                        p.alpha = 1;
                        p.y = canvas.height;
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        if (panel.physics.match(/rain|snow|embers|dust/)) {
            initParticles();
            render();
        }

        window.addEventListener("resize", initParticles);
        return () => {
            window.removeEventListener("resize", initParticles);
            cancelAnimationFrame(animationFrameId);
        };
    }, [panel.physics, panel.image_url]);

    if (!panel.image_url) return null;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
            {/* Layer 1 & 2 & 7: Base Image with Ken Burns, Dolby Zoom, and Parallax */}
            <motion.div
                style={{
                    position: "absolute",
                    inset: -30, // Negative inset allows panning
                    width: "calc(100% + 60px)",
                    height: "calc(100% + 60px)",
                    transformOrigin: isDolbyZoom ? "center center" : "50% 50%",
                    x: mousePos.x * -20,
                    y: mousePos.y * -20,
                }}
            >
                <motion.img
                    src={panel.image_url}
                    alt={`Panel ${panel.id}`}
                    animate={controls}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
            </motion.div>

            {/* Layer 5: Emotion Lighting Overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: emotionOverlay,
                    zIndex: 1,
                    pointerEvents: "none",
                    mixBlendMode: "overlay",
                }}
            />

            {/* Layer 6: Particle Engine Canvas (React to Scene Physics) */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 2,
                    pointerEvents: "none",
                }}
            />

            {/* Layer 3: Cinemagraph overlay (Vignette & Grain to tie it together) */}
            <div
                className="noise-overlay"
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 3,
                    opacity: 0.1,
                    mixBlendMode: "screen",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    boxShadow: "inset 0 0 80px rgba(0,0,0,0.6)",
                    zIndex: 4,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
