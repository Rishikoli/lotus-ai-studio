"use client";

import { useState } from "react";
import Navbar from "./components/Navbar";
import TemplatePicker from "./components/TemplatePicker";
import PipelineVisualizer from "./components/PipelineVisualizer";
import ScriptApprovalModal from "./components/ScriptApprovalModal";
import StoryPanel from "./components/StoryPanel";
import { useStoryStream } from "./hooks/useStoryStream";
import type { PipelineTemplate } from "./types";
import { PlayIcon, StopIcon } from "hugeicons-react";

export default function Home() {
    const { state, generate, resume, createBranch, stop } = useStoryStream();
    const [prompt, setPrompt] = useState("");
    const [template, setTemplate] = useState<PipelineTemplate>("default");
    const [showPipeline, setShowPipeline] = useState(false);

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        generate(prompt, template);
    };

    const isIdle = state.phase === "idle";
    const isGenerating = state.phase === "generating" || state.phase === "hitl_pause";

    return (
        <main
            style={{
                minHeight: "100vh",
                paddingTop: "56px", // Navbar height
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Navbar sessionId={state.session_id} onGalleryClick={() => { }} />

            {/* Hero / Input Section */}
            {isIdle && (
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px 24px",
                        maxWidth: "800px",
                        margin: "0 auto",
                        width: "100%",
                        textAlign: "center",
                    }}
                    className="animate-fade-up"
                >
                    <h1
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "48px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            marginBottom: "16px",
                            letterSpacing: "0.02em",
                        }}
                    >
                        Direct your next <span className="glow-text text-gold">Masterpiece</span>
                    </h1>
                    <p
                        style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "16px",
                            color: "var(--silver-dim)",
                            marginBottom: "40px",
                            maxWidth: "500px",
                            lineHeight: 1.6,
                        }}
                    >
                        Describe a scene, a conflict, or a mood. An 8-agent AI crew will scout locations, cast actors, write the script, and shoot the panels.
                    </p>

                    <div
                        style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-gold)",
                            borderRadius: "var(--radius-xl)",
                            padding: "24px",
                            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                            textAlign: "left",
                        }}
                    >
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="INT. RAIN-SLICKED APARTMENT — NIGHT&#10;A weary detective reviews holographic evidence..."
                            className="input-gold"
                            style={{ minHeight: "120px", fontSize: "16px" }}
                            disabled={isGenerating}
                        />

                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                            <TemplatePicker selected={template} onChange={setTemplate} />

                            <button
                                className="btn-star-border"
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isGenerating}
                                style={{ padding: "12px 32px", fontSize: "15px", whiteSpace: "nowrap" }}
                            >
                                <div className="icon-base icon-active"><PlayIcon size={16} /></div>
                                Generate Cinematic Story
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Studio Output Section */}
            {!isIdle && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 24px" }} className="animate-fade-in">

                    {/* Header row: Status + Stop */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>

                        <div style={{ flex: 1, display: "flex", gap: "16px", alignItems: "center" }}>
                            <button
                                className="btn-gold"
                                onClick={() => setShowPipeline(true)}
                                style={{ padding: "8px 16px", fontSize: "13px" }}
                            >
                                <span style={{ fontSize: "16px" }}>🧠</span> View Agent Flow
                            </button>

                            {isGenerating && (
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--gold-primary)", letterSpacing: "0.1em", textTransform: "uppercase" }} className="animate-pulse">
                                    Agents are working...
                                </span>
                            )}

                            <PipelineVisualizer
                                nodes={state.pipeline_nodes}
                                isOpen={showPipeline}
                                onClose={() => setShowPipeline(false)}
                            />
                        </div>

                        <button
                            className="btn-ghost"
                            onClick={stop}
                            style={{ marginLeft: "24px", color: "var(--color-error)", borderColor: "rgba(224,82,82,0.3)", height: "fit-content" }}
                        >
                            <StopIcon size={14} />
                            Halt Production
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", gap: "40px" }}>

                        {/* Left: Main Story Timeline */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>

                            {/* Error boundary */}
                            {state.error && (
                                <div style={{ padding: "16px", background: "rgba(224,82,82,0.1)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                                    ⚠️ {state.error}
                                </div>
                            )}

                            {/* Panel Grid */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, 1fr)",
                                    gap: "24px",
                                    alignItems: "start",
                                }}
                            >
                                {state.panels.map(panel => (
                                    <StoryPanel
                                        key={panel.id}
                                        panel={panel}
                                        sessionId={state.session_id}
                                        onBranch={(panelId, dir) => createBranch(state.session_id!, panelId, dir)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Right: Branch Timeline (only if exists) */}
                        {state.branch_id && state.branch_panels.length > 0 && (
                            <div
                                style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}
                                className="animate-fade-in"
                            >
                                <div style={{ padding: "12px 16px", background: "rgba(107,203,119,0.1)", border: "1px solid rgba(107,203,119,0.3)", borderRadius: "var(--radius-md)", color: "#6BCB77", fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.1em" }}>
                                    ⎇ ALTERNATE TIMELINE: {state.branch_id.slice(0, 8)}
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "24px",
                                        alignItems: "start",
                                    }}
                                >
                                    {state.branch_panels.map(panel => (
                                        <StoryPanel
                                            key={panel.id + '_branch'}
                                            panel={panel}
                                            sessionId={state.session_id}
                                            isBranch={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* HITL Modal */}
                    {state.phase === "hitl_pause" && state.session_id && (
                        <ScriptApprovalModal
                            sessionId={state.session_id}
                            scriptDraft={state.script_draft}
                            onApprove={resume}
                            onReject={(sid) => resume(sid, "reject")}
                        />
                    )}

                </div>
            )}
        </main>
    );
}
