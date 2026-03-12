"""
Cloud Storage service — upload panel images and return CDN URLs.
Images stored at: gs://{GCS_BUCKET}/{session_id}/{panel_id}.jpg
"""
import logging
from config import GCS_BUCKET

log = logging.getLogger("lotus.storage")

_storage_client = None
_bucket = None


def _get_bucket():
    global _storage_client, _bucket
    if _bucket is None:
        try:
            from google.cloud import storage
            _storage_client = storage.Client()
            _bucket = _storage_client.bucket(GCS_BUCKET)
            log.info(f"Cloud Storage connected to bucket: {GCS_BUCKET}")
        except Exception as e:
            log.warning(f"Cloud Storage unavailable: {e} — images will use placeholder URLs")
    return _bucket


async def upload_panel_image(session_id: str, panel_id: str, image_bytes: bytes) -> str:
    """
    Upload a panel image to Cloud Storage.
    Returns the public CDN URL — stored in Firestore instead of Base64.
    This avoids the Firestore 1MB document size limit (BUG FIX).
    """
    bucket = _get_bucket()
    if bucket is None:
        log.warning(f"Storage unavailable — returning placeholder for {panel_id}")
        return f"/placeholder/{session_id}/{panel_id}"

    try:
        blob_name = f"{session_id}/{panel_id}.jpg"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(image_bytes, content_type="image/jpeg")
        blob.make_public()
        url = blob.public_url
        log.info(f"Uploaded panel image: {url}")
        return url
    except Exception as e:
        log.error(f"Failed to upload {panel_id}: {e}")
        return f"/placeholder/{session_id}/{panel_id}"


async def upload_panel_audio(session_id: str, panel_id: str, audio_bytes: bytes) -> str:
    """
    Upload a panel narration audio file to Cloud Storage.
    """
    bucket = _get_bucket()
    if bucket is None:
        return ""

    try:
        blob_name = f"{session_id}/{panel_id}.mp3"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(audio_bytes, content_type="audio/mpeg")
        blob.make_public()
        url = blob.public_url
        log.info(f"Uploaded panel audio: {url}")
        return url
    except Exception as e:
        log.error(f"Failed to upload audio {panel_id}: {e}")
        return ""
