"use client";

import type { PipelineNode } from "../types";
import { Cancel01Icon } from "hugeicons-react";

interface PipelineVisualizerProps {
    nodes: PipelineNode[];
    isOpen: boolean;
    onClose: () => void;
}

const NODE_LABELS: Record<string, string> = {
    researcher_node: "Researcher",
    location_scout_node: "Location",
    casting_director_node: "Casting",
    sound_designer_node: "Sound",
    screenwriter_node: "Writer",
    script_doctor_node: "Doctor",
    pruner_node: "Pruner",
    director_node: "Director",
};

const NODE_ORDER = [
    "researcher_node", "location_scout_node", "casting_director_node",
    "sound_designer_node", "screenwriter_node", "script_doctor_node",
    "pruner_node", "director_node"
];

export default function PipelineVisualizer({ nodes, isOpen, onClose }: PipelineVisualizerProps) {
    if (!isOpen) return null;

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

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
            onClick={onClose}
        >
            {/* Modal Content */}
            <div
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-gold)",
                    borderRadius: "var(--radius-xl)",
                    padding: "32px",
                    maxWidth: "900px",
                    width: "100%",
                    boxShadow: "0 0 60px rgba(201,168,76,0.15)",
                }}
                className="animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h2
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                        }}
                    >
                        Active Agent Flow
                    </h2>
                    <button
                        className="btn-ghost"
                        onClick={onClose}
                        style={{ padding: "8px", border: "none" }}
                    >
                        <Cancel01Icon size={20} />
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0", overflowX: "auto", paddingBottom: "16px" }}>
                    {NODE_ORDER.map((nodeId, i) => {
                        const node = nodeMap[nodeId];
                        const status = node?.status ?? "idle";
                        const isLast = i === NODE_ORDER.length - 1;

                        const nodeColor = status === "complete" ? "var(--color-complete)"
                            : status === "running" ? "var(--gold-primary)"
                                : status === "error" ? "var(--color-error)"
                                    : "var(--color-idle)";

                        const edgeColor = status === "complete" ? "var(--color-complete)" : "var(--border-subtle)";

                        return (
                            <div key={nodeId} style={{ display: "flex", alignItems: "center" }}>
                                {/* Node */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "6px",
                                        minWidth: "64px",
                                    }}
                                >
                                    {/* Circle */}
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            border: `2px solid ${nodeColor}`,
                                            background: status === "running" ? `${nodeColor}18` : "var(--bg-elevated)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "14px",
                                            transition: "border-color var(--transition-base), background var(--transition-base)",
                                            boxShadow: status === "running" ? `0 0 12px ${nodeColor}50` : "none",
                                            animation: status === "running" ? "pulse-gold 1.5s ease-in-out infinite" : "none",
                                        }}
                                    >
                                        {status === "complete" ? "✓"
                                            : status === "running" ? "◉"
                                                : status === "error" ? "✗"
                                                    : `${i + 1}`}
                                    </div>

                                    {/* Label */}
                                    <span
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "9px",
                                            color: status === "idle" ? "var(--text-muted)" : nodeColor,
                                            textAlign: "center",
                                            letterSpacing: "0.05em",
                                            textTransform: "uppercase",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {NODE_LABELS[nodeId]}
                                    </span>

                                    {/* Duration badge */}
                                    {node?.duration_ms && node.duration_ms > 0 && (
                                        <span
                                            style={{
                                                fontFamily: "var(--font-mono)",
                                                fontSize: "8px",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {(node.duration_ms / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                </div>

                                {/* Edge connector */}
                                {!isLast && (
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "2px",
                                            background: edgeColor,
                                            flexShrink: 0,
                                            position: "relative",
                                            overflow: "visible",
                                            transition: "background var(--transition-slow)",
                                        }}
                                    >
                                        {/* Golden packet that travels when node completes */}
                                        {status === "complete" && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "-3px",
                                                    width: "8px",
                                                    height: "8px",
                                                    borderRadius: "50%",
                                                    background: "var(--gold-primary)",
                                                    boxShadow: "0 0 8px var(--gold-glow)",
                                                    animation: "packet-slide 0.8s ease-out forwards",
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <style>{`
        @keyframes packet-slide {
          from { left: 0; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          to   { left: 100%; opacity: 0; }
        }
      `}</style>
            </div>
        </div>
    );
}
