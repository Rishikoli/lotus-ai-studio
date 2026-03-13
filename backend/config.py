"""
Config — pipeline templates, environment variables, and constants.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ─── API Keys & Models ─────────────────────────────────────────────────────────
INTERNAL_API_KEY  = os.getenv("INTERNAL_API_KEY", "lotus-demo-key")
PIPELINE_MODEL    = os.getenv("PIPELINE_MODEL", "gemini-2.5-pro")
DIRECTOR_MODEL    = os.getenv("DIRECTOR_MODEL", "gemini-2.5-pro")
DIRECTOR_MODE     = os.getenv("DIRECTOR_MODE", "interleaved")  # "interleaved" | "sequential"

# ─── Redis ────────────────────────────────────────────────────────────────────
REDIS_HOST        = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT        = int(os.getenv("REDIS_PORT", "6379"))
REDIS_TTL         = 3600  # 1 hour

# ─── Google Cloud ──────────────────────────────────────────────────────────────
GCS_BUCKET            = os.getenv("GCS_BUCKET", "lotus-studio-media")
FIRESTORE_DEMO_USER   = os.getenv("FIRESTORE_DEMO_USER_ID", "demo_user")

# ─── Pipeline Templates ────────────────────────────────────────────────────────
# Injected into every agent's system_instruction at graph initialization.
PIPELINE_TEMPLATES: dict = {
    "default": {
        "tone": "cinematic, dramatic",
        "dolby_zoom_threshold": 8,
    },
    "noir": {
        "tone": "cynical, hard-boiled, morally ambiguous",
        "physics": "rain:always",
        "aspect": "2.39:1",
        "lighting": "chiaroscuro",
        "dolby_zoom_threshold": 7,
    },
    "epic_fantasy": {
        "tone": "mythic, epic, world-shaking",
        "physics": "wind:soft",
        "lighting": "golden_hour",
        "dolby_zoom_threshold": 9,
    },
    "comedy": {
        "tone": "absurd, comedic, self-aware",
        "emotion_arc": "tension→absurdity→resolution",
        "dolby_zoom_threshold": 10,  # only on extreme punchlines
    },
    "horror": {
        "tone": "dread, slow-burn, claustrophobic",
        "physics": "lightning:strobe",
        "lighting": "single_candle",
        "dolby_zoom_threshold": 6,
    },
}


def get_template_config(name: str) -> dict:
    """Return template config, falling back to default if name unknown."""
    return PIPELINE_TEMPLATES.get(name, PIPELINE_TEMPLATES["default"])


def build_template_system_prompt(template_name: str) -> str:
    """Convert template config dict into a system instruction string for agents."""
    cfg = get_template_config(template_name)
    parts = []
    if "tone" in cfg:
        parts.append(f"TONE MANDATE: {cfg['tone']}. Every creative decision must serve this tone.")
    if "physics" in cfg:
        parts.append(f"ENVIRONMENT PHYSICS LOCKED: {cfg['physics']}.")
    if "lighting" in cfg:
        parts.append(f"LIGHTING MANDATE: {cfg['lighting']}.")
    if "emotion_arc" in cfg:
        parts.append(f"EMOTION ARC MANDATE: {cfg['emotion_arc']}.")
    if "aspect" in cfg:
        parts.append(f"ASPECT RATIO: {cfg['aspect']}. All image compositions must respect this.")
    return " ".join(parts) if parts else ""


# ─── SSE Event Types ──────────────────────────────────────────────────────────
# These string keys define the SSE protocol between backend and frontend.
SSE_META          = "meta"          # Agent status updates → PipelineVisualizer
SSE_AUDIO_VIBE    = "audio_vibe"    # Global background music category
SSE_SCRIPT        = "script"        # Streaming script draft text
SSE_HITL_PAUSE    = "hitl_pause"    # Signals frontend to show ScriptApprovalModal
SSE_PANEL_SCHEMA  = "panel_schema"  # Director's first event → pre-build panel grid
SSE_PANEL_TEXT    = "panel_text"    # Narration text for a panel
SSE_PANEL_IMAGE   = "panel_image"   # Image CDN URL for a panel
SSE_PANEL_AUDIO   = "panel_audio"   # Audio data for a panel
SSE_PANEL_VIDEO   = "panel_video"   # Video CDN URL for hero panel
SSE_PANEL_DONE    = "panel_done"    # Panel fully complete
SSE_AMBIENT_MUSIC = "ambient_music" # AI-generated background score
SSE_MULTIMODAL_INTERLEAVED = "multimodal_interleaved" # Native Gemini-style parts
SSE_DONE          = "done"          # Entire generation complete
SSE_ERROR         = "error"         # Node failed with graceful degradation

PIPELINE_NODE_IDS = [
    "historian_node", "researcher_node", "location_scout_node", "casting_director_node",
    "sound_designer_node", "screenwriter_node", "script_doctor_node",
    "pruner_node", "director_node", "archivist_node"
]
