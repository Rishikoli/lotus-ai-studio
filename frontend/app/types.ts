/**
 * types.ts — Shared TypeScript types for Lotus AI Studio frontend
 */

export type SSEChunkType =
    | "meta"
    | "audio_vibe"
    | "script"
    | "hitl_pause"
    | "panel_schema"
    | "panel_text"
    | "panel_image"
    | "panel_audio"
    | "panel_video"
    | "panel_done"
    | "ambient_music"
    | "multimodal_interleaved"
    | "character_profiles"
    | "done"
    | "error";

export interface MetaChunk {
    type: "meta";
    node: string;           // LangGraph node name (e.g. "researcher_node")
    status: "running" | "complete" | "error";
    duration_ms: number;
    content: string;
    branch_id?: string;
}

export interface AudioVibeChunk {
    type: "audio_vibe";
    vibe: string;
}

export interface ScriptChunk {
    type: "script";
    content: string;
    node: string;
    branch_id?: string;
}

export interface HitlPauseChunk {
    type: "hitl_pause";
    session_id: string;
    script_draft: string;
    script_score: number;
}

export interface PanelSchemaChunk {
    type: "panel_schema";
    panels: PanelObject[];
    session_id: string;
}

export interface PanelTextChunk {
    type: "panel_text";
    panel_id: string;
    content: string;
    branch_id?: string;
}

export interface PanelImageChunk {
    type: "panel_image";
    panel_id: string;
    image_url: string;
    physics: string;
    emotion: string;
    layout: PanelLayout;
    sfx_cue: string;
    branch_id?: string;
}

export interface PanelAudioChunk {
    type: "panel_audio";
    panel_id: string;
    audio_url: string;
    branch_id?: string;
}

export interface PanelVideoChunk {
    type: "panel_video";
    panel_id: string;
    video_url: string;
    branch_id?: string;
}

export interface MultimodalInterleavedChunk {
    type: "multimodal_interleaved";
    panel_id: string;
    parts: {
        text?: string;
        image_url?: string;
        video_url?: string;
        audio_url?: string;
        sfx_url?: string;
    }[];
}


export interface PanelDoneChunk {
    type: "panel_done";
    panel_id: string;
    branch_id?: string;
}

export interface CharacterProfilesChunk {
    type: "character_profiles";
    profiles: Record<string, any>;
}

export interface DoneChunk {
    type: "done";
    session_id: string;
    branch_id?: string;
}

export interface ErrorChunk {
    type: "error";
    node: string;
    content: string;
}

export interface AmbientMusicChunk {
    type: "ambient_music";
    stems: Record<string, string>; // { "ambient": url, "rhythm": url, "melody": url }
    leitmotifs?: Record<string, string>; // { "character_name": url }
}

export type SSEChunk =
    | MetaChunk
    | AudioVibeChunk
    | ScriptChunk
    | HitlPauseChunk
    | PanelSchemaChunk
    | PanelTextChunk
    | PanelImageChunk
    | PanelAudioChunk
    | PanelVideoChunk
    | PanelDoneChunk
    | AmbientMusicChunk
    | MultimodalInterleavedChunk
    | CharacterProfilesChunk
    | DoneChunk
    | ErrorChunk;

// ─── Panel System ──────────────────────────────────────────────────────────────

export type PanelLayout =
    | "full-width"
    | "portrait-left"
    | "portrait-right"
    | "split-2col"
    | "cinematic-wide";

export type PanelEmotion =
    | "calm" | "curious" | "tense" | "dread"
    | "peak_fear" | "revelation" | "hopeful"
    | "resolved" | "comedic" | "absurd";

export interface PanelObject {
    id: string;              // "p1", "p2", etc.
    layout: PanelLayout;
    emotion: PanelEmotion;
    physics: string;         // "rain:heavy", "lightning:strobe", ""
    aspect_ratio?: string;   // "16:9", "2.39:1", "1:1"
    sfx_cue?: string;        // "explosion", "thunder", etc.
}

export interface StoryPanel extends PanelObject {
    narration?: string;      // streaming text
    image_url?: string;      // CDN URL from Cloud Storage
    video_url?: string;      // Hero Video URL
    audio_url?: string;
    is_loading: boolean;
    is_complete: boolean;
    branch_id?: string;      // set if this panel is from a branch
}

// ─── Pipeline Visualizer ──────────────────────────────────────────────────────

export type NodeStatus = "idle" | "running" | "complete" | "error";

export interface PipelineNode {
    id: string;
    label: string;
    status: NodeStatus;
    duration_ms?: number;
    position: { x: number; y: number };
}

export const PIPELINE_NODES: Omit<PipelineNode, "status">[] = [
    { id: "historian_node", label: "Historian", position: { x: 0, y: 0 } },
    { id: "researcher_node", label: "Researcher", position: { x: 1, y: 0 } },
    { id: "location_scout_node", label: "Location Scout", position: { x: 2, y: 0 } },
    { id: "casting_director_node", label: "Casting Director", position: { x: 3, y: 0 } },
    { id: "sound_designer_node", label: "Sound Designer", position: { x: 4, y: 0 } },
    { id: "screenwriter_node", label: "Screenwriter", position: { x: 5, y: 0 } },
    { id: "script_doctor_node", label: "Script Doctor", position: { x: 6, y: 0 } },
    { id: "pruner_node", label: "Pruner", position: { x: 7, y: 0 } },
    { id: "director_node", label: "Director", position: { x: 8, y: 0 } },
    { id: "archivist_node", label: "Archivist", position: { x: 9, y: 0 } },
];

// ─── Pipeline Templates ────────────────────────────────────────────────────────

export type PipelineTemplate = "default" | "noir" | "epic_fantasy" | "comedy" | "horror";

export const TEMPLATE_META: Record<PipelineTemplate, { label: string; iconId: string; description: string; color: string }> = {
    default: { label: "Default", iconId: "film", description: "Cinematic drama", color: "#C9A84C" },
    noir: { label: "Noir", iconId: "moody", description: "Rain-soaked cynicism", color: "#8899AA" },
    epic_fantasy: { label: "Epic Fantasy", iconId: "magic", description: "Mythic world-shaking", color: "#D4A843" },
    comedy: { label: "Comedy", iconId: "laugh", description: "Absurdist tension→chaos", color: "#7DB87A" },
    horror: { label: "Horror", iconId: "horror", description: "Slow-burn dread", color: "#AA4455" },
};

// ─── Story Commit (Firestore document) ────────────────────────────────────────

export interface StoryCommit {
    id: string;              // Firestore document ID = session_id
    prompt: string;
    pipeline_template: PipelineTemplate;
    script_draft: string;
    panel_plan: PanelObject[];
    panels: StoryPanel[];
    parent_id: string | null;
    branch_ids: string[];
    tags: string[];
    status: "draft" | "complete";
    created_at: Date;
}

// ─── Studio State (frontend) ─────────────────────────────────────────────────

export interface StudioUIState {
    phase: "idle" | "generating" | "hitl_pause" | "complete" | "error";
    session_id: string | null;
    panels: StoryPanel[];
    branch_panels: StoryPanel[];    // alternate universe panels
    branch_id: string | null;
    pipeline_nodes: PipelineNode[];
    audio_vibe: string | null;
    audio_stems: Record<string, string> | null;
    leitmotifs: Record<string, string>;
    ambient_audio_url: string | null;
    script_draft: string;
    branch_script_draft: string;    // alternate version for diffing
    meta_log: MetaChunk[];
    character_profiles: Record<string, any>;
    error: string | null;
}

// ─── Agentic Audience ────────────────────────────────────────────────────────

export interface InterrogationMessage {
    role: "user" | "character";
    content: string;
    timestamp: number;
}
