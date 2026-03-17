"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
    Chat01Icon as ChatIcon, 
    Cancel01Icon as CloseIcon, 
    SentIcon, 
    UserIcon, 
    AiChat01Icon as CharacterIcon,
    Tick01Icon as ApplyIcon,
    RefreshIcon
} from "hugeicons-react";
import { InterrogationMessage } from "../types";

interface InterrogationTerminalProps {
    sessionId: string;
    characterName: string;
    onClose: () => void;
    onApplyNegotiation: (outcome: string, influence: string) => Promise<void>;
}

export default function InterrogationTerminal({ 
    sessionId, 
    characterName, 
    onClose,
    onApplyNegotiation 
}: InterrogationTerminalProps) {
    const [messages, setMessages] = useState<InterrogationMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [showOutcomePanel, setShowOutcomePanel] = useState(false);
    const [outcome, setOutcome] = useState("");
    const [influence, setInfluence] = useState("");
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: InterrogationMessage = { 
            role: "user", 
            content: input, 
            timestamp: Date.now() 
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interrogate`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-API-Key": "lotus-demo-key"
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    character_name: characterName,
                    user_message: input,
                    chat_history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            const data = await res.json();
            const charMsg: InterrogationMessage = { 
                role: "character", 
                content: data.message, 
                timestamp: Date.now() 
            };
            setMessages(prev => [...prev, charMsg]);
        } catch (err) {
            console.error("Interrogation failed:", err);
        } finally {
            setIsTyping(false);
        }
    };

    const handleApply = async () => {
        setIsApplying(true);
        try {
            await onApplyNegotiation(outcome, influence);
            onClose();
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.8)",
                    backdropFilter: "blur(8px)",
                    zIndex: 998,
                }}
                onClick={onClose}
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "calc(-50% + 20px)" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "calc(-50% + 20px)" }}
                className="glass-panel"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    width: "80vw",
                    height: "80vh",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--gold-dim)",
                    boxShadow: "0 0 100px rgba(0,0,0,0.8), inset 0 0 20px rgba(201,168,76,0.1)",
                    overflow: "hidden",
                }}
            >
            {/* Terminal Header */}
            <div style={{
                padding: "16px 24px",
                background: "rgba(201,168,76,0.15)",
                borderBottom: "1px solid rgba(201,168,76,0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backdropFilter: "blur(10px)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <CharacterIcon size={20} className="text-gold" />
                    <h2 style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "18px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        margin: 0
                    }}>
                        INTERROGATING: {characterName}
                    </h2>
                </div>
                <button onClick={onClose} style={{ color: "var(--silver-dim)", cursor: "pointer", background: "none", border: "none" }}>
                    <CloseIcon size={24} />
                </button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Chat Area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.4)" }}>
                    <div 
                        ref={scrollRef}
                        style={{ 
                            flex: 1, 
                            padding: "24px", 
                            overflowY: "auto", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "16px" 
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{ textAlign: "center", marginTop: "40px", color: "var(--silver-dim)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                                [ ENCRYPTED LINK ESTABLISHED ]<br/>
                                BEGIN TRANSCRIPTION...
                            </div>
                        )}
                        {messages.map((m, idx) => (
                            <div key={idx} style={{ 
                                display: "flex", 
                                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                                gap: "12px"
                            }}>
                                {m.role === "character" && <div style={{ marginTop: "10px" }}><CharacterIcon size={16} className="text-gold" /></div>}
                                <div style={{
                                    maxWidth: "80%",
                                    padding: "12px 16px",
                                    borderRadius: "12px",
                                    background: m.role === "user" ? "rgba(255,255,255,0.05)" : "rgba(201,168,76,0.05)",
                                    border: "1px solid",
                                    borderColor: m.role === "user" ? "rgba(255,255,255,0.1)" : "rgba(201,168,76,0.2)",
                                    fontSize: "14px",
                                    lineHeight: "1.5",
                                    color: m.role === "user" ? "var(--silver-bright)" : "var(--gold-bright)",
                                    fontFamily: m.role === "user" ? "var(--font-sans)" : "var(--font-mono)",
                                }}>
                                    {m.content}
                                </div>
                                {m.role === "user" && <div style={{ marginTop: "10px" }}><UserIcon size={16} className="text-silver" /></div>}
                            </div>
                        ))}
                        {isTyping && (
                            <div style={{ display: "flex", gap: "12px" }}>
                                <CharacterIcon size={16} className="text-gold" />
                                <div style={{ color: "var(--gold-dim)", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
                                    THINKING...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div style={{ 
                        padding: "24px", 
                        background: "rgba(0,0,0,0.6)", 
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        gap: "12px" 
                    }}>
                        <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder={`Type your message to ${characterName}...`}
                            style={{
                                flex: 1,
                                background: "rgba(0,0,0,0.4)",
                                border: "1px solid rgba(201,168,76,0.2)",
                                borderRadius: "8px",
                                padding: "12px 16px",
                                color: "#fff",
                                fontSize: "14px",
                                outline: "none",
                                transition: "all 0.3s ease",
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--gold-primary)"}
                            onBlur={(e) => e.target.style.borderColor = "rgba(201, 168, 76, 0.2)"}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="glow-box"
                            style={{
                                padding: "0 20px",
                                borderRadius: "8px",
                                background: "var(--gold-dim)",
                                color: "#000",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer"
                            }}
                        >
                            <SentIcon size={18} />
                            SEND
                        </button>
                    </div>
                </div>

                {/* Sidebar: Influence & Outcomes */}
                <div style={{ 
                    width: "300px", 
                    background: "rgba(11, 11, 11, 0.5)", 
                    borderLeft: "1px solid rgba(201, 168, 76, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px",
                    gap: "24px",
                    backdropFilter: "blur(10px)",
                }}>
                    <div style={{ textAlign: "center" }}>
                        <ChatIcon size={32} className="text-gold-dim" style={{ marginBottom: "12px" }} />
                        <h3 style={{ fontSize: "12px", letterSpacing: "0.2em", color: "var(--silver-dim)", margin: 0 }}>MISSION CONTROL</h3>
                    </div>

                    <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                        Every interaction can shape the story. If you've coerced or convinced this character, summarize the outcome to apply it to the timeline.
                    </div>

                    {!showOutcomePanel ? (
                        <button 
                            onClick={() => setShowOutcomePanel(true)}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid var(--gold-dim)",
                                background: "rgba(201,168,76,0.05)",
                                color: "var(--gold-bright)",
                                fontSize: "12px",
                                fontWeight: 600,
                                letterSpacing: "0.05em",
                                cursor: "pointer"
                            }}
                        >
                            RECORD NEGOTIATION
                        </button>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "10px", color: "var(--gold-dim)" }}>OUTCOME SUMMARY</label>
                                <textarea 
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                    placeholder="e.g. He accepted the bribe and agreed to open the side gate."
                                    style={{
                                        background: "rgba(0,0,0,0.3)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "6px",
                                        padding: "10px",
                                        color: "#fff",
                                        fontSize: "12px",
                                        height: "60px",
                                        resize: "none"
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "10px", color: "var(--gold-dim)" }}>STORY INFLUENCE</label>
                                <textarea 
                                    value={influence}
                                    onChange={(e) => setInfluence(e.target.value)}
                                    placeholder="e.g. The character is now an ally. He should appear in scene 3 to help."
                                    style={{
                                        background: "rgba(0,0,0,0.3)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "6px",
                                        padding: "10px",
                                        color: "#fff",
                                        fontSize: "12px",
                                        height: "60px",
                                        resize: "none"
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button 
                                    onClick={() => setShowOutcomePanel(false)}
                                    style={{ flex: 1, padding: "8px", fontSize: "11px", color: "var(--silver-dim)", background: "none", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}
                                >
                                    CANCEL
                                </button>
                                <button 
                                    onClick={handleApply}
                                    disabled={!outcome.trim() || !influence.trim() || isApplying}
                                    style={{ 
                                        flex: 2, 
                                        padding: "8px", 
                                        fontSize: "11px", 
                                        color: "#000", 
                                        background: "var(--gold-bright)", 
                                        border: "none", 
                                        borderRadius: "6px", 
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px"
                                    }}
                                >
                                    {isApplying ? <RefreshIcon className="animate-spin" size={14}/> : <ApplyIcon size={14} />}
                                    COMMIT
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
        </>
    );
}
