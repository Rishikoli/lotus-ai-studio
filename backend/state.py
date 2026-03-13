"""
StudioState — the single megastate object that flows through the LangGraph pipeline.
All fields initialized with safe defaults to prevent KeyError in any node.
"""
from typing import TypedDict, Optional, List, Annotated
import operator


class StudioState(TypedDict):
    # ─── User Inputs ────────────────────────────────────────────────────────────
    user_prompt: str
    user_sketch_b64: Optional[str]       # Base64 JPEG from SketchPad canvas (max 200KB)
    session_id: str                       # UUID — used as LangGraph thread_id + Redis key
    user_id: str                          # Firebase Auth UID
    pipeline_template: str               # "default" | "noir" | "epic_fantasy" | "comedy" | "horror"

    # ─── Loop Guard ─────────────────────────────────────────────────────────────
    max_revisions: int                    # Decremented each Script Doctor loop (default: 3)

    # ─── Node 1: Researcher ──────────────────────────────────────────────────────
    multiverse_lore: List[dict]           # Shared lore from the World Ledger
    negotiation_outcomes: List[dict]      # Interrogation results: {char, outcome, influence}
    world_bible: str                      # Comprehensive lore + world-building document

    # ─── Node 2: Location Scout ──────────────────────────────────────────────────
    location_data: str
    scene_physics: str                    # "Wind: 40mph west. Lightning: strobe @ 2s"

    # ─── Node 3: Casting Director ────────────────────────────────────────────────
    character_profiles: dict             # {"Hero": {"scar": "left cheek", "clothing": "..."}}
    visual_style_bible: str              # Locked art style contract — prevents style drift

    # ─── Node 4: Sound Designer ─────────────────────────────────────────────────
    audio_mood_board: str                # "120bpm, heavy synth bass, raining ambience"
    audio_vibe: str                      # Selected category for background music

    # ─── Node 5: Screenwriter ───────────────────────────────────────────────────
    script_draft: str
    emotion_arc: dict                    # {"scene_1": "tense", "scene_2": "peak_fear"}

    # ─── Node 6: Script Doctor ──────────────────────────────────────────────────
    script_score: int                    # 1–10 quality score
    doctor_feedback: str
    narrative_warnings: List[str]        # Plot hole list from NarrativeConsistency tool

    # ─── HITL Gate ───────────────────────────────────────────────────────────────
    hitl_status: str                     # "pending" | "approved" | "edited" | "rejected"
    user_script_edits: Optional[str]     # User's inline edits to the script (if any)

    # ─── Node 8: Creative Director (Panel Schema) ────────────────────────────────
    panel_plan: List[dict]
    # [{"id": "p1", "layout": "full-width", "emotion": "tense", "physics": "rain:heavy"}, ...]

    # ─── Alternate Universe Branching ────────────────────────────────────────────
    branch_id: Optional[str]             # UUID of this branch (None = main timeline)
    parent_session_id: Optional[str]     # session_id being forked
    branch_point_panel_id: Optional[str] # Which panel was clicked (e.g. "p2")
    branch_direction: Optional[str]      # "darker" | "hopeful" | "comedic" | "chaotic"

    # ─── Meta / Observability ────────────────────────────────────────────────────
    meta_commentary: Annotated[List[str], operator.add]  # 4th Wall feed (append-only reducer)
    interventions: List[dict]            # Mid-stream user feedback: {feedback, timestamp}


def make_initial_state(
    prompt: str,
    session_id: str,
    pipeline_template: str = "default",
    sketch_b64: Optional[str] = None,
    user_id: str = "demo_user",
) -> StudioState:
    """Always initialize with ALL fields so no node ever hits a KeyError."""
    return {
        "user_prompt": prompt,
        "user_sketch_b64": sketch_b64,
        "session_id": session_id,
        "user_id": user_id,
        "pipeline_template": pipeline_template,
        "max_revisions": 3,
        # Node outputs — all empty until agents run
        "multiverse_lore": [],
        "negotiation_outcomes": [],
        "world_bible": "",
        "location_data": "",
        "scene_physics": "",
        "character_profiles": {},
        "visual_style_bible": "",
        "audio_mood_board": "",
        "audio_vibe": "default",
        "script_draft": "",
        "emotion_arc": {},
        "script_score": 0,
        "doctor_feedback": "",
        "narrative_warnings": [],
        # HITL
        "hitl_status": "pending",
        "user_script_edits": None,
        # Director
        "panel_plan": [],
        # Branching
        "branch_id": None,
        "parent_session_id": None,
        "branch_point_panel_id": None,
        "branch_direction": None,
        # Meta
        "meta_commentary": [],
        "interventions": [],
    }
