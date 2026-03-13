"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import RadioDial from "./RadioDial";
import { useAudioEngine } from "../hooks/useAudioEngine";
import { PanelEmotion } from "../types";

interface MoodCoreProps {
    vibe: string | null;
    stems: Record<string, string> | null;
    leitmotifs: Record<string, string>;
    currentEmotion?: PanelEmotion | null;
    isGenerating: boolean;
    onVibeChange?: (vibe: string) => void;
}

const VIBE_ASSETS: Record<string, Record<string, string>> = {
    "dark_synth": {
        "ambient": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_synth_ambient.mp3",
        "rhythm": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_synth_rhythm.mp3",
        "melody": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_synth_melody.mp3"
    },
    "epic_orchestral": {
        "ambient": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_epic_ambient.mp3",
        "rhythm": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_epic_rhythm.mp3",
        "melody": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_epic_melody.mp3"
    },
    "classical_romantic": {
        "ambient": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_classical_ambient.mp3",
        "rhythm": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_classical_rhythm.mp3",
        "melody": "https://storage.googleapis.com/lotus-studio-assets/audio/loop_classical_melody.mp3"
    },
    // Add other fallbacks if needed
};

export default function MoodCore({ vibe, stems, leitmotifs, currentEmotion, isGenerating, onVibeChange }: MoodCoreProps) {
    // Merge backend stems with VIBE_ASSETS fallbacks
    const effectiveStems = {
        ...(vibe ? VIBE_ASSETS[vibe] : {}),
        ...stems
    };

    const { play, pause, toggleMute, setStemIntensity, playLeitmotif, playSpatialSound, isPlaying, isMuted } = useAudioEngine(effectiveStems, vibe);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const handleInteraction = () => {
            setHasInteracted(true);
            window.removeEventListener("click", handleInteraction);
        };
        window.addEventListener("click", handleInteraction);
        return () => window.removeEventListener("click", handleInteraction);
    }, []);

    // Initial Play logic
    useEffect(() => {
        if (hasInteracted && (isGenerating || vibe || stems) && !isPlaying) {
            play();
        }
    }, [hasInteracted, isGenerating, vibe, stems, isPlaying, play]);

    // Dynamic Stem Mixing Logic
    useEffect(() => {
        if (!isPlaying) return;

        // Default: Ambient is always 1
        setStemIntensity("ambient", 1);

        // Rhythm: High during combat, tension, or chase
        if (currentEmotion === "tense" || currentEmotion === "dread" || currentEmotion === "peak_fear") {
            setStemIntensity("rhythm", 1);
        } else {
            setStemIntensity("rhythm", 0.2); // Keep a low pulse
        }

        // Melody: High during peaks or revelations
        if (currentEmotion === "revelation" || currentEmotion === "hopeful" || currentEmotion === "resolved") {
            setStemIntensity("melody", 1);
        } else {
            setStemIntensity("melody", 0.3);
        }
    }, [currentEmotion, isPlaying, setStemIntensity]);

    // Handle Leitmotif Custom Event
    useEffect(() => {
        const handleLeitmotif = (e: any) => {
            const characterName = e.detail.characterName;
            if (leitmotifs[characterName]) {
                playLeitmotif(leitmotifs[characterName]);
            }
        };
        window.addEventListener("play_leitmotif", handleLeitmotif);
        return () => window.removeEventListener("play_leitmotif", handleLeitmotif);
    }, [leitmotifs, playLeitmotif]);

    // Handle Spatial SFX Event
    useEffect(() => {
        const handleSpatialSFX = (e: any) => {
            const { url, xPos } = e.detail;
            if (url) {
                playSpatialSound(url, xPos);
            }
        };
        window.addEventListener("play_spatial_sfx", handleSpatialSFX);
        return () => window.removeEventListener("play_spatial_sfx", handleSpatialSFX);
    }, [playSpatialSound]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) pause();
        else play();
    };

    const restartMusic = (e: React.MouseEvent) => {
        e.stopPropagation();
        pause();
        setTimeout(play, 100);
    };

    const onToggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleMute();
    };

    if (!vibe && !isGenerating && !stems) return null;

    return (
        <div 
            style={{
                position: "fixed",
                bottom: "100px",  // Lifted from bottom
                left: "50%",
                transform: "translateX(-50%)", // Centered horizontally
                zIndex: 100,
                cursor: "pointer",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: -10 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: "absolute",
                            bottom: "100%", // Above the dial
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: "16px",
                            background: "rgba(10,10,12,0.9)",
                            backdropFilter: "blur(20px)",
                            padding: "12px 24px",
                            borderRadius: "100px",
                            border: "1px solid rgba(201, 168, 76, 0.4)",
                            alignItems: "center",
                            boxShadow: "0 12px 48px rgba(0,0,0,0.6)"
                        }}
                    >
                         <button onClick={restartMusic} className="hover:text-gold text-silver transition-colors scale-125"><RotateCcw size={18} /></button>
                         <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)" }} />
                         <button onClick={togglePlay} className="hover:text-gold text-silver transition-colors scale-125">
                            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
                         </button>
                         <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)" }} />
                         <button onClick={onToggleMute} className="hover:text-gold text-silver transition-colors scale-125">
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                         </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    width: "220px",  // Shrunk container
                    height: "240px",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                {/* Tactical Radio Dial (Smaller) */}
                <RadioDial 
                    currentVibe={vibe} 
                    onVibeChange={(v) => onVibeChange?.(v)} 
                    size={180} // Shrunk from 260
                />

                {/* Sub-label (moved down further) */}
                <div style={{
                    marginTop: "50px",
                    textAlign: "center",
                }}>
                     <motion.span 
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ fontSize: "9px", color: "var(--color-gold)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: "bold" }}>
                        {stems ? "HYPER-DIMENSIONAL AUDIO SYNTH" : "MANUAL INTERFERENCE MODE"}
                    </motion.span>
                </div>
            </motion.div>
        </div>
    );
}
