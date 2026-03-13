"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "./components/Navbar";
import TemplatePicker from "./components/TemplatePicker";
import PipelineVisualizer from "./components/PipelineVisualizer";
import ScriptApprovalModal from "./components/ScriptApprovalModal";
import StoryPanel from "./components/StoryPanel";
import MoodCore from "./components/MoodCore";
import EtchedHUD from "./components/EtchedHUD";
import MetaSidebar from "./components/MetaSidebar";
import DirectorsCutBar from "./components/DirectorsCutBar";
import StoryDiff from "./components/StoryDiff";
import InterrogationTerminal from "./components/InterrogationTerminal";
import DirectorHotline from "./components/DirectorHotline";
import { useStoryStream } from "./hooks/useStoryStream";
import type { PipelineTemplate } from "./types";
import { PlayIcon, StopIcon, Message01Icon, AiBrain01Icon, Alert01Icon, GitBranchIcon, UserIcon, Tick01Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import StarBorder from "./components/StarBorder";

export default function Home() {
    const { state, generate, resume, createBranch, directorCut, applyNegotiation, stop, interrupt, setAudioVibe } = useStoryStream();
    const [prompt, setPrompt] = useState("");
    const [template, setTemplate] = useState<PipelineTemplate>("default");
    const [showPipeline, setShowPipeline] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [viewMode, setViewMode] = useState<"panels" | "script">("panels");
    const [interrogatingCharacter, setInterrogatingCharacter] = useState<string | null>(null);
    const filmstripRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Auto-scroll to latest panel
    useEffect(() => {
        if (filmstripRef.current && state.panels.length > 0) {
            const panels = filmstripRef.current.children;
            const lastPanel = panels[panels.length - 1] as HTMLElement;
            if (lastPanel) {
                lastPanel.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
        }
    }, [state.panels.length]);

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        generate(prompt, template);
    };

    useEffect(() => {
        const handleReshoot = (e: any) => {
            if (state.session_id) {
                directorCut(state.session_id, "Please regenerate a high quality image for this panel. Imagen 3 failed earlier.", [e.detail.panelId]);
            }
        };
        window.addEventListener("reshoot_panel", handleReshoot);
        return () => window.removeEventListener("reshoot_panel", handleReshoot);
    }, [state.session_id, directorCut]);

    const handleApplyNegotiation = async (outcome: string, influence: string) => {
        if (!state.session_id || !interrogatingCharacter) return;
        await applyNegotiation(state.session_id, interrogatingCharacter, outcome, influence);
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

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <button
                                        className="btn-ghost"
                                        onClick={() => router.push("/gallery")}
                                        style={{ padding: "12px 20px", fontSize: "14px" }}
                                    >
                                        <GitBranchIcon size={16} />
                                        Story Commits
                                    </button>

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
                    </StarBorder>
                </div>
            )}

            {/* Studio Output Section */}
            {!isIdle && (
                <>
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
                            disabled={state.phase === "complete"}
                            style={{ 
                                marginLeft: "24px", 
                                color: state.phase === "complete" ? "var(--color-success)" : "var(--color-error)", 
                                borderColor: state.phase === "complete" ? "rgba(107,203,119,0.3)" : "rgba(224,82,82,0.3)", 
                                height: "fit-content" 
                            }}
                        >
                            {state.phase === "complete" ? <Tick01Icon size={14} /> : <StopIcon size={14} />}
                            {state.phase === "complete" ? "Production Successful" : "Halt Production"}
                        </button>
                    </div>

                    {/* Cast Explorer: Interaction Hub */}
                    {Object.keys(state.character_profiles).length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                marginBottom: "32px",
                                maxWidth: "1200px",
                                margin: "0 auto 32px auto",
                                width: "100%",
                                overflowX: "auto",
                                padding: "8px 4px"
                            }}
                            className="animate-fade-in"
                        >
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginRight: "12px",
                                borderRight: "1px solid var(--border-subtle)",
                                paddingRight: "16px"
                            }}>
                                <AiBrain01Icon size={16} className="text-gold-dim" />
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.2em", color: "var(--silver-dim)" }}>CAST</span>
                            </div>
                            {Object.keys(state.character_profiles).map(charName => (
                                <motion.button
                                    key={charName}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setInterrogatingCharacter(charName)}
                                    className="glass-panel"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 16px",
                                        borderRadius: "var(--radius-pill)",
                                        border: "1px solid var(--gold-dim)",
                                        background: "rgba(201, 168, 76, 0.05)",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    <UserIcon size={14} className="text-gold" />
                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--gold-bright)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        {charName}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div style={{ maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
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
                                    {/* Panel List: Vertical Cinematic Stack */}
                                    <div
                                        ref={filmstripRef}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "80px", // Increased gap for vertical impact
                                            padding: "40px 0 120px 0",
                                            scrollBehavior: "smooth",
                                        }}
                                        className="vertical-reel"
                                    >
                                        {state.panels.map((panel, idx) => (
                                            <div key={panel.id} style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                {/* Vertical Connector Line */}
                                                {idx > 0 && (
                                                    <div style={{
                                                        position: "absolute",
                                                        top: "-60px",
                                                        width: "1px",
                                                        height: "40px",
                                                        background: "linear-gradient(to bottom, transparent, var(--gold-primary), transparent)",
                                                        opacity: 0.4
                                                    }} />
                                                )}
                                                <StoryPanel
                                                    panel={panel}
                                                    audioVibe={state.audio_vibe}
                                                    sessionId={state.session_id}
                                                    onBranch={(panelId, dir) => createBranch(state.session_id!, panelId, dir)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Branch Timeline (only if exists) */}
                                {state.branch_id && state.branch_panels.length > 0 && (
                                    <div
                                        style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", marginTop: "40px" }}
                                        className="animate-fade-in"
                                    >
                                        <div style={{ padding: "12px 16px", background: "rgba(107,203,119,0.1)", border: "1px solid rgba(107,203,119,0.3)", borderRadius: "var(--radius-md)", color: "#6BCB77", fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.1em" }}>
                                            ⎇ ALTERNATE TIMELINE: {state.branch_id.slice(0, 8)}
                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "24px",
                                                overflowX: "auto",
                                                paddingBottom: "40px",
                                                scrollBehavior: "smooth",
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
                            panels={state.panels}
                            vibe={state.audio_vibe}
                            onReshoot={(panelIds, feedback) => directorCut(state.session_id!, feedback, panelIds)}
                        />
                    )}

                    {/* Agentic Audience: Interrogation Terminal */}
                    <AnimatePresence>
                        {interrogatingCharacter && state.session_id && (
                            <InterrogationTerminal
                                sessionId={state.session_id}
                                characterName={interrogatingCharacter}
                                onClose={() => setInterrogatingCharacter(null)}
                                onApplyNegotiation={handleApplyNegotiation}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <EtchedHUD vibe={state.audio_vibe} />
                <MoodCore
                    vibe={state.audio_vibe}
                    stems={state.audio_stems}
                    leitmotifs={state.leitmotifs}
                    currentEmotion={state.panels[state.panels.length - 1]?.emotion}
                    isGenerating={isGenerating}
                    onVibeChange={setAudioVibe}
                />

                <DirectorHotline
                    sessionId={state.session_id}
                    isGenerating={state.phase === "generating"}
                    onInterrupt={(fb) => interrupt(state.session_id!, fb)}
                />
                </>
            )}
        </main>
    );
}
