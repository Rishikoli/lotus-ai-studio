"""
graph.py — LangGraph pipeline for Lotus AI Studio.
8 nodes: Researcher → Location Scout → Casting Director → Sound Designer →
         Screenwriter → Script Doctor → Pruner → Creative Director (with HITL gate)
"""
import time
import json
import logging
from typing import AsyncIterator, Optional

import google.generativeai as genai
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from config import (
    GEMINI_API_KEY, PIPELINE_MODEL, DIRECTOR_MODEL, DIRECTOR_MODE,
    SSE_META, SSE_HITL_PAUSE, SSE_PANEL_SCHEMA, SSE_PANEL_TEXT,
    SSE_PANEL_IMAGE, SSE_PANEL_DONE, SSE_DONE, SSE_ERROR,
    build_template_system_prompt, GCS_BUCKET,
)
from state import StudioState

log = logging.getLogger("lotus.graph")
genai.configure(api_key=GEMINI_API_KEY)

# ─── Shared Gemini caller ─────────────────────────────────────────────────────

async def call_gemini(
    system: str,
    user_prompt: str,
    model_name: str = PIPELINE_MODEL,
    temperature: float = 0.8,
) -> str:
    """Single Gemini call. Returns full response text."""
    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system,
    )
    response = await model.generate_content_async(
        user_prompt,
        generation_config=genai.GenerationConfig(temperature=temperature),
    )
    return response.text.strip()


def meta_event(node: str, status: str, content: str, duration_ms: int = 0) -> dict:
    return {
        "type": SSE_META,
        "node": node,
        "status": status,
        "duration_ms": duration_ms,
        "content": content,
    }


# ─── Node wrappers ────────────────────────────────────────────────────────────
# Each node is an async function that accepts StudioState and returns updates.
# Wrapped in safe_node() to gracefully handle individual agent failures.

def safe_node(node_name: str):
    """Decorator — wraps any node fn in try/except. On failure passes state through."""
    def decorator(fn):
        async def wrapper(state: StudioState) -> dict:
            t_start = time.time()
            try:
                result = await fn(state)
                duration_ms = int((time.time() - t_start) * 1000)
                log.info(f"{node_name} completed in {duration_ms}ms")
                return result
            except Exception as e:
                duration_ms = int((time.time() - t_start) * 1000)
                log.error(f"{node_name} failed: {e}")
                # Pass through state unchanged — pipeline continues with best available data
                return {
                    "meta_commentary": [f"[{node_name}] encountered an error: {str(e)[:100]}"],
                }
        wrapper.__name__ = node_name
        return wrapper
    return decorator


# ─── NODE 1: Researcher ───────────────────────────────────────────────────────

@safe_node("researcher_node")
async def researcher_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    system = f"""You are a world-class Research Director for a cinematic story studio.
Your job: build a rich, internally-consistent WORLD BIBLE from the user's prompt.
Include: history, factions, technology level, cultural norms, geography, and atmosphere.
Be detailed but precise. This document will be used by all other agents.
{template_prompt}"""

    world_bible = await call_gemini(
        system=system,
        user_prompt=f"Build a comprehensive World Bible for this story: {state['user_prompt']}",
        temperature=0.85,
    )

    return {
        "world_bible": world_bible,
        "meta_commentary": [f"Researcher: World bible complete ({len(world_bible)} chars)"],
    }


# ─── NODE 2: Location Scout ────────────────────────────────────────────────────

@safe_node("location_scout_node")
async def location_scout_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    # Scene Physics Composer — simulate real environmental physics
    physics_system = f"""You are a Scene Physics Composer for a film studio.
Your job: define precise physical parameters for every environment in this story.
Output ONLY a JSON object with keys: rain, wind, lightning, lighting, temperature, time_of_day.
Each value is a specific string: e.g. rain: "heavy_downpour", wind: "40mph_west", lightning: "strobe_2s".
{template_prompt}"""

    physics_raw = await call_gemini(
        system=physics_system,
        user_prompt=f"World Bible:\n{state['world_bible'][:2000]}\n\nPrompt: {state['user_prompt']}",
        temperature=0.6,
    )

    # Location data
    location_system = f"""You are a Location Scout for a cinematic story studio.
Given a world bible, identify and describe 3-5 KEY LOCATIONS for this story.
For each: name, visual description, atmosphere, and how it serves the narrative.
{template_prompt}"""

    location_data = await call_gemini(
        system=location_system,
        user_prompt=f"World Bible:\n{state['world_bible'][:2000]}\n\nFind the key locations.",
        temperature=0.8,
    )

    # Sketch-to-Scene: if user provided a sketch, incorporate it as spatial constraint
    sketch_note = ""
    if state.get("user_sketch_b64"):
        sketch_note = "USER HAS PROVIDED A HAND-DRAWN SKETCH. All location compositions must respect the spatial layout shown in that sketch."

    return {
        "location_data": location_data + f"\n\n[SKETCH CONSTRAINT: {sketch_note}]" if sketch_note else location_data,
        "scene_physics": physics_raw,
        "meta_commentary": [f"Location Scout: {len(location_data)} char location brief + physics locked"],
    }


# ─── NODE 3: Casting Director ─────────────────────────────────────────────────

@safe_node("casting_director_node")
async def casting_director_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    # Temporal Continuity Manager: strict character bible
    system = f"""You are a Casting Director and Temporal Continuity Manager.
Your job: define every character with PRECISE visual descriptors that will be injected into
every image generation prompt. Be extremely specific — "tall" is wrong, "6'4 with broad shoulders" is right.

Output a JSON object where each key is a character name, value is an object with:
  height, build, hair_color, hair_style, eye_color, skin_tone, clothing, accessories, 
  distinctive_features (scars, tattoos, etc.), body_language

Also output a VISUAL_STYLE_BIBLE string: the locked art style for ALL panels (e.g. "graphic novel, 
high-contrast ink, gold and black color palette, cinematic 2.39:1 framing").
{template_prompt}"""

    response_text = await call_gemini(
        system=system,
        user_prompt=f"World Bible:\n{state['world_bible'][:2000]}\n\nCast the story characters with full visual specs.",
        temperature=0.7,
    )

    # Try to extract JSON character profiles
    character_profiles = {}
    visual_style_bible = "Graphic novel style, high-contrast, cinematic framing"
    try:
        # Look for JSON block in response
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
            data = json.loads(json_str)
            character_profiles = data.get("characters", data)
            visual_style_bible = data.get("visual_style_bible", visual_style_bible)
    except Exception:
        log.warning("Casting Director: failed to parse JSON — using raw text as profiles")
        character_profiles = {"characters": response_text[:1000]}

    return {
        "character_profiles": character_profiles,
        "visual_style_bible": visual_style_bible,
        "meta_commentary": [f"Casting Director: {len(character_profiles)} characters profiled, style bible locked"],
    }


# ─── NODE 4: Sound Designer ────────────────────────────────────────────────────

@safe_node("sound_designer_node")
async def sound_designer_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    system = f"""You are a Hollywood Sound Designer.
Create an audio mood board for this story: BPM, key instruments, ambience, and emotional cues for each act.
Format: one paragraph describing the sonic identity of the whole story, then bullet points for each act.
{template_prompt}"""

    audio_mood_board = await call_gemini(
        system=system,
        user_prompt=f"Story prompt: {state['user_prompt']}\nLocation physics: {state['scene_physics'][:500]}",
        temperature=0.75,
    )

    return {
        "audio_mood_board": audio_mood_board,
        "meta_commentary": [f"Sound Designer: audio mood board ready"],
    }


# ─── NODE 5: Screenwriter ─────────────────────────────────────────────────────

@safe_node("screenwriter_node")
async def screenwriter_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    # Handle branch direction
    branch_instruction = ""
    if state.get("branch_direction"):
        direction_map = {
            "darker": "The story takes a MUCH DARKER turn from here. Hope is shattered. Raise the stakes brutally.",
            "hopeful": "The story pivots to UNEXPECTED HOPE. Find the silver lining. Characters discover strength.",
            "comedic": "The story shifts to ABSURDIST COMEDY. The dramatic tension collapses into surreal humor.",
            "chaotic": "The story becomes CHAOTIC AND UNPREDICTABLE. Subvert every expectation. Reality bends.",
        }
        branch_instruction = f"\n\nBRANCH DIRECTIVE: {direction_map.get(state['branch_direction'], '')}"

    # Handle doctor feedback for revision loop
    revision_note = ""
    if state.get("doctor_feedback") and state.get("script_score", 0) > 0:
        revision_note = f"\n\nREVISION NOTES from Script Doctor (score was {state['script_score']}/10):\n{state['doctor_feedback']}"

    # Handle user edits from HITL
    if state.get("user_script_edits"):
        return {
            "script_draft": state["user_script_edits"],
            "emotion_arc": state.get("emotion_arc", {}),
            "meta_commentary": ["Screenwriter: incorporated user's inline script edits"],
        }

    system = f"""You are an award-winning Screenwriter for a graphic novel film studio.
Write a CINEMATIC SCRIPT with {3 if not state.get('branch_direction') else 2}-5 distinct scenes.
Use screenplay format. Each scene must have: INT/EXT, location, time, action lines, dialogue.
After the script, output an EMOTION_ARC as JSON: {{"scene_1": "tense", "scene_2": "peak_fear", ...}}
Valid emotions: calm, curious, tense, dread, peak_fear, revelation, hopeful, resolved, comedic, absurd.

World Bible: {state['world_bible'][:1500]}
Characters: {json.dumps(state['character_profiles'])[:800]}
Locations: {state['location_data'][:800]}
{template_prompt}{branch_instruction}{revision_note}"""

    full_script = await call_gemini(
        system=system,
        user_prompt=f"Write the script for: {state['user_prompt']}",
        temperature=0.9,
    )

    # Extract emotion arc JSON
    emotion_arc = {}
    try:
        if "EMOTION_ARC" in full_script or "emotion_arc" in full_script.lower():
            json_part = full_script.split("```json")[-1].split("```")[0] if "```json" in full_script else "{}"
            emotion_arc = json.loads(json_part)
            # Strip the JSON from the script text
            script_only = full_script.split("```json")[0].strip() if "```json" in full_script else full_script
        else:
            script_only = full_script
    except Exception:
        script_only = full_script

    return {
        "script_draft": script_only,
        "emotion_arc": emotion_arc,
        "meta_commentary": [f"Screenwriter: script draft ready ({len(script_only)} chars)"],
        "max_revisions": max(0, state["max_revisions"] - 1),
    }


# ─── NODE 6: Script Doctor ────────────────────────────────────────────────────

@safe_node("script_doctor_node")
async def script_doctor_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    system = f"""You are a ruthless Script Doctor for a premium story studio.
Analyze the script for: narrative consistency, character motivation, dramatic arc, dialogue quality.
Output EXACTLY this JSON:
{{
  "score": <integer 1-10>,
  "feedback": "<specific, actionable revision notes>",
  "warnings": ["<plot hole 1>", "<plot hole 2>"]
}}
Score 8+ = approve. Below 8 = request revision.
{template_prompt}"""

    response = await call_gemini(
        system=system,
        user_prompt=f"Review this script:\n{state['script_draft'][:3000]}",
        temperature=0.4,
    )

    score = 8   # Default to approve if parsing fails
    feedback = ""
    warnings = []
    try:
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        else:
            json_str = response
        data = json.loads(json_str)
        score = int(data.get("score", 8))
        feedback = data.get("feedback", "")
        warnings = data.get("warnings", [])
    except Exception:
        log.warning("Script Doctor: failed to parse JSON score — defaulting to 8")

    return {
        "script_score": score,
        "doctor_feedback": feedback,
        "narrative_warnings": warnings,
        "meta_commentary": [f"Script Doctor: score {score}/10 — {'APPROVED' if score >= 8 else 'REVISION REQUESTED'}"],
    }


def script_doctor_router(state: StudioState) -> str:
    """Conditional edge: loop back to Screenwriter if score < 8 and revisions remaining."""
    if state["script_score"] < 8 and state["max_revisions"] > 0 and not state.get("branch_direction"):
        log.info(f"Script Doctor routing back to Screenwriter (score={state['script_score']}, revisions_left={state['max_revisions']})")
        return "screenwriter_node"
    return "hitl_gate_node"


# ─── NODE 7: Pruner ────────────────────────────────────────────────────────────

async def pruner_node(state: StudioState) -> dict:
    """Strip token-bloating fields before the Director's expensive generation call."""
    log.info("Pruner: stripping world_bible and meta_commentary to reduce token load")
    return {
        "world_bible": "",       # No longer needed — Director uses script_draft + character_profiles
        "meta_commentary": [f"Pruner: stripped world bible. Approx token saving: {len(state.get('world_bible','')) // 4}"],
    }


# ─── NODE 8: Creative Director ────────────────────────────────────────────────

async def director_node(state: StudioState):
    """
    The finale node. Emits SSE events directly via astream_events custom events.
    1. Computes panel_schema → emits SSE_PANEL_SCHEMA
    2. For each panel: emits text, image URL, audio
    """
    import inspect
    ctx = inspect.currentframe()   # placeholder for future custom event emission

    # Token budget check — compress if approaching 80% of 80k context window
    estimated_tokens = (
        len(state.get("script_draft", "")) +
        len(json.dumps(state.get("character_profiles", {}))) +
        len(state.get("scene_physics", "")) +
        len(state.get("visual_style_bible", ""))
    ) // 4

    if estimated_tokens > 64_000:   # 80% of 80k
        log.warning(f"Token budget check: {estimated_tokens} tokens — compressing character_profiles")
        compressed = {
            k: ", ".join(f"{fk}:{fv}" for fk, fv in v.items()) if isinstance(v, dict) else str(v)
            for k, v in state["character_profiles"].items()
        }
        state = {**state, "character_profiles": compressed}

    # 1. Generate panel schema
    panel_schema = await _generate_panel_schema(state)

    # 2. Stream: panel_schema event first (frontend pre-builds grid before media arrives)
    yield {
        "type": SSE_PANEL_SCHEMA,
        "panels": panel_schema,
        "session_id": state["session_id"],
    }

    # 3. For each panel — stream text then image
    for panel in panel_schema:
        panel_id = panel["id"]
        emotion = panel.get("emotion", "tense")
        physics = panel.get("physics", "")
        layout = panel.get("layout", "full-width")

        # Stream narration text
        narration = await _generate_panel_text(state, panel)
        yield {
            "type": SSE_PANEL_TEXT,
            "panel_id": panel_id,
            "content": narration,
        }

        # Generate image
        image_url = await _generate_panel_image(state, panel, narration)
        yield {
            "type": SSE_PANEL_IMAGE,
            "panel_id": panel_id,
            "image_url": image_url,
            "physics": physics,
            "emotion": emotion,
            "layout": layout,
        }

        # Panel complete
        yield {
            "type": SSE_PANEL_DONE,
            "panel_id": panel_id,
        }

    yield {"type": SSE_DONE, "session_id": state["session_id"]}


async def _generate_panel_schema(state: StudioState) -> list:
    """Generate the structured panel layout plan."""
    system = """You are a Graphic Novel Art Director.
Given a script, output a JSON array of panel objects — one per scene.
Each panel MUST have: id (p1, p2...), layout, emotion, physics, aspect_ratio.

layout options: "full-width", "portrait-left", "portrait-right", "split-2col", "cinematic-wide"
emotion options: calm, curious, tense, dread, peak_fear, revelation, hopeful, resolved, comedic
physics: from the scene physics data or "" if none

Output ONLY valid JSON array, no markdown."""

    response = await call_gemini(
        system=system,
        user_prompt=f"Script:\n{state['script_draft'][:2000]}\n\nPhysics: {state['scene_physics'][:300]}\nEmotion arc: {json.dumps(state['emotion_arc'])}",
        temperature=0.5,
        model_name=DIRECTOR_MODEL,
    )

    try:
        panels = json.loads(response)
        if not isinstance(panels, list):
            raise ValueError("Not a list")
        return panels
    except Exception:
        log.warning("Director: failed to parse panel schema — using default 3-panel layout")
        return [
            {"id": "p1", "layout": "full-width", "emotion": "tense", "physics": "", "aspect_ratio": "16:9"},
            {"id": "p2", "layout": "cinematic-wide", "emotion": state.get("emotion_arc", {}).get("scene_2", "dread"), "physics": state.get("scene_physics", "")[:50], "aspect_ratio": "2.39:1"},
            {"id": "p3", "layout": "split-2col", "emotion": "resolved", "physics": "", "aspect_ratio": "1:1"},
        ]


async def _generate_panel_text(state: StudioState, panel: dict) -> str:
    """Generate narration text for a single panel."""
    system = """You are a Graphic Novel Narrator.
Write a single evocative narration caption (2-4 sentences) for this story panel.
Style: present tense, cinematic, literary. Match the emotional tone specified."""

    return await call_gemini(
        system=system,
        user_prompt=f"Panel {panel['id']} — Emotion: {panel.get('emotion')} — Physics: {panel.get('physics')}\n\nScript excerpt:\n{state['script_draft'][:1500]}",
        temperature=0.85,
        model_name=DIRECTOR_MODEL,
    )


async def _generate_panel_image(state: StudioState, panel: dict, narration: str) -> str:
    """
    Generate an image for a panel using the Prompt Cinematographer pattern.
    Returns a Cloud Storage CDN URL (or placeholder if GCS not configured).
    """
    # Prompt Cinematographer — rewrite narration into cinematographic image prompt
    cinematographer_prompt = _build_image_prompt(state, panel, narration)

    try:
        model = genai.GenerativeModel(DIRECTOR_MODEL)
        response = await model.generate_content_async(
            [cinematographer_prompt],
            generation_config=genai.GenerationConfig(
                response_mime_type="image/jpeg",
            ),
        )

        if response.candidates and response.candidates[0].content.parts:
            image_bytes = response.candidates[0].content.parts[0].inline_data.data

            # Upload to Cloud Storage if configured
            from services.storage import upload_panel_image
            url = await upload_panel_image(
                session_id=state["session_id"],
                panel_id=panel["id"],
                image_bytes=image_bytes,
            )
            return url

    except Exception as e:
        log.error(f"Image generation failed for {panel['id']}: {e}")

    return f"/api/placeholder/{panel['id']}"   # Fallback placeholder URL


def _build_image_prompt(state: StudioState, panel: dict, narration: str) -> str:
    """Prompt Cinematographer: convert narration into high-budget cinematographic image prompt."""
    characters = state.get("character_profiles", {})
    style = state.get("visual_style_bible", "graphic novel, high contrast")
    physics = panel.get("physics", "")
    emotion = panel.get("emotion", "tense")
    aspect = panel.get("aspect_ratio", "16:9")

    # Emotion → visual language mapping
    emotion_visual = {
        "tense": "close-up shot, shallow depth of field, cold blue tones",
        "dread": "low angle shot, deep shadows, dutch angle, desaturated",
        "peak_fear": "dolby zoom, extreme wide then tight, chaotic framing",
        "revelation": "dramatic overhead shot, shaft of light breaking through darkness",
        "hopeful": "golden hour lighting, warm tones, open framing",
        "resolved": "wide master shot, balanced composition, natural light",
        "calm": "medium shot, neutral lighting, stable horizon",
        "comedic": "wide angle, bright lighting, exaggerated expressions",
    }
    visual_lang = emotion_visual.get(emotion, "cinematic framing")

    char_desc = " ".join([
        f"{name}: {', '.join(str(v) for v in attrs.values())[:100]}"
        for name, attrs in list(characters.items())[:2]
    ])

    return f"""{style}. {visual_lang}. Aspect ratio {aspect}.
Scene: {narration[:200]}
Environment: {physics}
Characters present: {char_desc}
Lighting: dramatic, high-contrast. No text or watermarks. Single panel composition."""


async def run_director_node(state: StudioState, panel_ids: Optional[list] = None) -> AsyncIterator[dict]:
    """Run Director's Cut — regenerate specific panels with feedback applied."""
    # Filter to only requested panels if panel_ids provided
    panels_to_regen = state.get("panel_plan", [])
    if panel_ids:
        panels_to_regen = [p for p in panels_to_regen if p["id"] in panel_ids]

    for panel in panels_to_regen:
        narration = await _generate_panel_text(state, panel)
        image_url = await _generate_panel_image(state, panel, narration)
        yield {
            "type": SSE_PANEL_TEXT,
            "panel_id": panel["id"],
            "content": narration,
        }
        yield {
            "type": SSE_PANEL_IMAGE,
            "panel_id": panel["id"],
            "image_url": image_url,
            "physics": panel.get("physics", ""),
            "emotion": panel.get("emotion", "tense"),
            "layout": panel.get("layout", "full-width"),
        }
        yield {"type": SSE_PANEL_DONE, "panel_id": panel["id"]}


# ─── HITL Gate Node ────────────────────────────────────────────────────────────

async def hitl_gate_node(state: StudioState) -> dict:
    """
    This node is declared ONLY so LangGraph knows where to interrupt.
    The graph is compiled with interrupt_before=["hitl_gate_node"].
    Actual approval logic is handled by /api/resume via graph.update_state().
    """
    # Save state to Redis for reconnect/resume
    from main import save_state
    save_state(state["session_id"], state)

    return {
        "meta_commentary": [f"HITL: waiting for user approval of script (score: {state.get('script_score', '?')}/10)"],
    }


# ─── Graph Assembly ────────────────────────────────────────────────────────────

_graph = None          # Singleton — compiled once at startup
_branch_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = _build_main_graph()
    return _graph


def get_branch_graph():
    global _branch_graph
    if _branch_graph is None:
        _branch_graph = _build_branch_graph()
    return _branch_graph


def _build_main_graph():
    """Full 8-node pipeline with HITL interrupt."""
    builder = StateGraph(StudioState)

    # Add nodes
    builder.add_node("researcher_node", researcher_node)
    builder.add_node("location_scout_node", location_scout_node)
    builder.add_node("casting_director_node", casting_director_node)
    builder.add_node("sound_designer_node", sound_designer_node)
    builder.add_node("screenwriter_node", screenwriter_node)
    builder.add_node("script_doctor_node", script_doctor_node)
    builder.add_node("hitl_gate_node", hitl_gate_node)
    builder.add_node("pruner_node", pruner_node)
    builder.add_node("director_node", director_node)

    # Linear edges
    builder.set_entry_point("researcher_node")
    builder.add_edge("researcher_node", "location_scout_node")
    builder.add_edge("location_scout_node", "casting_director_node")
    builder.add_edge("casting_director_node", "sound_designer_node")
    builder.add_edge("sound_designer_node", "screenwriter_node")
    builder.add_edge("screenwriter_node", "script_doctor_node")

    # Conditional: Script Doctor → Screenwriter (retry) or HITL Gate (approve)
    builder.add_conditional_edges("script_doctor_node", script_doctor_router, {
        "screenwriter_node": "screenwriter_node",
        "hitl_gate_node": "hitl_gate_node",
    })

    # After HITL: pruner → director
    builder.add_edge("hitl_gate_node", "pruner_node")
    builder.add_edge("pruner_node", "director_node")
    builder.add_edge("director_node", END)

    # Compile with HITL interrupt + MemorySaver checkpointer (BUG 1 FIX)
    checkpointer = MemorySaver()
    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["hitl_gate_node"],
    )


def _build_branch_graph():
    """Branch pipeline: Screenwriter → Script Doctor → Pruner → Director (skips HITL)."""
    builder = StateGraph(StudioState)

    builder.add_node("screenwriter_node", screenwriter_node)
    builder.add_node("script_doctor_node", script_doctor_node)
    builder.add_node("pruner_node", pruner_node)
    builder.add_node("director_node", director_node)

    builder.set_entry_point("screenwriter_node")
    builder.add_edge("screenwriter_node", "script_doctor_node")

    # Branches get max 1 revision loop
    builder.add_conditional_edges("script_doctor_node", script_doctor_router, {
        "screenwriter_node": "screenwriter_node",
        "hitl_gate_node": "pruner_node",   # Branches skip HITL — "hitl_gate_node" edges go to pruner
    })

    builder.add_edge("pruner_node", "director_node")
    builder.add_edge("director_node", END)

    return builder.compile(checkpointer=MemorySaver())
