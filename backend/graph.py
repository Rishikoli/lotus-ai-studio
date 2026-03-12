"""
graph.py — LangGraph pipeline for Lotus AI Studio.
8 nodes: Researcher → Location Scout → Casting Director → Sound Designer →
         Screenwriter → Script Doctor → Pruner → Creative Director (with HITL gate)
"""
import time
import json
import logging
import asyncio
from typing import AsyncIterator, Optional

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from vertexai.preview.vision_models import ImageGenerationModel
from google.api_core import exceptions

from config import (
    PIPELINE_MODEL, DIRECTOR_MODEL, DIRECTOR_MODE,
    SSE_META, SSE_AUDIO_VIBE, SSE_HITL_PAUSE, SSE_PANEL_SCHEMA, SSE_PANEL_TEXT,
    SSE_PANEL_IMAGE, SSE_PANEL_DONE, SSE_DONE, SSE_ERROR,
    build_template_system_prompt, GCS_BUCKET,
)
from state import StudioState
from services.firestore import (
    save_script_draft, finalize_story_commit, 
    search_multiverse_lore, commit_to_multiverse
)

log = logging.getLogger("lotus.graph")
vertexai.init(project="phrasal-bivouac-489706-r8", location="us-central1")

# ─── Shared Gemini caller ─────────────────────────────────────────────────────

async def call_gemini(
    system: str,
    user_prompt: str,
    model_name: str = PIPELINE_MODEL,
    temperature: float = 0.8,
) -> str:
    """Single Gemini call with exponential backoff for 429s."""
    model = GenerativeModel(
        model_name=model_name,
        system_instruction=system,
    )
    
    max_retries = 3
    backoff = 1
    
    for i in range(max_retries + 1):
        try:
            response = await model.generate_content_async(
                user_prompt,
                generation_config=GenerationConfig(temperature=temperature),
            )
            return response.text.strip()
        except exceptions.ResourceExhausted as e:
            if i == max_retries:
                log.error(f"Gemini 429: Resource exhausted after {max_retries} retries.")
                raise e
            log.warning(f"Gemini 429 hit. Retrying in {backoff}s... ({i+1}/{max_retries})")
            await asyncio.sleep(backoff)
            backoff *= 2
        except Exception as e:
            log.error(f"Gemini call failed: {e}")
            raise e
    return ""


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
    """Decorator — wraps any node fn in try/except. Supports both async fns and generators."""
    import inspect
    def decorator(fn):
        if inspect.isasyncgenfunction(fn):
            async def wrapper(state: StudioState):
                t_start = time.time()
                try:
                    async for chunk in fn(state):
                        yield chunk
                    duration_ms = int((time.time() - t_start) * 1000)
                    log.info(f"{node_name} completed in {duration_ms}ms")
                except Exception as e:
                    log.error(f"{node_name} generator failed: {e}")
                    yield {"meta_commentary": [f"[{node_name}] error: {str(e)[:100]}"]}
        else:
            async def wrapper(state: StudioState) -> dict:
                t_start = time.time()
                try:
                    result = await fn(state)
                    duration_ms = int((time.time() - t_start) * 1000)
                    log.info(f"{node_name} completed in {duration_ms}ms")
                    return result
                except Exception as e:
                    log.error(f"{node_name} failed: {e}")
                    return {"meta_commentary": [f"[{node_name}] error: {str(e)[:100]}"]}
        wrapper.__name__ = node_name
        return wrapper
    return decorator


# ─── NODE 0: Historian ────────────────────────────────────────────────────────

@safe_node("historian_node")
async def historian_node(state: StudioState) -> dict:
    """Scan the user prompt for multiverse entities and pull their history."""
    system = """You are a Master Historian of the Lotus Multiverse. 
Your task: Identify potential entities (Characters, Artifacts, Locations) mentioned in the user's prompt.
Extract exactly the keywords that could be keys in a lore ledger.
Output ONLY a JSON array of strings."""

    response = await call_gemini(
        system=system,
        user_prompt=state["user_prompt"],
        temperature=0.3,
    )
    
    keywords = []
    try:
        keywords = json.loads(response)
        if not isinstance(keywords, list): keywords = []
    except:
        pass
    
    lore = []
    if keywords:
        lore = await search_multiverse_lore(keywords)
    
    meta = f"Historian: Searched lore for {keywords}. Found {len(lore)} relevant entries."
    return {
        "multiverse_lore": lore,
        "meta_commentary": [meta],
    }


# ─── NODE 1: Researcher ───────────────────────────────────────────────────────

@safe_node("researcher_node")
async def researcher_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    # Import the new ADK Agent wrapper
    from agents.researcher_adk import run_adk_researcher

    # The ADK Agent handles tools and reasoning natively via InMemoryRunner
    lore_str = json.dumps(state.get("multiverse_lore", []))
    user_prompt = f"Template constraints: {template_prompt}\nMultiverse Lore (RESPECT THIS): {lore_str}\nUser Prompt: {state['user_prompt']}"
    
    world_bible = await run_adk_researcher(
        user_prompt=user_prompt,
        session_id=state["session_id"]
    )

    return {
        "world_bible": world_bible,
        "meta_commentary": [f"Researcher [ADK]: World bible complete ({len(world_bible)} chars)"],
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
async def casting_director_node(state: StudioState):
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
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
            data = json.loads(json_str)
            character_profiles = data.get("characters", data)
            visual_style_bible = data.get("visual_style_bible", visual_style_bible)
    except Exception:
        log.warning("Casting Director: failed to parse JSON — using raw text as profiles")
        character_profiles = {"characters": response_text[:1000]}

    # Stream character profiles to frontend
    yield {
        "type": "character_profiles",
        "profiles": character_profiles
    }

    yield {
        "character_profiles": character_profiles,
        "visual_style_bible": visual_style_bible,
        "meta_commentary": [f"Casting Director: {len(character_profiles)} characters profiled, style bible locked"],
    }


# ─── NODE 4: Sound Designer ────────────────────────────────────────────────────

@safe_node("sound_designer_node")
async def sound_designer_node(state: StudioState) -> dict:
    template_prompt = build_template_system_prompt(state["pipeline_template"])

    system = f"""You are a Master Sound Designer for a cinematic story studio.
Based on the story's visual style and world, select the most appropriate background audio 'vibe' and describe the soundscape.

VIBE_CATEGORIES:
- dark_synth: moody, retro-electronic, driving (Noir / Sci-Fi)
- epic_orchestral: cinematic strings, brass, mythic (Fantasy / Epic)
- lofi_mystery: soft, atmospheric, intriguing (Mystery / Drama)
- horror_ambient: unsettling, low drones, dissonant (Horror)
- adventurous_folk: acoustic, warm, rhythmic (Travel / Comedy)

Output EXACTLY this JSON:
{{
  "vibe": "<one of VIBE_CATEGORIES>",
  "mood_board": "<2-3 sentences describing the soundscape>"
}}
{template_prompt}"""

    response = await call_gemini(
        system=system,
        user_prompt=f"Story details:\n{state['world_bible'][:1000]}\nVisual Style: {state['visual_style_bible']}",
        temperature=0.7,
    )

    vibe = "lofi_mystery"  # Default
    mood_board = ""
    try:
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        else:
            json_str = response
        data = json.loads(json_str)
        vibe = data.get("vibe", "lofi_mystery")
        mood_board = data.get("mood_board", "")
    except Exception:
        log.warning("Sound Designer: failed to parse JSON vibe")

    # Yield the vibe event for the frontend
    yield {
        "type": SSE_AUDIO_VIBE,
        "vibe": vibe,
    }

    return {
        "audio_mood_board": mood_board,
        "audio_vibe": vibe,
        "meta_commentary": [f"Sound Designer: selected {vibe} vibe."],
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

    # Handle negotiation outcomes (Agentic Audience)
    negotiation_notes = ""
    if state.get("negotiation_outcomes"):
        notes = []
        for n in state["negotiation_outcomes"]:
            notes.append(f"- Character: {n['character']}, Outcome: {n['outcome']}, Influence Directive: {n['influence']}")
        negotiation_notes = "\n\nCRITICAL INTERACTION OUTCOMES (Must be followed):\n" + "\n".join(notes)

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
{template_prompt}{branch_instruction}{revision_note}{negotiation_notes}"""

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

Guidelines:
1. Ensure character interactions (negotiation outcomes) are respected.
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
    score = state.get("script_score", 0)
    revisions_left = state.get("max_revisions", 0)
    
    log.info(f"Script Doctor Router: score={score}, revisions_left={revisions_left}")
    
    # Bug 13 Fix: If score is 0 (error/failure), DO NOT loop back.
    # This prevents infinite loops if the Screenwriter keeps failing or Script Doctor can't parse.
    if score == 0:
        log.warning("Script Doctor produced a 0 score (parsing error or node failure). Breaking loop.")
        return "hitl_gate_node"

    if score < 8 and revisions_left > 0 and not state.get("branch_direction"):
        log.info(f"Routing back to screenwriter (revisions remaining: {revisions_left})")
        return "screenwriter_node"
        
    log.info("Routing to HITL Gate (approval or out of revisions)")
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

    final_panels_data = []

    # 3. For each panel — stream text then image
    for panel in panel_schema:
        panel_id = panel["id"]
        emotion = panel.get("emotion", "tense")
        physics = panel.get("physics", "")
        layout = panel.get("layout", "full-width")
        sfx_cue = panel.get("sfx_cue", "")

        # Two-step premium process: 
        # 1. Gemini for narration | 2. Imagen 3 for imagery | 3. Cloud TTS for audio
        try:
            narration = await _generate_panel_text(state, panel)
            
            # Generate both visuals and audio in parallel for speed
            image_task = _generate_panel_image(state, panel, narration)
            audio_task = _generate_panel_audio(state, panel, narration)
            image_url, audio_url = await asyncio.gather(image_task, audio_task)
            
        except Exception as e:
            log.error(f"Director processing failed for {panel_id}: {e}")
            narration = "..."
            image_url = f"/api/placeholder/{panel_id}"
            audio_url = ""

        # Yield extracted text
        yield {
            "type": SSE_PANEL_TEXT,
            "panel_id": panel_id,
            "content": narration,
        }

        # Yield extracted audio
        if audio_url:
            yield {
                "type": SSE_PANEL_AUDIO,
                "panel_id": panel_id,
                "audio_url": audio_url,
            }

        # Yield extracted image
        yield {
            "type": SSE_PANEL_IMAGE,
            "panel_id": panel_id,
            "image_url": image_url,
            "physics": physics,
            "emotion": emotion,
            "layout": layout,
            "sfx_cue": sfx_cue,
        }

        # Panel complete
        yield {
            "type": SSE_PANEL_DONE,
            "panel_id": panel_id,
        }
        
        # Accumulate panel data for Save Point 2
        final_panels_data.append({
            "panel_id": panel_id,
            "image_url": image_url,
            "narration": narration,
            "physics": physics,
            "emotion": emotion,
            "layout": layout,
            "sfx_cue": sfx_cue,
        })

    # Save Point 2: Finalize story in Firestore (if not a branch partial-run)
    if not state.get("branch_direction"):
        await finalize_story_commit(state["session_id"], final_panels_data)

    yield {"type": SSE_DONE, "session_id": state["session_id"]}


# ─── NODE 9: Archivist ────────────────────────────────────────────────────────

@safe_node("archivist_node")
async def archivist_node(state: StudioState) -> dict:
    """Identify new lore from the finished story and commit to the Multiverse Ledger."""
    system = """You are the Grand Archivist of the Lotus Multiverse.
Review the finished story (world bible, character profiles, and script).
Identify NEW entities (Characters, Artifacts, Locations) or UPDATES to existing lore.
Output ONLY a JSON array of objects with keys: name, lore_summary, tags (list), and status."""

    # Using a slightly lower temperature for extraction consistency
    response = await call_gemini(
        system=system,
        user_prompt=f"World Bible: {state['world_bible'][:1000]}\nCharacters: {json.dumps(state['character_profiles'])}\nScript: {state['script_draft'][:2000]}",
        temperature=0.3,
    )
    
    entities = []
    try:
        # Simple extraction logic
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        else:
            json_str = response
            
        entities = json.loads(json_str)
        if isinstance(entities, list):
            # Attribution metadata
            for ent in entities:
                ent["session_id"] = state["session_id"]
                ent["last_updated_at"] = time.time()
                
            await commit_to_multiverse(entities)
    except Exception as e:
        log.warning(f"Archivist: failed to parse or commit lore: {e}")
    
    return {
        "meta_commentary": [f"Archivist: Synced {len(entities)} lore markers to the World Ledger."],
    }


async def _generate_panel_schema(state: StudioState) -> list:
    """Generate the structured panel layout plan."""
    system = """You are a Graphic Novel Art Director.
Given a script, output a JSON array of panel objects — one per scene.
Each panel MUST have: id (p1, p2...), layout, emotion, physics, aspect_ratio, and sfx_cue.

layout options: "full-width", "portrait-left", "portrait-right", "split-2col", "cinematic-wide"
emotion options: calm, curious, tense, dread, peak_fear, revelation, hopeful, resolved, comedic
physics: from the scene physics data or "" if none
sfx_cue: a short string identifying a cinematic sound (e.g., "thunder", "heartbeat", "explosion", "whoosh", "glitch", "rain_patter", "wind_howl") or "" if none.

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
            {"id": "p1", "layout": "full-width", "emotion": "tense", "physics": "", "aspect_ratio": "16:9", "sfx_cue": "whoosh"},
            {"id": "p2", "layout": "cinematic-wide", "emotion": state.get("emotion_arc", {}).get("scene_2", "dread"), "physics": state.get("scene_physics", "")[:50], "aspect_ratio": "2.39:1", "sfx_cue": "thunder"},
            {"id": "p3", "layout": "split-2col", "emotion": "resolved", "physics": "", "aspect_ratio": "1:1", "sfx_cue": ""},
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


async def _generate_panel_audio(state: StudioState, panel: dict, narration: str) -> str:
    """
    Generate high-fidelity narration audio using Google Cloud Text-to-Speech.
    Returns a public GCS URL.
    """
    try:
        from google.cloud import texttospeech
        
        client = texttospeech.TextToSpeechAsyncClient()
        
        input_text = texttospeech.SynthesisInput(text=narration)
        
        # Use premium Studio voice for maximum cinematic impact
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Studio-O"
        )
        
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            pitch=0,
            speaking_rate=0.95 # Slightly slower for dramatic effect
        )
        
        response = await client.synthesize_speech(
            request={"input": input_text, "voice": voice, "audio_config": audio_config}
        )
        
        url = await upload_panel_audio(
            session_id=state["session_id"],
            panel_id=panel["id"],
            audio_bytes=response.audio_content
        )
        return url
    except Exception as e:
        log.error(f"TTS Failed: {e}")
        return ""


async def _generate_panel_image(state: StudioState, panel: dict, narration: str) -> str:
    """
    Generate an image for a panel using the Prompt Cinematographer pattern.
    Returns a Cloud Storage CDN URL (or placeholder if GCS not configured).
    """
    # Prompt Cinematographer — rewrite narration into cinematographic image prompt
    cinematographer_prompt = _build_image_prompt(state, panel, narration)

    try:
        import asyncio
        # Load Imagen 3 model
        model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001")
        
        # Vertex AI SDK Imagen 3 is currently synchronous
        response = await asyncio.to_thread(
            model.generate_images,
            prompt=cinematographer_prompt,
            number_of_images=1,
            aspect_ratio="16:9",
            language="en"
        )

        if response and response.images:
            image_bytes = response.images[0]._image_bytes
            
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
        f"{name}: {(', '.join(str(v) for v in attrs.values()) if isinstance(attrs, dict) else str(attrs))[:100]}"
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
        # Use the two-step premium process: 
        # 1. Gemini for narration | 2. Imagen 3 for imagery
        try:
            narration = await _generate_panel_text(state, panel)
            image_url = await _generate_panel_image(state, panel, narration)
        except Exception as e:
            log.error(f"Regen failed for {panel['id']}: {e}")
            narration = "..."
            image_url = f"/api/placeholder/{panel['id']}"

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
    builder.add_node("historian_node", historian_node)
    builder.add_node("researcher_node", researcher_node)
    builder.add_node("location_scout_node", location_scout_node)
    builder.add_node("casting_director_node", casting_director_node)
    builder.add_node("sound_designer_node", sound_designer_node)
    builder.add_node("screenwriter_node", screenwriter_node)
    builder.add_node("script_doctor_node", script_doctor_node)
    builder.add_node("hitl_gate_node", hitl_gate_node)
    builder.add_node("pruner_node", pruner_node)
    builder.add_node("director_node", director_node)
    builder.add_node("archivist_node", archivist_node)

    # Linear edges
    builder.set_entry_point("historian_node")
    builder.add_edge("historian_node", "researcher_node")
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

    # After HITL: pruner → director → archivist
    builder.add_edge("hitl_gate_node", "pruner_node")
    builder.add_edge("pruner_node", "director_node")
    builder.add_edge("director_node", "archivist_node")
    builder.add_edge("archivist_node", END)

    # Compile with HITL interrupt + MemorySaver checkpointer (BUG 1 FIX)
    checkpointer = MemorySaver()
    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["hitl_gate_node"],
    )


def _build_branch_graph():
    """Branch pipeline: Screenwriter → Script Doctor → Pruner → Director (skips HITL)."""
    builder = StateGraph(StudioState)

    builder.add_node("historian_node", historian_node)
    builder.add_node("screenwriter_node", screenwriter_node)
    builder.add_node("script_doctor_node", script_doctor_node)
    builder.add_node("pruner_node", pruner_node)
    builder.add_node("director_node", director_node)
    builder.add_node("archivist_node", archivist_node)

    builder.set_entry_point("historian_node")
    builder.add_edge("historian_node", "screenwriter_node")
    builder.add_edge("screenwriter_node", "script_doctor_node")

    # Branches get max 1 revision loop
    builder.add_conditional_edges("script_doctor_node", script_doctor_router, {
        "screenwriter_node": "screenwriter_node",
        "hitl_gate_node": "pruner_node",   # Branches skip HITL — "hitl_gate_node" edges go to pruner
    })

    builder.add_edge("pruner_node", "director_node")
    builder.add_edge("director_node", "archivist_node")
    builder.add_edge("archivist_node", END)

    return builder.compile(checkpointer=MemorySaver())

def _build_interleaved_prompt(state: StudioState, panel: dict) -> list:
    """
    Hackathon requirement: Build a prompt that forces the model to interleave
    the narration text and the generated image into a single multimodal response stream.
    """
    characters = state.get("character_profiles", {})
    style = state.get("visual_style_bible", "graphic novel, high contrast")
    physics = panel.get("physics", "")
    emotion = panel.get("emotion", "tense")
    
    char_desc = " ".join([
        f"{name}: {', '.join(str(v) for v in attrs.values())[:100]}"
        for name, attrs in list(characters.items())[:2]
    ])

    return [
        "You are an avant-garde Graphic Novel Creative Director.",
        "Your engine natively supports INTERLEAVED OUTPUT (text + image natively woven together).",
        "For the following panel, I need exactly two parts in your single response:",
        "1. Start by writing 2-3 sentences of evocative, cinematic narration.",
        f"2. Immediately follow the text by generating the visual image for this panel inline. Visual Style: {style}. Lighting/Emotion: {emotion}. Physics: {physics}. Characters: {char_desc}",
        f"Script context: {state['script_draft'][:1000]}"
    ]
