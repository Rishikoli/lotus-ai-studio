"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Tv01Icon as AiVideoIcon,
    RefreshIcon,
    Tick01Icon,
    CircleIcon,
    AlertCircleIcon
} from "hugeicons-react";
import MovieExport from "./MovieExport";
import { StoryPanel } from "../types";

interface DirectorsCutBarProps {
    sessionId: string;
    panels: StoryPanel[];
    vibe?: string | null;
    onReshoot: (panelIds: string[], feedback: string) => Promise<void>;
}

export default function DirectorsCutBar({ sessionId, panels, vibe, onReshoot }: DirectorsCutBarProps) {
    const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const togglePanel = (id: string) => {
        setSelectedPanels(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleReshoot = async () => {
        if (selectedPanels.length === 0 || !feedback.trim()) return;

        setIsSubmitting(true);
        try {
            await onReshoot(selectedPanels, feedback);
            setFeedback("");
            setSelectedPanels([]);
            setIsExpanded(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                bottom: "32px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                maxWidth: "600px",
                width: "90%",
            }}
        >
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="glass-panel"
                        style={{
                            width: "100%",
                            padding: "24px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "20px",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <AiVideoIcon size={20} className="text-gold" />
                                <h3 style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "16px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    margin: 0
                                }}>
                                    Director's Cut
                                </h3>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--silver-dim)", fontFamily: "var(--font-mono)" }}>
                                SURGICAL RE-RENDER
                            </span>
                        </div>

                        {/* Panel Selector */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {panels.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => togglePanel(p.id)}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontFamily: "var(--font-mono)",
                                        background: selectedPanels.includes(p.id) ? "var(--gold-dim)" : "rgba(255,255,255,0.05)",
                                        color: selectedPanels.includes(p.id) ? "#000" : "var(--silver-bright)",
                                        border: "1px solid",
                                        borderColor: selectedPanels.includes(p.id) ? "var(--gold-bright)" : "rgba(255,255,255,0.1)",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {p.id.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Feedback Input */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontSize: "11px", color: "var(--silver-dim)", textTransform: "uppercase" }}>
                                REVISION NOTES
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="e.g. 'Make p1 more rainy', 'Reshoot p3 with a Dutch angle and high-contrast gold lighting'..."
                                style={{
                                    width: "100%",
                                    height: "80px",
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    color: "var(--text-primary)",
                                    fontSize: "13px",
                                    resize: "none",
                                    fontFamily: "var(--font-sans)",
                                }}
                            />
                        </div>
                        
                        <MovieExport panels={panels} sessionId={sessionId} vibe={vibe} />

                        <button
                            className="glow-box"
                            onClick={handleReshoot}
                            disabled={isSubmitting || selectedPanels.length === 0 || !feedback.trim()}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "8px",
                                background: "var(--gold-bright)",
                                color: "#000",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                                border: "none",
                                opacity: (selectedPanels.length > 0 && feedback.trim()) ? 1 : 0.5,
                                cursor: (selectedPanels.length > 0 && feedback.trim()) ? "pointer" : "not-allowed",
                            }}
                        >
                            {isSubmitting ? (
                                <RefreshIcon className="animate-spin" size={20} />
                            ) : (
                                <RefreshIcon size={20} />
                            )}
                            RESHOOT SELECTED PANELS
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button & Quick Export */}
            {!isExpanded && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(true)}
                        className="glow-box"
                        style={{
                            padding: "12px 24px",
                            borderRadius: "30px",
                            background: "rgba(201, 168, 76, 0.15)",
                            border: "1px solid var(--gold-dim)",
                            color: "var(--gold-bright)",
                            backdropFilter: "blur(10px)",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: "13px",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                    >
                        <AiVideoIcon size={18} />
                        ADJUST DIRECTOR'S CUT
                    </motion.button>
                    
                    <MovieExport panels={panels} sessionId={sessionId} vibe={vibe} />
                </div>
            )}
        </div>
    );
}
