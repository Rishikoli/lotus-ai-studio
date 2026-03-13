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

const VIBE_FILTERS: Record<string, string> = {
    dark_synth: "contrast(1.2) brightness(0.9) saturate(0.8) hue-rotate(-10deg)",
    epic_orchestral: "contrast(1.1) brightness(1.05) saturate(1.2) sepia(0.2)",
    lofi_mystery: "contrast(0.9) brightness(0.95) saturate(0.6)",
    horror_ambient: "contrast(1.4) brightness(0.8) saturate(0.5) hue-rotate(15deg)",
    adventurous_folk: "contrast(1.1) saturate(1.4)",
    classical_baroque: "contrast(1.2) brightness(1.1) saturate(0.9)",
    classical_romantic: "contrast(0.9) brightness(1.1) saturate(1.1) blur(0.5px)",
    classical_avantgarde: "contrast(1.5) saturate(0.3) invert(0.05)",
    cyberpunk_industrial: "contrast(1.3) brightness(0.9) saturate(1.5) hue-rotate(-20deg)",
    ethereal_zen: "brightness(1.1) saturate(0.7) blur(1px)",
    default: "none",
};

export default function SceneCanvas({ panel, audioVibe }: { panel: StoryPanelType, audioVibe?: string | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const effectsLoopRef = useRef<number | null>(null);

    const isDolbyZoom = ["peak_fear", "revelation", "horror", "tense", "dread"].includes(panel.emotion);
    const isShake = /\bshake\b/i.test(panel.physics);
    const isFlicker = /\bflicker\b/i.test(panel.physics);
    const isAberration = /\baberration\b/i.test(panel.physics);

    const emotionOverlay = EMOTION_OVERLAYS[panel.emotion] ?? "none";
    const controls = useAnimation();

    // 1. Base Ken Burns / Dolby Zoom (Slow movement)
    useEffect(() => {
        if (!panel.image_url) return;

        controls.start({
            scale: isDolbyZoom ? [1, 1.25] : [1.05, 1.25],
            transition: {
                duration: isDolbyZoom ? 0.6 : (20 + Math.random() * 10),
                ease: isDolbyZoom ? "backOut" : "easeInOut",
                repeat: isDolbyZoom ? 0 : Infinity,
                repeatType: "reverse"
            }
        });
    }, [panel.image_url, panel.emotion, isDolbyZoom, controls]);

    // 2. High-Frequency Resonance Engine (Shake, Aberration, Flicker)
    useEffect(() => {
        const tick = () => {
            const energy = (window as any).__LOTUS_AUDIO_ENERGY__ || { low: 0, mid: 0, high: 0 };
            
            if (imageContainerRef.current) {
                const el = imageContainerRef.current;
                
                // Beat-Synced Shake (Bass)
                let shakeX = 0, shakeY = 0;
                if (isShake) {
                    const intensity = energy.low * 15; // Bass drives shake intensity
                    shakeX = (Math.random() - 0.5) * intensity;
                    shakeY = (Math.random() - 0.5) * intensity;
                }

                // Beat-Synced Brightness/Contrast Pulse (Global Policy)
                const pulse = 1 + (energy.low * 0.15); // Subtle 15% brightness boost on bass
                const contrastPulse = 1 + (energy.mid * 0.1); // Subtler contrast pulse on mids
                
                // Parallax + Shake
                const pX = mousePos.x * -20;
                const pY = mousePos.y * -20;
                el.style.transform = `translate3d(${pX + shakeX}px, ${pY + shakeY}px, 0)`;
                el.style.filter = `${isAberration ? "url(#chromatic-aberration)" : ""} ${audioVibe ? (VIBE_FILTERS[audioVibe] || "") : ""} brightness(${pulse}) contrast(${contrastPulse})`.trim();

                // Melodic Aberration (Mid/High)
                if (isAberration) {
                    const shift = energy.mid * 5;
                    const filterEl = document.getElementById("resonance-aberration-red");
                    if (filterEl) filterEl.setAttribute("dx", (-shift).toString());
                    const filterElBlue = document.getElementById("resonance-aberration-blue");
                    if (filterElBlue) filterElBlue.setAttribute("dx", shift.toString());
                }

                // Heartbeat Flicker or Lightning Strobe
                if (isFlicker || /\blightning\b/i.test(panel.physics)) {
                    const overlay = el.parentElement?.querySelector(".flicker-overlay") as HTMLElement;
                    if (overlay) {
                        const isLightning = /\blightning\b/i.test(panel.physics);
                        const pulse = isLightning 
                            ? (Math.random() > 0.95 ? 0.8 : 0) // Strobe flash
                            : 0.4 + (energy.low * 0.6);        // Heartbeat pulse
                        overlay.style.opacity = pulse.toString();
                        if (isLightning && pulse > 0) {
                            overlay.style.background = "white";
                            overlay.style.mixBlendMode = "screen";
                        } else {
                            overlay.style.background = emotionOverlay;
                            overlay.style.mixBlendMode = "overlay";
                        }
                    }
                }
            }

            effectsLoopRef.current = requestAnimationFrame(tick);
        };

        effectsLoopRef.current = requestAnimationFrame(tick);
        return () => {
            if (effectsLoopRef.current) cancelAnimationFrame(effectsLoopRef.current);
        };
    }, [isShake, isAberration, isFlicker, mousePos]);

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
            const isHeavy = /\bheavy\b/i.test(panel.physics);
            const isFog = /\bfog\b/i.test(panel.physics);
            const count = isHeavy ? 150 : isFog ? 20 : 50;

            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: /\bwind\b/i.test(panel.physics) ? Math.random() * 2 + 1 : (Math.random() - 0.5),
                    vy: /\brain\b/i.test(panel.physics) ? Math.random() * 10 + 10 :
                        /\bsnow\b/i.test(panel.physics) ? Math.random() * 2 + 1 :
                            /\bembers\b/i.test(panel.physics) ? -(Math.random() * 3 + 1) :
                                /\b(petals|leaves)\b/i.test(panel.physics) ? Math.random() * 1 + 1 : 0,
                    size: isFog ? Math.random() * 150 + 100 : Math.random() * 3 + 1,
                    alpha: isFog ? Math.random() * 0.15 + 0.05 : Math.random(),
                    sway: Math.random() * Math.PI * 2,
                    swaySpeed: Math.random() * 0.05 + 0.01,
                    type: /\bpetals\b/i.test(panel.physics) ? "petal" :
                        /\bleaves\b/i.test(panel.physics) ? "leaf" :
                            isFog ? "fog" : "generic"
                });
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw particles
            particles.forEach(p => {
                ctx.globalAlpha = p.alpha;
                
                if (p.type === "petal") ctx.fillStyle = "#ffd1dc";
                else if (p.type === "leaf") ctx.fillStyle = Math.random() > 0.5 ? "#4a6741" : "#8b4513";
                else if (p.type === "fog") ctx.fillStyle = "#ffffff";
                else ctx.fillStyle = /\bembers\b/i.test(panel.physics) ? "#ffaa00" :
                    /\brain\b/i.test(panel.physics) ? "#88aaff" : "#ffffff";

                ctx.beginPath();
                if (/\brain\b/i.test(panel.physics)) {
                    ctx.fillRect(p.x, p.y, 1, p.size * 5); // long streaks
                } else if (p.type === "fog") {
                    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, `rgba(255,255,255,${p.alpha})`);
                    gradient.addColorStop(1, "rgba(255,255,255,0)");
                    ctx.fillStyle = gradient;
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === "petal" || p.type === "leaf") {
                    // Swaying organic motion
                    const swayOffset = Math.sin(p.sway) * 2;
                    ctx.ellipse(p.x + swayOffset, p.y, p.size * 2, p.size, p.sway, 0, Math.PI * 2);
                    ctx.fill();
                    p.sway += p.swaySpeed;
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Physics update
                const energy = (window as any).__LOTUS_AUDIO_ENERGY__ || { low: 0, mid: 0, high: 0 };
                
                // Beat resonance for particles
                const beatJump = energy.low * 2;
                p.x += p.vx + (p.vx > 0 ? beatJump : -beatJump);
                p.y += p.vy + beatJump;

                // Wrap boundaries
                if (p.y > canvas.height + 100) p.y = -100;
                if (p.y < -100) p.y = canvas.height + 100;
                if (p.x > canvas.width + 100) p.x = -100;
                if (p.x < -100) p.x = canvas.width + 100;

                if (/\bembers\b/i.test(panel.physics)) {
                    p.alpha -= 0.01;
                    if (p.alpha <= 0) {
                        p.alpha = 1;
                        p.y = canvas.height;
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        if (panel.physics.match(/\b(rain|snow|embers|dust|petals|leaves|fog)\b/i)) {
            initParticles();
            render();
        }

        window.addEventListener("resize", initParticles);
        return () => {
            window.removeEventListener("resize", initParticles);
            cancelAnimationFrame(animationFrameId);
        };
    }, [panel.physics, panel.image_url]);

    if (!panel.image_url || panel.image_url.includes("placeholder")) {
        return (
            <div style={{ position: "absolute", inset: 0, background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <motion.div
                    animate={{ 
                        opacity: [0.1, 0.3, 0.1, 0.4, 0.2],
                        x: [0, -2, 2, -1, 1, 0],
                        filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"]
                    }}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                    style={{ position: "absolute", inset: 0, background: "rgba(201, 168, 76, 0.05)", mixBlendMode: "screen" }}
                />
                <img 
                    src={panel.image_url || "/api/placeholder/" + panel.id}
                    alt="Feeding Error"
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4, filter: "grayscale(1) contrast(1.2)" }}
                />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10 }}>
                     <p style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--color-error)", letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.8 }}>
                        [[ FEED INTERRUPTED ]]
                     </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
            {/* SVG Filters for Chromatic Aberration */}
            <svg style={{ position: "absolute", width: 0, height: 0 }}>
                <filter id="chromatic-aberration">
                    <feOffset id="resonance-aberration-red" in="SourceGraphic" dx="-2" dy="0" result="red" />
                    <feOffset id="resonance-aberration-blue" in="SourceGraphic" dx="2" dy="0" result="blue" />
                    <feOffset in="SourceGraphic" dx="0" dy="0" result="green" />
                    <feColorMatrix in="red" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="redOnly" />
                    <feColorMatrix in="blue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blueOnly" />
                    <feColorMatrix in="green" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="greenOnly" />
                    <feBlend in="redOnly" in2="blueOnly" mode="screen" result="rb" />
                    <feBlend in="rb" in2="greenOnly" mode="screen" />
                </filter>
            </svg>

            {/* Layer 1 & 2 & 7: Base Image/Video with Ken Burns, Dolby Zoom, and Parallax */}
            <motion.div
                ref={imageContainerRef}
                style={{
                    position: "absolute",
                    inset: -30, // Negative inset allows panning
                    width: "calc(100% + 60px)",
                    height: "calc(100% + 60px)",
                    transformOrigin: isDolbyZoom ? "center center" : "50% 50%",
                    filter: `${isAberration ? "url(#chromatic-aberration)" : ""} ${audioVibe ? (VIBE_FILTERS[audioVibe] || "") : ""}`.trim() || "none",
                    willChange: "transform, filter",
                }}
            >
                {panel.video_url ? (
                    <motion.video
                        src={panel.video_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        animate={controls}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    <motion.img
                        src={panel.image_url}
                        alt={`Panel ${panel.id}`}
                        animate={controls}
                        crossOrigin="anonymous"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                )}
            </motion.div>

            {/* Cinematic Depth of Field Overlay (only for video) */}
            {panel.video_url && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    boxShadow: "inset 0 0 150px rgba(0,0,0,0.8)",
                    zIndex: 2,
                    pointerEvents: "none"
                }} />
            )}

            {/* Layer 5: Emotion Lighting Overlay */}
            <div
                className={isFlicker ? "flicker-overlay" : ""}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: emotionOverlay,
                    zIndex: 1,
                    pointerEvents: "none",
                    mixBlendMode: "overlay",
                    opacity: isFlicker ? 0.8 : 1,
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

            <style>{`
                .flicker-overlay {
                    animation: flicker 0.15s infinite alternate;
                }
                @keyframes flicker {
                    0% { opacity: 0.4; }
                    100% { opacity: 0.9; }
                }
            `}</style>
        </div>
    );
}
