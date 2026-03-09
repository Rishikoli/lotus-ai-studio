"use client";

import { useState } from "react";
import { Film02Icon, GitBranchIcon, FlashIcon } from "hugeicons-react";

interface NavbarProps {
    sessionId?: string | null;
    onGalleryClick?: () => void;
}

export default function Navbar({ sessionId, onGalleryClick }: NavbarProps) {
    const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

    // Warm up Cloud Run on mount by pinging /health
    // Called from page.tsx on load — prevents cold start on first Generate click
    const pingHealth = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
            setIsHealthy(res.ok);
        } catch {
            setIsHealthy(false);
        }
    };

    return (
        <nav
            style={{
                position: "fixed",
                top: 0, left: 0, right: 0,
                zIndex: 100,
                height: "56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                background: "rgba(8, 8, 8, 0.85)",
                borderBottom: "1px solid var(--border-subtle)",
                backdropFilter: "blur(20px) saturate(1.5)",
            }}
        >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                    className="icon-base icon-active"
                    style={{ width: "20px", height: "20px" }}
                >
                    <Film02Icon size={20} />
                </div>
                <span
                    className="glow-text"
                    style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "18px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                    }}
                >
                    Lotus
                </span>
                <span
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--silver-dim)",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        alignSelf: "flex-end",
                        paddingBottom: "2px",
                    }}
                >
                    AI Studio
                </span>
            </div>

            {/* Center: session indicator */}
            {sessionId && (
                <div
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--silver-dim)",
                        letterSpacing: "0.1em",
                    }}
                >
                    <span style={{ color: "var(--gold-dim)" }}>SESSION</span>
                    {" "}
                    {sessionId.slice(0, 8).toUpperCase()}
                </div>
            )}

            {/* Right: actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Backend health indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                        style={{
                            width: "6px", height: "6px",
                            borderRadius: "50%",
                            background: isHealthy === null ? "var(--color-idle)"
                                : isHealthy ? "var(--color-complete)"
                                    : "var(--color-error)",
                            boxShadow: isHealthy ? "0 0 6px var(--color-complete)" : "none",
                            transition: "background var(--transition-base)",
                        }}
                    />
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {isHealthy === null ? "API" : isHealthy ? "ONLINE" : "OFFLINE"}
                    </span>
                </div>

                {/* Gallery button */}
                <button className="btn-ghost" onClick={onGalleryClick} style={{ fontSize: "12px", padding: "6px 12px" }}>
                    <GitBranchIcon size={14} />
                    Story Commits
                </button>

                {/* Flash - Branch indicator */}
                <div className="icon-base icon-idle" style={{ cursor: "default" }}>
                    <FlashIcon size={16} />
                </div>
            </div>
        </nav>
    );
}
