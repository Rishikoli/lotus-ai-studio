"use client";

import { useState } from "react";
import { CheckmarkCircle01Icon, Cancel01Icon, Edit01Icon } from "hugeicons-react";

interface ScriptApprovalModalProps {
    sessionId: string;
    scriptDraft: string;
    onApprove: (sessionId: string, action: "approve" | "edit", edits?: string) => void;
    onReject: (sessionId: string) => void;
}

export default function ScriptApprovalModal({
    sessionId,
    scriptDraft,
    onApprove,
    onReject,
}: ScriptApprovalModalProps) {
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [editedScript, setEditedScript] = useState(scriptDraft);

    const handleApprove = () => {
        if (mode === "edit" && editedScript !== scriptDraft) {
            onApprove(sessionId, "edit", editedScript);
        } else {
            onApprove(sessionId, "approve");
        }
    };

    return (
        /* Backdrop */
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                backdropFilter: "blur(8px)",
                zIndex: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
            }}
            className="animate-fade-in"
        >
            {/* Modal */}
            <div
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-gold)",
                    borderRadius: "var(--radius-xl)",
                    width: "100%",
                    maxWidth: "780px",
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxShadow: "0 0 60px rgba(201,168,76,0.15)",
                }}
                className="animate-scale-in"
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "20px 24px",
                        borderBottom: "1px solid var(--border-subtle)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="icon-base icon-active">
                            <Edit01Icon size={18} />
                        </div>
                        <div>
                            <h2
                                style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                }}
                            >
                                Script Review
                            </h2>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                Human-in-the-loop approval — review before Director generates panels
                            </p>
                        </div>
                    </div>

                    {/* Edit toggle */}
                    <button
                        className="btn-ghost"
                        onClick={() => setMode(mode === "view" ? "edit" : "view")}
                        style={{ fontSize: "12px" }}
                    >
                        <div className={`icon-base ${mode === "edit" ? "icon-active" : "icon-idle"}`}>
                            <Edit01Icon size={14} />
                        </div>
                        {mode === "edit" ? "Viewing" : "Edit Script"}
                    </button>
                </div>

                {/* Script content */}
                <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                    {mode === "view" ? (
                        <pre
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                lineHeight: 1.8,
                                color: "var(--text-secondary)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {scriptDraft}
                        </pre>
                    ) : (
                        <textarea
                            value={editedScript}
                            onChange={e => setEditedScript(e.target.value)}
                            className="input-gold"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                lineHeight: 1.8,
                                minHeight: "400px",
                                resize: "vertical",
                            }}
                        />
                    )}
                </div>

                {/* Actions */}
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end",
                        padding: "16px 24px",
                        borderTop: "1px solid var(--border-subtle)",
                    }}
                >
                    <button
                        className="btn-ghost"
                        onClick={() => onReject(sessionId)}
                        style={{ color: "var(--color-error)", borderColor: "rgba(224,82,82,0.3)" }}
                    >
                        <Cancel01Icon size={14} />
                        Reject &amp; Discard
                    </button>

                    <button className="btn-gold" onClick={handleApprove}>
                        <CheckmarkCircle01Icon size={14} />
                        {mode === "edit" ? "Approve Edits → Generate" : "Approve → Generate Panels"}
                    </button>
                </div>
            </div>
        </div>
    );
}
