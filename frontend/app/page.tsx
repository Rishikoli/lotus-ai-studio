"use client";

import { useState } from "react";
import Navbar from "./components/Navbar";
import TemplatePicker from "./components/TemplatePicker";
import PipelineVisualizer from "./components/PipelineVisualizer";
import ScriptApprovalModal from "./components/ScriptApprovalModal";
import StoryPanel from "./components/StoryPanel";
import MetaSidebar from "./components/MetaSidebar";
import DirectorsCutBar from "./components/DirectorsCutBar";
import StoryDiff from "./components/StoryDiff";
import { useStoryStream } from "./hooks/useStoryStream";
import type { PipelineTemplate } from "./types";
import { PlayIcon, StopIcon, Message01Icon, AiBrain01Icon, Alert01Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import StarBorder from "./components/StarBorder";

export default function Home() {
    const { state, generate, resume, createBranch, directorCut, stop } = useStoryStream();
    const [prompt, setPrompt] = useState("");
    const [template, setTemplate] = useState<PipelineTemplate>("default");
    const [showPipeline, setShowPipeline] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [viewMode, setViewMode] = useState<"panels" | "script">("panels");
    const router = useRouter();

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
                paddingTop: "70px", // Navbar height
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Navbar
                sessionId={state.session_id}
                onGalleryClick={() => router.push("/gallery")}
            />

            <AnimatePresence>
                {showLogs && (
                    <MetaSidebar logs={state.meta_log} isOpen={showLogs} />
                )}
            </AnimatePresence>

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
                            fontSize: "18px",
                            color: "var(--silver)",
                            marginBottom: "40px",
                            maxWidth: "600px",
                            lineHeight: 1.6,
                            fontWeight: 400,
                        }}
                    >
                        Describe a scene, a conflict, or a mood. An 8-agent AI crew will scout locations, cast actors, write the script, and shoot the panels.
                    </p>

                    <StarBorder
                        as="div"
                        color="var(--gold-primary)"
                        speed="4s"
                        thickness={2}
                        className="animate-fade-up"
                        innerClassName="w-full"
                        style={{
                            width: "100%",
                            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                padding: "24px",
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
                                style={{ minHeight: "140px", fontSize: "17px", fontWeight: 400 }}
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
                    </StarBorder>
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
                                <div className="icon-base icon-active" style={{ fontSize: "16px" }}><AiBrain01Icon size={16} /></div> View Agent Flow
                            </button>

                            <button
                                className={`btn-ghost ${showLogs ? 'border-gold text-gold' : ''}`}
                                onClick={() => setShowLogs(!showLogs)}
                                style={{ padding: "8px 16px", fontSize: "13px" }}
                            >
                                <Message01Icon size={14} className={showLogs ? 'text-gold' : ''} />
                                {showLogs ? "Hide Logs" : "Agent Logs"}
                            </button>

                            {state.branch_id && (
                                <div style={{ marginLeft: "12px", border: "1px solid var(--border-gold)", borderRadius: "var(--radius-pill)", padding: "2px", display: "flex", gap: "2px", background: "rgba(0,0,0,0.3)" }}>
                                    <button
                                        onClick={() => setViewMode("panels")}
                                        style={{
                                            padding: "6px 14px",
                                            fontSize: "11px",
                                            borderRadius: "var(--radius-pill)",
                                            background: viewMode === "panels" ? "var(--gold-dim)" : "transparent",
                                            color: viewMode === "panels" ? "black" : "var(--gold-dim)",
                                            border: "none",
                                            cursor: "pointer",
                                            fontFamily: "var(--font-mono)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        BOARDS
                                    </button>
                                    <button
                                        onClick={() => setViewMode("script")}
                                        style={{
                                            padding: "6px 14px",
                                            fontSize: "11px",
                                            borderRadius: "var(--radius-pill)",
                                            background: viewMode === "script" ? "var(--gold-dim)" : "transparent",
                                            color: viewMode === "script" ? "black" : "var(--gold-dim)",
                                            border: "none",
                                            cursor: "pointer",
                                            fontFamily: "var(--font-mono)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        DIFF
                                    </button>
                                </div>
                            )}

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
                    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
                        {viewMode === "script" && state.branch_script_draft ? (
                            <div className="animate-fade-up">
                                <StoryDiff
                                    mainScript={state.script_draft}
                                    branchScript={state.branch_script_draft}
                                />
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: "40px" }}>
                                {/* Left: Main Story Timeline */}
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
                                    {/* Error boundary */}
                                    {state.error && (
                                        <div style={{
                                            padding: "16px",
                                            background: "rgba(224,82,82,0.1)",
                                            border: "1px solid var(--color-error)",
                                            borderRadius: "var(--radius-md)",
                                            color: "var(--color-error)",
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "13px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}>
                                            <Alert01Icon size={16} /> {state.error}
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

                    {/* Director's Cut Bar */}
                    {state.phase === "complete" && state.session_id && (
                        <DirectorsCutBar
                            sessionId={state.session_id}
                            panels={state.panels.map(p => ({ id: p.id, narration: p.narration }))}
                            onReshoot={(panelIds, feedback) => directorCut(state.session_id!, feedback, panelIds)}
                        />
                    )}

                </div>
            )}
        </main>
    );
}
