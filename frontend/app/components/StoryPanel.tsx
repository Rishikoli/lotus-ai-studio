"use client";
import React, { useState, useEffect, useRef } from "react";
import type { StoryPanel as StoryPanelType } from "../types";
import {
    MoreVerticalCircle01Icon,
    GitBranchIcon,
    Moon02Icon,
    Sun01Icon,
    LaughingIcon,
    FlashIcon,
    VolumeHighIcon,
    VolumeOffIcon
} from "hugeicons-react";
import SceneCanvas from "./SceneCanvas";
import { motion } from "motion/react";

interface StoryPanelProps {
    panel: StoryPanelType;
    sessionId: string | null;
    audioVibe?: string | null;
    onBranch?: (panelId: string, direction: string) => void;
    isBranch?: boolean;
}

const BRANCH_DIRECTIONS = [
    { key: "darker", label: "Go Darker", icon: Moon02Icon, color: "#8899AA" },
    { key: "hopeful", label: "Go Hopeful", icon: Sun01Icon, color: "#D4A843" },
    { key: "comedic", label: "Go Comedic", icon: LaughingIcon, color: "#7DB87A" },
    { key: "chaotic", label: "Go Chaotic", icon: FlashIcon, color: "#E05252" },
];

const EMOTION_THEMES: Record<string, { r: number, g: number, b: number, letterbox: string }> = {
    calm: { r: 100, g: 150, b: 255, letterbox: "5%" },
    curious: { r: 201, g: 168, b: 76, letterbox: "8%" },
    tense: { r: 255, g: 100, b: 100, letterbox: "15%" },
    dread: { r: 50, g: 0, b: 100, letterbox: "20%" },
    peak_fear: { r: 255, g: 255, b: 255, letterbox: "25%" },
    revelation: { r: 255, g: 215, b: 0, letterbox: "10%" },
    hopeful: { r: 100, g: 255, b: 150, letterbox: "5%" },
    resolved: { r: 200, g: 200, b: 200, letterbox: "5%" },
    comedic: { r: 255, g: 200, b: 50, letterbox: "0%" },
    none: { r: 255, g: 255, b: 255, letterbox: "5%" }
};

export default function StoryPanel({ panel, sessionId, audioVibe, onBranch, isBranch }: StoryPanelProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [showBranchMenu, setShowBranchMenu] = useState(false);
    const hasStartedNarration = useRef(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioInstanceRef = useRef<HTMLAudioElement | null>(null);
    
    // Check if the image reflects a quota failure
    const isImageFailed = panel.image_url?.includes("placeholder");

    const theme = EMOTION_THEMES[panel.emotion] || EMOTION_THEMES.none;
    const layoutClass = `panel-${panel.layout.replace(/_/g, "-")}`;

    // Centralized Audio Manager (simplistic for now)
    const stopAllSpeech = () => {
        window.speechSynthesis.cancel();
        if (audioInstanceRef.current) {
            audioInstanceRef.current.pause();
            audioInstanceRef.current = null;
        }
        setIsSpeaking(false);
    };

    // Audio Punter Logic (Narration & SFX)
    useEffect(() => {
        if (isMuted) return;

        // X-Position logic based on layout (-1 to 1)
        const getXPos = (layout: string) => {
            if (layout.includes("left")) return -1;
            if (layout.includes("right")) return 1;
            if (layout.includes("2col")) return panel.id.includes("2") ? 0.5 : -0.5;
            return 0; // centered
        };

        const xPos = getXPos(panel.layout);

        // 1. Narration Audio (Spatialized)
        if (panel.audio_url && !hasStartedNarration.current) {
            window.dispatchEvent(new CustomEvent("play_spatial_sfx", { 
                detail: { url: panel.audio_url, xPos: xPos * 0.3 } // narration panned less aggressively
            }));
            
            setIsSpeaking(true);
            hasStartedNarration.current = true;
            
            const charName = panel.narration?.split(":")[0] || "Unknown";
            window.dispatchEvent(new CustomEvent("play_leitmotif", { detail: { characterName: charName.trim() } }));
            
            // Note: we can't easily track .onended for the dispatched spatial audio here without a ref, 
            // but for a demo, a timeout based on narration length is a good fallback.
            const voiceTimeout = setTimeout(() => setIsSpeaking(false), 5000 + (panel.narration?.length || 0) * 50);
            return () => clearTimeout(voiceTimeout);
        }

        // 2. Specialized SFX (Highly Spatialized)
        if ((panel as any).sfx_url && !hasStartedNarration.current) {
           window.dispatchEvent(new CustomEvent("play_spatial_sfx", { 
               detail: { url: (panel as any).sfx_url, xPos } 
           }));
        }

        // 3. Fallback to Web Speech API if narration text exists but no audio_url yet
        if (panel.narration && !hasStartedNarration.current && !panel.audio_url && !panel.is_loading) {
            stopAllSpeech();
            const timeout = setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(panel.narration!);
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => 
                    v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Natural")
                );
                
                if (preferredVoice) utterance.voice = preferredVoice;
                utterance.pitch = 0.9;
                utterance.rate = 0.95;
                
                utterance.onstart = () => {
                    setIsSpeaking(true);
                    const charName = panel.narration?.split(":")[0] || "Unknown";
                    window.dispatchEvent(new CustomEvent("play_leitmotif", { detail: { characterName: charName.trim() } }));
                };
                utterance.onend = () => setIsSpeaking(false);
                window.speechSynthesis.speak(utterance);
                hasStartedNarration.current = true;
            }, 800);
            return () => clearTimeout(timeout);
        }
    }, [panel.narration, panel.audio_url, (panel as any).sfx_url, panel.is_loading, isMuted]);

    // Visibility Cleanup
    useEffect(() => {
        return () => {
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                audioInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div
            className={`card ${layoutClass}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: "relative",
                overflow: "hidden",
                borderColor: isBranch ? "rgba(107,203,119,0.3)" : "rgba(var(--gold-rgb), 0.1)",
                boxShadow: isBranch ? "0 0 20px rgba(107,203,119,0.1)" : "0 20px 60px rgba(0,0,0,0.5)",
                minHeight: "500px",
                width: "min(95vw, 1000px)", // Larger width for vertical impact
                aspectRatio: "21/9",
                flexShrink: 0,
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.05)",
            }}
        >
            {/* Cinematic Letterboxing (Top) */}
            <motion.div
                animate={{ height: theme.letterbox }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    background: "black",
                    zIndex: 8,
                }}
            />

            {/* Branch tag */}
            {isBranch && (
                <div
                    style={{
                        position: "absolute",
                        top: "12%",
                        left: "12px",
                        zIndex: 12,
                        background: "rgba(107,203,119,0.2)",
                        border: "1px solid rgba(107,203,119,0.4)",
                        borderRadius: "var(--radius-pill)",
                        padding: "2px 8px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        color: "#6BCB77",
                        letterSpacing: "0.1em",
                        opacity: isHovered ? 1 : 0.6,
                        transition: "opacity 0.4s ease",
                    }}
                >
                    ⎇ BRANCH
                </div>
            )}

            {/* Image & Animation Layers */}
            <div className="scanline-container" style={{ position: "absolute", inset: 0 }}>
                {panel.is_loading && !panel.image_url ? (
                    <>
                        <div className="shimmer" style={{ position: "absolute", inset: 0 }} />
                        <div className="scanline" />
                    </>
                ) : panel.image_url ? (
                    <SceneCanvas panel={panel} audioVibe={audioVibe} />
                ) : null}
            </div>

            {/* Cinematic Letterboxing (Bottom) */}
            <motion.div
                animate={{ height: theme.letterbox }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: "absolute",
                    bottom: 0, left: 0, right: 0,
                    background: "black",
                    zIndex: 8,
                }}
            />

            {/* HUD Layer — Glassmorphic & Adaptive */}
            <div style={{ 
                position: "absolute", 
                inset: 0, 
                zIndex: 10, 
                opacity: isHovered || isSpeaking ? 1 : 0, 
                transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                pointerEvents: (isHovered || isSpeaking) ? "auto" : "none" 
            }}>
                {/* Audio Controls */}
                <div style={{ position: "absolute", top: "12%", left: isBranch ? "80px" : "12px", zIndex: 15 }}>
                    <button 
                        className="btn-ghost"
                        style={{ 
                            padding: "6px", 
                            background: `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.2)`, 
                            backdropFilter: "blur(12px)",
                            borderRadius: "50%",
                            border: `1px solid rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.4)`
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                            stopAllSpeech();
                        }}
                    >
                        {isMuted ? <VolumeOffIcon size={14} color="#E05252" /> : <VolumeHighIcon size={14} color={`rgba(${theme.r}, ${theme.g}, ${theme.b}, 1)`} />}
                    </button>
                    
                    {isSpeaking && (
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            style={{ 
                                position: "absolute", 
                                bottom: "-4px", 
                                right: "-4px", 
                                width: "10px", 
                                height: "10px", 
                                borderRadius: "50%", 
                                background: "var(--color-gold)",
                                border: "2px solid black"
                            }} 
                        />
                    )}
                </div>

                {/* Reshoot / Retry Button (Top Right) */}
                {(isImageFailed || !panel.image_url) && !panel.is_loading && (
                    <div style={{ position: "absolute", top: "12%", right: "12px", zIndex: 15 }}>
                         <button
                            className="btn-gold"
                            style={{ 
                                padding: "6px 12px", 
                                fontSize: "10px",
                                background: "rgba(240, 98, 98, 0.2)",
                                border: "1px solid rgba(240, 98, 98, 0.4)",
                                color: "#F06262",
                                backdropFilter: "blur(12px)"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                // We call directorCut with this specific panel ID to trigger a reshoot
                                if (sessionId) {
                                    window.dispatchEvent(new CustomEvent("reshoot_panel", { 
                                        detail: { panelId: panel.id } 
                                    }));
                                }
                            }}
                        >
                            RE-SYNC IMAGE
                        </button>
                    </div>
                )}

                {/* Bottom narration strip — Glassmorphism */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "12%", left: "12px", right: "12px",
                        background: `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.08)`,
                        backdropFilter: "blur(24px) saturate(160%)",
                        border: `1px solid rgba(201, 168, 76, 0.2)`,
                        padding: "20px",
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                        transform: isSpeaking && !isHovered ? "translateY(5px)" : "none",
                        transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.8)`, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                            {panel.id.toUpperCase()}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                            {panel.emotion}
                        </span>
                        {isSpeaking && (
                            <span style={{ marginLeft: "auto", display: "flex", gap: "2px" }}>
                                {[1,2,3].map(i => (
                                    <motion.div 
                                        key={i}
                                        animate={{ height: [4, 10, 4] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                                        style={{ width: "2px", background: "var(--color-gold)", borderRadius: "1px" }}
                                    />
                                ))}
                            </span>
                        )}
                    </div>

                    {panel.narration && (
                        <p className="h2-cinema" style={{ 
                            fontSize: "20px", 
                            lineHeight: 1.4, 
                            color: "var(--text-primary)", 
                            margin: 0,
                            textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                         }}>
                            {panel.narration}
                        </p>
                    )}
                </div>

                {/* Branch button — top right */}
                {onBranch && !isBranch && (
                    <div style={{ position: "absolute", top: "12%", right: "12px" }}>
                        <button
                            className="btn-ghost"
                            style={{ 
                                padding: "5px 10px", 
                                fontSize: "11px", 
                                background: `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.2)`,
                                backdropFilter: "blur(12px)",
                                border: `1px solid rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.4)`
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowBranchMenu(v => !v);
                            }}
                        >
                            ⎇
                        </button>

                        {showBranchMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "8px",
                                    background: "rgba(10, 10, 10, 0.9)",
                                    backdropFilter: "blur(20px)",
                                    border: "1px solid var(--border-gold)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "4px",
                                    minWidth: "160px",
                                    boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
                                    zIndex: 20,
                                }}
                                className="animate-scale-in"
                            >
                                {BRANCH_DIRECTIONS.map(dir => (
                                    <button
                                        key={dir.key}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowBranchMenu(false);
                                            onBranch(panel.id, dir.key);
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", background: "transparent", border: "none", borderRadius: "var(--radius-sm)", color: dir.color, fontFamily: "var(--font-sans)", fontSize: "12px", cursor: "pointer"
                                        }}
                                    >
                                        <dir.icon size={14} />
                                        <span>{dir.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Side numbering (35mm film feel) */}
            <div style={{ 
                position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", 
                writingMode: "vertical-rl", fontSize: "10px", color: "rgba(255,255,255,0.1)", 
                fontFamily: "var(--font-mono)", letterSpacing: "0.4em" 
            }}>
                35MM FILM • KODAK 5219
            </div>

            <style>{`
                .card { transition: transform 0.4s ease; }
                .card:hover { transform: scale(1.02); }
            `}</style>
        </div>
    );
}
