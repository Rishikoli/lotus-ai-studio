"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneIcon, XIcon, SendIcon, MicIcon } from "lucide-react";

interface DirectorHotlineProps {
    sessionId: string | null;
    isGenerating: boolean;
    onInterrupt: (feedback: string) => Promise<any>;
}

export default function DirectorHotline({ sessionId, isGenerating, onInterrupt }: DirectorHotlineProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
    const [isListening, setIsListening] = useState(false);

    const toggleListening = () => {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new Recognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setFeedback(prev => prev + (prev ? " " : "") + transcript);
        };

        recognition.start();
    };

    if (!isGenerating && !isOpen) return null;

    const handleSubmit = async () => {
        if (!feedback.trim() || !sessionId) return;
        setStatus("submitting");
        try {
            await onInterrupt(feedback);
            setStatus("success");
            setFeedback("");
            setTimeout(() => {
                setStatus("idle");
                setIsOpen(false);
            }, 1500);
        } catch (err) {
            console.error("Interruption failed", err);
            setStatus("idle");
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            <AnimatePresence mode="wait">
                {isOpen ? (
                    <motion.div
                        key="hotline-panel"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="glass-panel"
                        style={{
                            width: "320px",
                            padding: "20px",
                            border: "1px solid rgba(201, 168, 76, 0.4)",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(201,168,76,0.15)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <PhoneIcon size={16} className="text-gold animate-pulse" />
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold-bright)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                    Director's Hotline
                                </span>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{ color: "var(--text-dim)", cursor: "pointer", background: "none", border: "none" }}>
                                <XIcon size={18} />
                            </button>
                        </div>

                        {status === "success" ? (
                            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--gold-bright)", fontSize: "14px", fontWeight: 600 }}>
                                [[ INTERJECTION RECEIVED. ADAPTING... ]]
                            </div>
                        ) : (
                            <>
                                <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px", lineHeight: "1.5" }}>
                                    Shout "CUT!" or give mid-generation feedback to steer the story.
                                </p>
                                
                                <div style={{ position: "relative" }}>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="e.g. 'Make it darker!', 'Too much rain', 'Add a plot twist'"
                                        style={{
                                            width: "100%",
                                            height: "100px",
                                            background: "rgba(0,0,0,0.4)",
                                            border: "1px solid rgba(201, 168, 76, 0.2)",
                                            borderRadius: "var(--radius-md)",
                                            padding: "12px",
                                            color: "white",
                                            fontSize: "14px",
                                            resize: "none",
                                            outline: "none",
                                            fontFamily: "var(--font-sans)",
                                            transition: "border-color 0.3s ease",
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = "var(--gold-primary)"}
                                        onBlur={(e) => e.target.style.borderColor = "rgba(201, 168, 76, 0.2)"}
                                    />
                                    <button 
                                        onClick={toggleListening}
                                        style={{ 
                                            position: "absolute", 
                                            bottom: "8px", 
                                            right: "8px", 
                                            background: isListening ? "var(--color-error)" : "rgba(201, 168, 76, 0.1)", 
                                            border: "1px solid rgba(201, 168, 76, 0.2)",
                                            borderRadius: "4px",
                                            padding: "4px 8px",
                                            color: isListening ? "white" : "var(--gold-dim)",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        <MicIcon size={14} className={isListening ? "animate-pulse" : ""} />
                                        {isListening && <span style={{ fontSize: "10px", fontWeight: 600 }}>Listening...</span>}
                                    </button>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "#E8D48B", color: "#000000" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit}
                                    disabled={!feedback.trim() || status === "submitting"}
                                    style={{
                                        marginTop: "16px",
                                        width: "100%",
                                        padding: "12px",
                                        background: "transparent",
                                        border: "1px solid var(--gold-bright)",
                                        color: "var(--gold-bright)",
                                        borderRadius: "var(--radius-md)",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                    }}
                                >
                                    {status === "submitting" ? "Paging Director..." : (
                                        <>
                                            <SendIcon size={14} /> Send Interjection
                                        </>
                                    )}
                                </motion.button>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <motion.button
                        key="hotline-trigger"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        whileHover={{ scale: 1.1, boxShadow: "0 0 30px rgba(201,168,76,0.6)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="hotline-trigger"
                        style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            background: "var(--gold-bright)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(201,168,76,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "black",
                            cursor: "pointer",
                            border: "none",
                        }}
                    >
                        <PhoneIcon size={24} />
                        <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                                position: "absolute",
                                inset: -4,
                                border: "2px solid var(--gold-bright)",
                                borderRadius: "50%",
                                pointerEvents: "none"
                            }}
                        />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
