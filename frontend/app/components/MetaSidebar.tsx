"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { MetaChunk } from "../types";
import {
    Clock01Icon,
    Tick01Icon,
    AlertCircleIcon,
    ZapIcon
} from "hugeicons-react";

interface MetaSidebarProps {
    logs: MetaChunk[];
    isOpen: boolean;
}

export default function MetaSidebar({ logs, isOpen }: MetaSidebarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) return null;

    return (
        <motion.aside
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{
                position: "fixed",
                right: 0,
                bottom: 0,
                width: "360px",
                height: "calc(100vh - 70px)",
                background: "rgba(11, 11, 11, 0.95)",
                borderLeft: "1px solid var(--border-subtle)",
                top: "70px",
                flexDirection: "column",
                zIndex: 90,
            }}
        >
            {/* Header */}
            <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-gold-alpha)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
            }}>
                <ZapIcon size={18} className="text-gold" />
                <h2 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-primary)",
                }}>
                    Agent Command Feed
                </h2>
            </div>

            {/* Logs List */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    scrollBehavior: "smooth",
                }}
                className="custom-scrollbar"
            >
                <AnimatePresence mode="popLayout">
                    {logs.map((log, i) => (
                        <motion.div
                            key={`${log.node}-${i}`}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                            }}
                        >
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}>
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: "var(--gold-muted)",
                                    letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                }}>
                                    {log.node.replace("_node", "").replace("_", " ")}
                                </span>
                                {log.status === "complete" && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "10px",
                                        color: "var(--silver-dim)",
                                    }}>
                                        <Clock01Icon size={12} />
                                        {((log.duration_ms ?? 0) / 1000).toFixed(1)}s
                                    </div>
                                )}
                            </div>

                            <div style={{
                                display: "flex",
                                gap: "10px",
                                padding: "10px 12px",
                                background: "rgba(255, 255, 255, 0.03)",
                                borderLeft: `2px solid ${log.status === "error" ? "var(--accent-red)" :
                                    log.status === "complete" ? "var(--gold-bright)" :
                                        "var(--gold-muted)"
                                    }`,
                                borderRadius: "4px 8px 8px 4px",
                            }}>
                                {log.status === "complete" ? (
                                    <Tick01Icon size={14} className="text-gold" style={{ marginTop: "2px", flexShrink: 0 }} />
                                ) : log.status === "error" ? (
                                    <AlertCircleIcon size={14} style={{ color: "var(--accent-red)", marginTop: "2px", flexShrink: 0 }} />
                                ) : (
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ZapIcon size={14} className="text-gold" style={{ marginTop: "2px", flexShrink: 0 }} />
                                    </motion.div>
                                )}
                                <p style={{
                                    fontSize: "12px",
                                    lineHeight: "1.5",
                                    color: log.status === "error" ? "var(--accent-red)" : "var(--silver-bright)",
                                    margin: 0,
                                }}>
                                    {log.content}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {logs.length === 0 && (
                    <div style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.3,
                        gap: "12px",
                    }}>
                        <Clock01Icon size={32} />
                        <p style={{ fontSize: "12px", textAlign: "center" }}>
                            Waiting for crew initialization...
                        </p>
                    </div>
                )}
            </div>

            {/* Footer / Status */}
            <div style={{
                padding: "16px 20px",
                fontSize: "10px",
                color: "var(--silver-dim)",
                borderTop: "1px solid var(--border-gold-alpha)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <span>ENCRYPTED_ADK_LINE</span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                    LIVE
                </span>
            </div>
        </motion.aside>
    );
}
