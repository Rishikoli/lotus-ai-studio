"use client";

import type { PipelineNode } from "../types";

interface PipelineVisualizerProps {
    nodes: PipelineNode[];
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

export default function PipelineVisualizer({ nodes }: PipelineVisualizerProps) {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    return (
        <div
            style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
            }}
        >
            <p
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: "16px",
                }}
            >
                Live Pipeline
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "0", overflowX: "auto", paddingBottom: "4px" }}>
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
    );
}
