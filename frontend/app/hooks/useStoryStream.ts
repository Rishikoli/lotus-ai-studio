/**
 * useStoryStream.ts — SSE stream parser for Lotus AI Studio
 *
 * Uses fetch() + ReadableStream, NOT EventSource.
 * EventSource only supports GET — our API requires POST with a body.
 * All SSE events come as `data: {json}\n\n` lines (server enforces this).
 */
"use client";

import { useState, useCallback, useRef } from "react";
import type {
    SSEChunk, StoryPanel, PipelineNode, MetaChunk, StudioUIState,
} from "../types";
import { PIPELINE_NODES } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "lotus-demo-key";

function makeInitialPipelineNodes(): PipelineNode[] {
    return PIPELINE_NODES.map(n => ({ ...n, status: "idle" }));
}

export function useStoryStream() {
    const [state, setState] = useState<StudioUIState>({
        phase: "idle",
        session_id: null,
        panels: [],
        branch_panels: [],
        branch_id: null,
        pipeline_nodes: makeInitialPipelineNodes(),
        script_draft: "",
        branch_script_draft: "",
        meta_log: [],
        error: null,
    });

    const abortRef = useRef<AbortController | null>(null);

    // ─── Core SSE parser ───────────────────────────────────────────────────────
    const parseStream = useCallback(async (
        response: Response,
        isBranch: boolean = false
    ) => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE spec: events separated by double newline
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";   // keep incomplete last part

            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data: ")) continue;

                try {
                    const chunk: SSEChunk = JSON.parse(line.slice(6));
                    dispatch(chunk, isBranch);
                } catch {
                    console.warn("[useStoryStream] Failed to parse chunk:", line);
                }
            }
        }
    }, []);

    // ─── Chunk dispatcher ──────────────────────────────────────────────────────
    const dispatch = useCallback((chunk: SSEChunk, isBranch: boolean) => {
        setState(prev => applyChunk(prev, chunk, isBranch));
    }, []);

    // ─── Generate ──────────────────────────────────────────────────────────────
    const generate = useCallback(async (
        prompt: string,
        template: string = "default",
        sketchB64?: string,
    ) => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setState(prev => ({
            ...prev,
            phase: "generating",
            panels: [],
            branch_panels: [],
            branch_id: null,
            pipeline_nodes: makeInitialPipelineNodes(),
            script_draft: "",
            branch_script_draft: "",
            meta_log: [],
            error: null,
        }));

        try {
            const res = await fetch(`${API_URL}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                },
                body: JSON.stringify({ prompt, pipeline_template: template, user_sketch_b64: sketchB64 }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(err.detail ?? "Backend error");
            }

            // Read X-Session-Id from response headers
            const sessionId = res.headers.get("X-Session-Id");
            if (sessionId) {
                setState(prev => ({ ...prev, session_id: sessionId }));
            }

            await parseStream(res, false);

        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return;
            setState(prev => ({ ...prev, phase: "error", error: String(err) }));
        }
    }, [parseStream]);

    // ─── HITL Resume ──────────────────────────────────────────────────────────
    const resume = useCallback(async (
        session_id: string,
        action: "approve" | "edit" | "reject",
        userEdits?: string,
    ) => {
        if (action === "reject") {
            setState(prev => ({ ...prev, phase: "idle" }));
            return;
        }

        setState(prev => ({ ...prev, phase: "generating" }));

        const res = await fetch(`${API_URL}/api/resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify({ session_id, action, user_edits: userEdits }),
        });

        await parseStream(res, false);
    }, [parseStream]);

    // ─── Branch ───────────────────────────────────────────────────────────────
    const createBranch = useCallback(async (
        session_id: string,
        branch_point_panel_id: string,
        branch_direction: string,
    ) => {
        const res = await fetch(`${API_URL}/api/branch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify({ session_id, branch_point_panel_id, branch_direction }),
        });

        const branchId = res.headers.get("X-Branch-Id");
        if (branchId) {
            setState(prev => ({ ...prev, branch_id: branchId }));
        }

        await parseStream(res, true);   // isBranch=true → updates branch_panels
    }, [parseStream]);

    // ─── Director's Cut ───────────────────────────────────────────────────────
    const directorCut = useCallback(async (
        session_id: string,
        feedback: string,
        panelIds?: string[],
    ) => {
        const res = await fetch(`${API_URL}/api/director_cut`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify({ session_id, feedback, panel_ids: panelIds }),
        });

        await parseStream(res, false);
    }, [parseStream]);

    const stop = useCallback(() => {
        abortRef.current?.abort();
        setState(prev => ({ ...prev, phase: "idle" }));
    }, []);

    return { state, generate, resume, createBranch, directorCut, stop };
}

// ─── State Reducer ─────────────────────────────────────────────────────────
function applyChunk(prev: StudioUIState, chunk: SSEChunk, isBranch: boolean): StudioUIState {
    switch (chunk.type) {

        case "meta": {
            const meta = chunk as MetaChunk;
            const nodes = prev.pipeline_nodes.map(n =>
                n.id === meta.node
                    ? { ...n, status: meta.status as any, duration_ms: meta.duration_ms }
                    : n
            );
            return {
                ...prev,
                pipeline_nodes: nodes,
                meta_log: [...prev.meta_log, meta],
            };
        }

        case "hitl_pause": {
            return {
                ...prev,
                phase: "hitl_pause",
                script_draft: chunk.script_draft,
                session_id: chunk.session_id,
            };
        }

        case "panel_schema": {
            if (isBranch) {
                const branchPanels: StoryPanel[] = chunk.panels.map(p => ({
                    ...p, narration: undefined, image_url: undefined,
                    is_loading: true, is_complete: false, branch_id: prev.branch_id ?? undefined,
                }));
                return { ...prev, branch_panels: branchPanels };
            }
            const panels: StoryPanel[] = chunk.panels.map(p => ({
                ...p, narration: undefined, image_url: undefined,
                is_loading: true, is_complete: false,
            }));
            return { ...prev, panels, session_id: chunk.session_id };
        }

        case "panel_text": {
            const target = isBranch ? "branch_panels" : "panels";
            return {
                ...prev,
                [target]: prev[target].map(p =>
                    p.id === chunk.panel_id ? { ...p, narration: chunk.content } : p
                ),
            };
        }

        case "panel_image": {
            const target = isBranch ? "branch_panels" : "panels";
            return {
                ...prev,
                [target]: prev[target].map(p =>
                    p.id === chunk.panel_id
                        ? { ...p, image_url: chunk.image_url, emotion: chunk.emotion, physics: chunk.physics, layout: chunk.layout }
                        : p
                ),
            };
        }

        case "panel_done": {
            const target = isBranch ? "branch_panels" : "panels";
            return {
                ...prev,
                [target]: prev[target].map(p =>
                    p.id === chunk.panel_id ? { ...p, is_loading: false, is_complete: true } : p
                ),
            };
        }

        case "done": {
            return { ...prev, phase: "complete" };
        }

        case "error": {
            // Non-fatal: log to meta, don't kill phase
            const errorMeta: MetaChunk = {
                type: "meta", node: chunk.node, status: "error",
                duration_ms: 0, content: chunk.content,
            };
            return { ...prev, meta_log: [...prev.meta_log, errorMeta] };
        }

        case "script": {
            const target = isBranch ? "branch_script_draft" : "script_draft";
            return {
                ...prev,
                [target]: chunk.content,
            };
        }

        default:
            return prev;
    }
}
