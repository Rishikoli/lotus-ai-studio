"use client";

import { useEffect, useRef, useState } from "react";
import { Music, VolumeX, Volume2 } from "lucide-react";

const VIBE_ASSETS: Record<string, string> = {
    dark_synth: "https://actions.google.com/sounds/v1/ambient/dark_synth_loop.mp3", // Placeholder
    epic_orchestral: "https://actions.google.com/sounds/v1/ambient/epic_heroic_loop.mp3", // Placeholder
    lofi_mystery: "https://actions.google.com/sounds/v1/ambient/mystery_ambience.mp3", // Placeholder
    horror_ambient: "https://actions.google.com/sounds/v1/ambient/horror_drone.mp3", // Placeholder
    adventurous_folk: "https://actions.google.com/sounds/v1/ambient/acoustic_travel.mp3", // Placeholder
    default: "https://actions.google.com/sounds/v1/ambient/ambient_hum.mp3",
};

// For now, I'll use some publicly available URLs or placeholders
// In a real production app, these would be local assets or hosted on GCS.

interface BackgroundMusicProps {
    vibe: string | null;
    isGenerating: boolean;
}

export default function BackgroundMusic({ vibe, isGenerating }: BackgroundMusicProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.4);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
        }

        const audio = audioRef.current;
        const targetSrc = VIBE_ASSETS[vibe || "default"] || VIBE_ASSETS.default;

        if (audio.src !== targetSrc) {
            // Fade out, change, fade in
            let vol = audio.volume;
            const fadeOut = setInterval(() => {
                vol = Math.max(0, vol - 0.05);
                audio.volume = vol;
                if (vol <= 0) {
                    clearInterval(fadeOut);
                    audio.src = targetSrc;
                    if (!isMuted && (isGenerating || vibe)) {
                        audio.play().catch(() => console.log("Audio play blocked by interaction policy"));
                        fadeIn();
                    }
                }
            }, 50);
        } else if (!isMuted && (isGenerating || vibe) && audio.paused) {
             audio.play().catch(() => {});
             fadeIn();
        }

        function fadeIn() {
            let vol = 0;
            audio.volume = 0;
            const fadeInInterval = setInterval(() => {
                vol = Math.min(volume, vol + 0.05);
                audio.volume = vol;
                if (vol >= volume) clearInterval(fadeInInterval);
            }, 50);
        }

        return () => {
            // Optional: fade out on unmount
        };
    }, [vibe, isGenerating, isMuted, volume]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            if (!isMuted) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(() => {});
            }
        }
    };

    if (!vibe && !isGenerating) return null;

    return (
        <div 
            style={{
                position: "fixed",
                bottom: "24px",
                right: "90px", // Offset from narration toggle
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "rgba(10,10,12,0.6)",
                backdropFilter: "blur(12px)",
                padding: "8px 16px",
                borderRadius: "100px",
                border: "1px solid var(--border-subtle)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            className="animate-fade-in"
        >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Music size={14} color="var(--color-gold)" />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {vibe ? vibe.replace("_", " ") : "Finding Vibe..."}
                </span>
            </div>

            <div style={{ width: "1px", height: "14px", background: "var(--border-subtle)" }} />

            <button 
                onClick={toggleMute}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isMuted ? "var(--text-muted)" : "var(--color-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    transition: "all 0.2s ease",
                }}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {!isMuted && (
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={{
                        width: "60px",
                        accentColor: "var(--color-gold)",
                        height: "2px",
                        cursor: "pointer",
                    }}
                />
            )}
        </div>
    );
}
