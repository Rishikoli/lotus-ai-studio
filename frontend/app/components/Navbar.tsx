"use client";

import { useState } from "react";
import { Film02Icon, FlashIcon, UserIcon, Logout01Icon, GoogleIcon } from "hugeicons-react";
import { useAuth } from "../hooks/useAuth";
import StarBorder from "./StarBorder";
import { auth } from "../../lib/firebase";

interface NavbarProps {
    sessionId?: string | null;
}

export default function Navbar({ sessionId }: NavbarProps) {
    const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
    const { user, signInWithGoogle, logout } = useAuth();

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
                height: "70px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 32px",
                background: "rgba(8, 8, 8, 0.4)",
                borderBottom: "1px solid rgba(201, 168, 76, 0.15)",
                backdropFilter: "blur(24px) saturate(180%)",
            }}
        >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                    className="icon-base"
                    style={{
                        width: "80px",
                        height: "80px",
                        marginTop: "10px",
                        filter: "drop-shadow(0 0 15px var(--gold-glow))",
                        zIndex: 110
                    }}
                >
                    <img src="/logo.svg" alt="Lotus logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                        className="glow-text"
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "22px",
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            lineHeight: 1,
                        }}
                    >
                        Lotus
                    </span>
                    <span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.3em",
                            textTransform: "uppercase",
                            marginTop: "4px"
                        }}
                    >
                        AI Studio
                    </span>
                </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
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

                {/* Action Group */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

                    {/* Flash - Branch indicator */}
                    <div className="icon-base icon-idle" style={{ cursor: "default" }}>
                        <FlashIcon size={16} />
                    </div>

                    <div style={{ width: "1px", height: "24px", background: "var(--border-subtle)", margin: "0 8px" }} />

                    {/* Auth Section - Only shown if Auth is initialized */}
                    {auth && (
                        user ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-subtle)" }}>
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || "User"} style={{ width: "20px", height: "20px", borderRadius: "50%" }} />
                                    ) : (
                                        <UserIcon size={14} className="text-silver" />
                                    )}
                                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                                        {user.displayName?.split(' ')[0].toUpperCase()}
                                    </span>
                                </div>
                                <button className="btn-ghost" onClick={logout} style={{ padding: "8px" }} title="Sign Out">
                                    <Logout01Icon size={14} />
                                </button>
                            </div>
                        ) : (
                            <StarBorder
                                color="var(--gold-primary)"
                                speed="4s"
                                thickness={2}
                                onClick={signInWithGoogle}
                            >
                                <GoogleIcon size={14} color="var(--gold-primary)" />
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--gold-primary)", letterSpacing: "0.05em" }}>SIGN IN</span>
                            </StarBorder>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
}
