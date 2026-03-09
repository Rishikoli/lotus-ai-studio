"use client";

import { useState } from "react";
import type { StoryPanel as StoryPanelType } from "../types";
import { MoreVerticalCircle01Icon, GitBranchIcon } from "hugeicons-react";

interface StoryPanelProps {
    panel: StoryPanelType;
    sessionId: string | null;
    onBranch?: (panelId: string, direction: string) => void;
    isBranch?: boolean;
}

const BRANCH_DIRECTIONS = [
    { key: "darker", label: "Go Darker 🌑", color: "#8899AA" },
    { key: "hopeful", label: "Go Hopeful ☀️", color: "#D4A843" },
    { key: "comedic", label: "Go Comedic 😂", color: "#7DB87A" },
    { key: "chaotic", label: "Go Chaotic ⚡", color: "#E05252" },
];

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

export default function StoryPanel({ panel, sessionId, onBranch, isBranch }: StoryPanelProps) {
    const [showBranchMenu, setShowBranchMenu] = useState(false);

    const layoutClass = `panel-${panel.layout.replace(/_/g, "-")}`;
    const emotionOverlay = EMOTION_OVERLAYS[panel.emotion] ?? "none";

    return (
        <div
            className={`card ${layoutClass}`}
            style={{
                position: "relative",
                overflow: "hidden",
                borderColor: isBranch ? "rgba(107,203,119,0.3)" : "var(--border-subtle)",
                boxShadow: isBranch ? "0 0 20px rgba(107,203,119,0.1)" : "none",
                minHeight: "200px",
            }}
        >
            {/* Branch tag */}
            {isBranch && (
                <div
                    style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        zIndex: 5,
                        background: "rgba(107,203,119,0.2)",
                        border: "1px solid rgba(107,203,119,0.4)",
                        borderRadius: "var(--radius-pill)",
                        padding: "2px 8px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        color: "#6BCB77",
                        letterSpacing: "0.1em",
                    }}
                >
                    ⎇ BRANCH
                </div>
            )}

            {/* Image */}
            {panel.is_loading && !panel.image_url ? (
                <div className="shimmer" style={{ position: "absolute", inset: 0 }} />
            ) : panel.image_url ? (
                <img
                    src={panel.image_url}
                    alt={`Panel ${panel.id}`}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
            ) : null}

            {/* Emotion lighting overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: emotionOverlay,
                    zIndex: 1,
                    pointerEvents: "none",
                }}
            />

            {/* Scene physics overlay: rain, grain */}
            {panel.physics?.includes("rain") && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 2,
                        backgroundImage: "repeating-linear-gradient(transparent 0px, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)",
                        backgroundSize: "3px 4px",
                        animation: "rain-fall 0.3s linear infinite",
                        pointerEvents: "none",
                    }}
                />
            )}

            {/* Bottom narration strip */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0, left: 0, right: 0,
                    zIndex: 3,
                    background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 60%, transparent)",
                    padding: "32px 16px 16px",
                }}
            >
                {/* Panel ID + emotion badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--gold-dim)",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                        }}
                    >
                        {panel.id.toUpperCase()}
                    </span>
                    <span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                        }}
                    >
                        {panel.emotion}
                    </span>
                </div>

                {/* Narration */}
                {panel.narration ? (
                    <p
                        style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "13px",
                            lineHeight: 1.6,
                            color: "var(--text-secondary)",
                            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        }}
                    >
                        {panel.narration}
                    </p>
                ) : panel.is_loading ? (
                    <div className="shimmer" style={{ height: "36px", borderRadius: "4px" }} />
                ) : null}
            </div>

            {/* Branch button — top right */}
            {onBranch && !isBranch && (
                <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 10 }}>
                    <button
                        className="btn-ghost"
                        style={{ padding: "5px 8px", fontSize: "11px" }}
                        onClick={() => setShowBranchMenu(v => !v)}
                    >
                        <div className="icon-base icon-idle">
                            <GitBranchIcon size={12} />
                        </div>
                        ⎇
                    </button>

                    {showBranchMenu && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                marginTop: "4px",
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-gold)",
                                borderRadius: "var(--radius-md)",
                                padding: "4px",
                                minWidth: "160px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                zIndex: 20,
                            }}
                            className="animate-scale-in"
                        >
                            {BRANCH_DIRECTIONS.map(dir => (
                                <button
                                    key={dir.key}
                                    onClick={() => {
                                        setShowBranchMenu(false);
                                        onBranch(panel.id, dir.key);
                                    }}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "8px 12px",
                                        background: "transparent",
                                        border: "none",
                                        borderRadius: "var(--radius-sm)",
                                        color: dir.color,
                                        fontFamily: "var(--font-sans)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        transition: "background var(--transition-fast)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    {dir.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes rain-fall {
          from { background-position: 0 0; }
          to { background-position: 0 4px; }
        }
      `}</style>
        </div>
    );
}
