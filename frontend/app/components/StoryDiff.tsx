"use client";

import React from "react";
import { motion } from "motion/react";
import { FileEditIcon, MoveRightIcon } from "hugeicons-react";

interface StoryDiffProps {
    mainScript: string;
    branchScript: string;
    branchPointLabel?: string;
}

export default function StoryDiff({ mainScript, branchScript, branchPointLabel }: StoryDiffProps) {
    const mainLines = mainScript.split("\n");
    const branchLines = branchScript.split("\n");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--gold-dim)" }}>
                <FileEditIcon size={18} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Script Evolution: Main Universe vs Branch
                </span>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px",
                background: "var(--border-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden"
            }}>
                {/* Column Headers */}
                <div style={{ background: "rgba(0,0,0,0.4)", padding: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Main Timeline</span>
                </div>
                <div style={{ background: "rgba(107,203,119,0.05)", padding: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "10px", color: "#6BCB77", textTransform: "uppercase" }}>Alternate Universe</span>
                </div>

                {/* Diff Engine (Simplified Line-by-Line) */}
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column" }}>
                    {branchLines.map((line, i) => {
                        const originalLine = mainLines[i] || "";
                        const isChanged = line !== originalLine;

                        return (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
                                <div style={{
                                    padding: "4px 12px",
                                    background: isChanged ? "rgba(224,82,82,0.05)" : "transparent",
                                    color: isChanged ? "rgba(255,255,255,0.4)" : "var(--text-secondary)",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "13px",
                                    lineHeight: "1.5",
                                    borderRight: "1px solid var(--border-subtle)"
                                }}>
                                    {originalLine || " "}
                                </div>
                                <div style={{
                                    padding: "4px 12px",
                                    background: isChanged ? "rgba(107,203,119,0.1)" : "transparent",
                                    color: isChanged ? "#6BCB77" : "var(--text-secondary)",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "13px",
                                    lineHeight: "1.5",
                                    position: "relative"
                                }}>
                                    {line || " "}
                                    {isChanged && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: "#6BCB77" }} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
