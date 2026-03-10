"""
Lotus AI Studio — FastAPI Backend
Endpoints: /api/generate, /api/resume, /api/director_cut, /api/branch,
           /api/stream/{session_id}, /health
"""
import json
import uuid
import time
import logging
from typing import Optional

import redis as redis_lib
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from config import (
    INTERNAL_API_KEY, REDIS_HOST, REDIS_PORT, REDIS_TTL,
    SSE_META, SSE_HITL_PAUSE, SSE_PANEL_SCHEMA, SSE_DONE, SSE_ERROR,
    PIPELINE_TEMPLATES,
)
from state import StudioState, make_initial_state
from services.firestore import update_branch_ids

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("lotus")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Lotus AI Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Lock to frontend domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Redis ────────────────────────────────────────────────────────────────────
try:
    rdb = redis_lib.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    rdb.ping()
    log.info("Redis connected ✓")
except Exception as e:
    log.warning(f"Redis unavailable: {e} — HITL/Branch features will be degraded")
    rdb = None


# ─── Auth ─────────────────────────────────────────────────────────────────────
def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key", "")
    if key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


# ─── SSE Helpers ─────────────────────────────────────────────────────────────
def sse(data: dict) -> str:
    """Format a dict as a proper SSE event. Browser drops anything without this format."""
    return f"data: {json.dumps(data)}\n\n"


def sse_meta(node: str, status: str, content: str, duration_ms: int = 0) -> str:
    return sse({
        "type": SSE_META,
        "node": node,
        "status": status,        # "running" | "complete" | "error"
        "duration_ms": duration_ms,
        "content": content,
    })


def sse_error(node: str, message: str) -> str:
    return sse({"type": SSE_ERROR, "node": node, "content": message})


def sse_done(session_id: str) -> str:
    return sse({"type": SSE_DONE, "session_id": session_id})


# ─── Redis Helpers ────────────────────────────────────────────────────────────
def save_state(session_id: str, state: StudioState):
    if rdb:
        # Pre-prune: strip world_bible before caching (saves ~80KB per session)
        snapshot = {k: v for k, v in state.items()
                    if k not in ("world_bible", "meta_commentary")}
        rdb.setex(session_id, REDIS_TTL, json.dumps(snapshot))


def load_state(session_id: str) -> StudioState:
    if not rdb:
        raise HTTPException(503, "Redis unavailable — cannot resume session")
    raw = rdb.get(session_id)
    if not raw:
        raise HTTPException(404, f"Session {session_id} not found or expired")
    return json.loads(raw)


def checkpoint_panel(session_id: str, panel_id: str, chunk: dict):
    """Write each completed panel to Redis for stream reconnect."""
    if rdb:
        rdb.hset(f"{session_id}:checkpoints", panel_id, json.dumps(chunk))


# ─── Request Models ────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str
    pipeline_template: str = "default"
    user_sketch_b64: Optional[str] = None


class ResumeRequest(BaseModel):
    session_id: str
    action: str          # "approve" | "edit" | "reject"
    user_edits: Optional[str] = None


class DirectorCutRequest(BaseModel):
    session_id: str
    feedback: str
    panel_ids: Optional[list[str]] = None   # None = regenerate all panels


class BranchRequest(BaseModel):
    session_id: str
    branch_point_panel_id: str
    branch_direction: str    # "darker" | "hopeful" | "comedic" | "chaotic"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check — frontend pings this on load to warm up Cloud Run."""
    return {"status": "ok", "version": "1.0.0", "redis": rdb is not None}


@app.post("/api/generate")
async def generate(body: GenerateRequest, _auth=Depends(verify_api_key)):
    """
    Start a new story generation stream.
    Returns: text/event-stream (SSE)
    Flow: build state → run LangGraph pipeline → stream events to frontend
    """
    # Sketch size guard — reject if >200KB
    if body.user_sketch_b64 and len(body.user_sketch_b64) > 200_000:
        raise HTTPException(400, "Sketch too large. Export at lower quality (max 200KB).")

    if body.pipeline_template not in PIPELINE_TEMPLATES:
        raise HTTPException(400, f"Unknown template: {body.pipeline_template}")

    session_id = str(uuid.uuid4())
    initial_state = make_initial_state(
        prompt=body.prompt,
        session_id=session_id,
        pipeline_template=body.pipeline_template,
        sketch_b64=body.user_sketch_b64,
    )

    return StreamingResponse(
        _run_pipeline(initial_state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Session-Id": session_id,   # Frontend reads this from response headers
        },
    )


@app.post("/api/resume")
async def resume(body: ResumeRequest, _auth=Depends(verify_api_key)):
    """
    Resume a paused HITL session.
    Flow: load state from Redis → update hitl_status → resume LangGraph graph
    """
    if body.action not in ("approve", "edit", "reject"):
        raise HTTPException(400, f"Invalid action: {body.action}")

    state = load_state(body.session_id)

    if body.action == "reject":
        return JSONResponse({"status": "rejected", "session_id": body.session_id})

    state["hitl_status"] = body.action
    if body.action == "edit" and body.user_edits:
        state["user_script_edits"] = body.user_edits
        state["script_draft"] = body.user_edits  # User's edits replace the script

    return StreamingResponse(
        _resume_pipeline(state),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.post("/api/director_cut")
async def director_cut(body: DirectorCutRequest, _auth=Depends(verify_api_key)):
    """
    Surgical regeneration — runs Director node only on specific panels.
    Frontend sends feedback + optional list of panel_ids to regenerate.
    """
    state = load_state(body.session_id)
    state["doctor_feedback"] = body.feedback   # Reuse as Director feedback

    return StreamingResponse(
        _run_director_only(state, panel_ids=body.panel_ids),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.post("/api/branch")
async def branch(body: BranchRequest, _auth=Depends(verify_api_key)):
    """
    Fork an existing story at a panel — creates an alternate universe timeline.
    """
    parent_state = load_state(body.session_id)

    # Guard: can't branch from the last panel
    panel_ids = [p["id"] for p in parent_state.get("panel_plan", [])]
    if not panel_ids or body.branch_point_panel_id == panel_ids[-1]:
        raise HTTPException(400, "Cannot branch from the last panel — no panels remain to regenerate")

    if body.branch_point_panel_id not in panel_ids:
        raise HTTPException(400, f"Panel '{body.branch_point_panel_id}' not found in this session")

    # Deep-copy parent state into branch state
    branch_state: StudioState = {**parent_state}
    branch_id = str(uuid.uuid4())
    branch_state["branch_id"] = branch_id
    branch_state["session_id"] = branch_id      # Branch gets its own session_id
    branch_state["parent_session_id"] = body.session_id
    branch_state["branch_point_panel_id"] = body.branch_point_panel_id
    branch_state["branch_direction"] = body.branch_direction

    # Slice panel_plan: only panels AFTER the branch point
    branch_idx = panel_ids.index(body.branch_point_panel_id)
    branch_state["panel_plan"] = parent_state["panel_plan"][branch_idx + 1:]

    # Reset script state so Screenwriter rewrites from branch point
    branch_state["script_draft"] = ""
    branch_state["hitl_status"] = "approved"   # Skip HITL on branches
    branch_state["max_revisions"] = 1           # Faster loop for branches

    # Cache branch state
    save_state(branch_id, branch_state)
    
    # Firestore: Add branch_id to parent commit
    await update_branch_ids(body.session_id, branch_id)

    return StreamingResponse(
        _run_branch_pipeline(branch_state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Branch-Id": branch_id,
        },
    )


@app.get("/api/stream/{session_id}")
async def stream_reconnect(session_id: str, _auth=Depends(verify_api_key)):
    """
    Reconnect endpoint — replays checkpointed panels if SSE dropped mid-stream.
    """
    if not rdb:
        raise HTTPException(503, "Redis unavailable")

    checkpoints = rdb.hgetall(f"{session_id}:checkpoints")
    if not checkpoints:
        raise HTTPException(404, "No checkpoints found for this session")

    async def replay():
        # Replay in panel order
        for panel_id in sorted(checkpoints.keys()):
            chunk = json.loads(checkpoints[panel_id])
            yield sse(chunk)
        yield sse_done(session_id)

    return StreamingResponse(replay(), media_type="text/event-stream")


# ─── Pipeline Stream Generators ──────────────────────────────────────────────
# These are async generators that yield SSE strings.
# The actual LangGraph graph is imported from graph.py (built next).

async def _run_pipeline(state: StudioState):
    """Main pipeline: all 8 nodes. Pauses at HITL."""
    from graph import get_graph
    graph = get_graph()
    config = {"configurable": {"thread_id": state["session_id"]}}

    try:
        async for event in graph.astream_events(state, config=config, version="v2"):
            chunk = _parse_langgraph_event(event)
            if chunk:
                yield sse(chunk)
    except Exception as e:
        log.error(f"Pipeline error: {e}")
        yield sse_error("pipeline", str(e))


async def _resume_pipeline(state: StudioState):
    """Resume after HITL approval."""
    from graph import get_graph
    graph = get_graph()
    config = {"configurable": {"thread_id": state["session_id"]}}

    try:
        # Update the checkpointed state with HITL decision
        graph.update_state(config, {
            "hitl_status": state["hitl_status"],
            "user_script_edits": state.get("user_script_edits"),
            "script_draft": state.get("script_draft", ""),
        })
        async for event in graph.astream_events(None, config=config, version="v2"):
            chunk = _parse_langgraph_event(event)
            if chunk:
                yield sse(chunk)
    except Exception as e:
        log.error(f"Resume error: {e}")
        yield sse_error("resume", str(e))


async def _run_director_only(state: StudioState, panel_ids: Optional[list] = None):
    """Director's Cut — runs only the director_node."""
    from graph import run_director_node
    try:
        async for chunk in run_director_node(state, panel_ids):
            yield sse(chunk)
        yield sse_done(state["session_id"])
    except Exception as e:
        log.error(f"Director cut error: {e}")
        yield sse_error("director_node", str(e))


async def _run_branch_pipeline(state: StudioState):
    """Branch pipeline: screenwriter → script_doctor → pruner → director."""
    from graph import get_branch_graph
    graph = get_branch_graph()
    config = {"configurable": {"thread_id": state["session_id"]}}

    try:
        async for event in graph.astream_events(state, config=config, version="v2"):
            chunk = _parse_langgraph_event(event)
            if chunk:
                # Tag all events with branch_id so frontend routes to right column
                chunk["branch_id"] = state["branch_id"]
                yield sse(chunk)
    except Exception as e:
        log.error(f"Branch pipeline error: {e}")
        yield sse_error("branch_pipeline", str(e))


def _parse_langgraph_event(event: dict) -> Optional[dict]:
    """
    Parse a raw LangGraph astream_events event into our SSE chunk format.
    Returns None for events we don't want to forward to the frontend.
    """
    kind = event.get("event", "")

    # Custom events emitted by nodes via astream_events
    if kind == "on_custom_event":
        return event.get("data", {})

    # Chain / node completions for meta tracking
    if kind in ("on_chain_end", "on_tool_end"):
        name = event.get("name", "")
        output = event.get("data", {}).get("output", {})
        
        # If screenwriter finished, stream the script draft (useful for branches)
        if name == "screenwriter_node" and isinstance(output, dict) and "script_draft" in output:
            return {
                "type": "script",
                "content": output["script_draft"],
                "node": name
            }

        return {
            "type": SSE_META,
            "node": name,
            "status": "complete",
            "duration_ms": 0,
            "content": f"{name} complete",
        }

    return None
