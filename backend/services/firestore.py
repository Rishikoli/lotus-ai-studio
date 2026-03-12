"""
Firestore service — save and retrieve story commits.
Collection: /commits/{session_id}
Auth: no Firebase Auth — uses demo_user for hackathon.
"""
import logging
from config import FIRESTORE_DEMO_USER

log = logging.getLogger("lotus.firestore")

_db = None


def _get_db():
    global _db
    if _db is None:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
            if not firebase_admin._apps:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
            _db = firestore.client()
            log.info("Firestore connected ✓")
        except Exception as e:
            log.warning(f"Firestore unavailable: {e} — story commits will not be persisted")
    return _db


async def save_script_draft(session_id: str, state: dict):
    """
    Save Point 1 — called after HITL approval.
    Creates the commit document with status='draft'.
    """
    db = _get_db()
    if db is None:
        return

    try:
        from google.cloud.firestore import SERVER_TIMESTAMP
        db.collection("commits").document(session_id).set({
            "user_id":            state.get("user_id", FIRESTORE_DEMO_USER),
            "prompt":             state.get("user_prompt", ""),
            "pipeline_template":  state.get("pipeline_template", "default"),
            "script_draft":       state.get("script_draft", ""),
            "panel_plan":         state.get("panel_plan", []),
            "panels":             [],           # Populated at Save Point 2
            "parent_id":          state.get("parent_session_id"),
            "branch_ids":         [],
            "tags":               [],
            "status":             "draft",
            "created_at":         SERVER_TIMESTAMP,
        })
        log.info(f"Firestore Save Point 1: commit {session_id} saved as draft")
    except Exception as e:
        log.error(f"Firestore save_script_draft failed: {e}")


async def finalize_story_commit(session_id: str, panels: list):
    """
    Save Point 2 — called after all panels complete.
    Updates the commit with panel CDN URLs and sets status='complete'.
    """
    db = _get_db()
    if db is None:
        return

    try:
        db.collection("commits").document(session_id).update({
            "panels": panels,    # [{panel_id, image_url, narration, physics, emotion}]
            "status": "complete",
        })
        log.info(f"Firestore Save Point 2: commit {session_id} finalized")
    except Exception as e:
        log.error(f"Firestore finalize_story_commit failed: {e}")


async def update_branch_ids(parent_session_id: str, branch_id: str):
    """Add branch_id to parent commit's branch_ids array."""
    db = _get_db()
    if db is None:
        return

    try:
        from google.cloud.firestore import ArrayUnion
        db.collection("commits").document(parent_session_id).update({
            "branch_ids": ArrayUnion([branch_id])
        })
    except Exception as e:
        log.error(f"Firestore update_branch_ids failed: {e}")


async def get_gallery():
    """Fetch all commits for demo_user, ordered by created_at desc."""
    db = _get_db()
    if db is None:
        return []

    try:
        docs = (
            db.collection("commits")
            .where("user_id", "==", FIRESTORE_DEMO_USER)
            .order_by("created_at", direction="DESCENDING")
            .limit(50)
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        log.error(f"Firestore get_gallery failed: {e}")
        return []


# ─── Multiverse Ledger ────────────────────────────────────────────────────────

async def search_multiverse_lore(query_keywords: list[str]):
    """
    Historian Node Service: Search for entities in the multiverse ledger.
    Matches against 'name' or 'aliases' tags.
    """
    db = _get_db()
    if db is None:
        return []

    results = []
    try:
        # Note: Firestore doesn't support easy multi-OR across fields without complicated queries.
        # For this hackathon, we'll do a simple 'name' search or 'tags' array-contains.
        for kw in query_keywords:
            # Case-insensitive-ish: we assume lowercase in ledger
            docs = db.collection("multiverse_ledger").where("name", "==", kw.lower()).stream()
            for doc in docs:
                results.append(doc.to_dict())
            
            # Also check tags
            tag_docs = db.collection("multiverse_ledger").where("tags", "array_contains", kw.lower()).stream()
            for doc in tag_docs:
                results.append(doc.to_dict())
                
        # Deduplicate by name
        seen = set()
        unique_results = []
        for r in results:
            if r["name"] not in seen:
                unique_results.append(r)
                seen.add(r["name"])
        return unique_results
    except Exception as e:
        log.error(f"Firestore search_multiverse_lore failed: {e}")
        return []


async def commit_to_multiverse(entities: list[dict]):
    """
    Archivist Node Service: Upsert entities into the multiverse ledger.
    Entities: [{name, lore_summary, tags, status, session_id}]
    """
    db = _get_db()
    if db is None:
        return

    try:
        batch = db.batch()
        for ent in entities:
            name_id = ent["name"].lower().replace(" ", "_")
            doc_ref = db.collection("multiverse_ledger").document(name_id)
            
            # Merge logic: if exists, update summary, add tags
            # For hackathon simplicity, we just set (overwrite or create)
            batch.set(doc_ref, {
                **ent,
                "name": ent["name"].lower(), 
                "tags": [t.lower() for t in ent.get("tags", [])]
            }, merge=True)
            
        batch.commit()
        log.info(f"Firestore Archivist: committed {len(entities)} entities to Lore Ledger")
    except Exception as e:
        log.error(f"Firestore commit_to_multiverse failed: {e}")
