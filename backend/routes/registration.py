"""
Registration API for the Tiny Faith Songs Bible Song Contest.

Receives multipart/form-data with:
  - child_name (str)
  - parent_name (str)
  - parent_email (str)
  - consent (str: 'true')
  - locale (optional, 'vi' | 'en')
  - For each song i in 1..6:
      - song_{i}_mode = 'upload' | 'link'
      - song_{i}_file (UploadFile)        when mode='upload'
      - song_{i}_link (str)               when mode='link'

Flow:
  1) Validate inputs.
  2) Build Drive service (Service Account).
  3) Create subfolder "<Child> - <Parent>" inside Shared Drive (supportsAllDrives=True).
  4) For each provided song: stream-upload OR create Google Docs link file.
  5) Send notification email via SMTP.
  6) Return JSON with folder URL + per-song results.

The FastAPI UploadFile uses a SpooledTemporaryFile underneath, so reading from
`upload_file.file` and feeding it to MediaIoBaseUpload (resumable=True, 1MB
chunks) means we never keep the full file in RAM.

This module is intentionally split into small private helpers to keep the
top-level handler short and easy to test.
"""

from __future__ import annotations

import datetime as _dt
import logging
import os
import re
import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from starlette.datastructures import UploadFile as StarletteUploadFile

from services.drive import (
    build_drive_service,
    create_link_doc,
    create_subfolder,
    get_shared_drive_folder_id,
    stream_upload_to_folder,
)
from services.email_service import admin_email, render_registration_email, send_html_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["registration"])

MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024  # 2GB
TOTAL_SONGS = 6
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_LINK_HOST_HINTS = (
    "youtube.com",
    "youtu.be",
    "drive.google.com",
    "docs.google.com",
)


# ---------------------------------------------------------------------------
# Input parsing & validation helpers
# ---------------------------------------------------------------------------

def _safe_name_part(s: str, max_len: int = 60) -> str:
    s = (s or "").strip()
    s = re.sub(r"[\\/\:\*\?\"<>\|]+", "_", s)
    s = re.sub(r"\s+", " ", s)
    return s[:max_len]


def _is_accepted_link(value: str) -> bool:
    if not value or not isinstance(value, str):
        return False
    v = value.strip().lower()
    if not (v.startswith("http://") or v.startswith("https://")):
        return False
    return any(h in v for h in _LINK_HOST_HINTS)


def _looks_like_upload_file(value: Any) -> bool:
    """form.get() returns a Starlette UploadFile (or FastAPI's wrapper).
    Accept both, plus duck-type via .filename for safety.
    """
    return isinstance(value, (UploadFile, StarletteUploadFile)) or hasattr(value, "filename")


def _validate_contact_fields(form) -> dict:
    """Validate the parent/child/email/consent block. Raises HTTPException on error."""
    child_name = (form.get("child_name") or "").strip()
    parent_name = (form.get("parent_name") or "").strip()
    parent_email = (form.get("parent_email") or "").strip()
    consent = (form.get("consent") or "").strip().lower()
    locale = (form.get("locale") or "vi").strip().lower()

    if not child_name:
        raise HTTPException(status_code=400, detail="child_name is required")
    if not parent_name:
        raise HTTPException(status_code=400, detail="parent_name is required")
    if not parent_email or not _EMAIL_RE.match(parent_email):
        raise HTTPException(status_code=400, detail="parent_email is invalid")
    if consent not in ("true", "1", "yes", "on"):
        raise HTTPException(status_code=400, detail="consent is required")

    return {
        "child_name": child_name,
        "parent_name": parent_name,
        "parent_email": parent_email,
        "locale": locale,
    }


def _collect_song_inputs(form) -> list[dict]:
    """Pull the 6 (mode, file, link) tuples out of the parsed multipart form."""
    songs: list[dict] = []
    for i in range(1, TOTAL_SONGS + 1):
        mode = (form.get(f"song_{i}_mode") or "upload").strip().lower()
        if mode not in ("upload", "link"):
            mode = "upload"

        raw_value = form.get(f"song_{i}_file") if mode == "upload" else None
        link_value = (form.get(f"song_{i}_link") or "").strip() if mode == "link" else ""

        is_file = _looks_like_upload_file(raw_value) if mode == "upload" else False
        upload_file = raw_value if (mode == "upload" and is_file) else None

        songs.append(
            {
                "idx": i,
                "mode": mode,
                "file": upload_file,
                "link": link_value if mode == "link" else "",
            }
        )
    return songs


def _validate_song_inputs(song_inputs: list[dict]) -> None:
    """Ensures at least one song was provided and all link values are valid."""
    provided = [
        s for s in song_inputs if (s["file"] is not None) or (s["link"] != "")
    ]
    if not provided:
        raise HTTPException(status_code=400, detail="At least one song must be submitted")

    for s in song_inputs:
        if s["mode"] == "link" and s["link"] and not _is_accepted_link(s["link"]):
            raise HTTPException(
                status_code=400,
                detail=f"Song {s['idx']} link is invalid (must be YouTube or Google Drive)",
            )


def _build_folder_name(child_name: str, parent_name: str) -> str:
    timestamp = _dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"{_safe_name_part(child_name)} - {_safe_name_part(parent_name)} ({timestamp})"


# ---------------------------------------------------------------------------
# Per-song processors (Drive upload / link doc)
# ---------------------------------------------------------------------------

def _process_upload_song(drive, folder_id: str, song: dict) -> dict:
    upload: UploadFile = song["file"]
    original = upload.filename or f"song_{song['idx']}.mp4"
    safe = _safe_name_part(original, max_len=120) or f"song_{song['idx']}.mp4"
    target_name = f"Song_{song['idx']:02d}_{safe}"
    mime = upload.content_type or "video/mp4"

    file_obj = upload.file
    try:
        file_obj.seek(0)
    except Exception:
        pass

    drive_file = stream_upload_to_folder(
        drive,
        folder_id=folder_id,
        name=target_name,
        file_obj=file_obj,
        mime_type=mime,
    )
    return {
        "song": song["idx"],
        "type": "upload",
        "file_id": drive_file.get("id"),
        "file_name": target_name,
        "file_link": drive_file.get("webViewLink"),
        "size": drive_file.get("size"),
    }


def _process_link_song(drive, folder_id: str, song: dict) -> dict:
    doc_name = f"Song_{song['idx']:02d}_link"
    doc = create_link_doc(
        drive,
        folder_id=folder_id,
        doc_name=doc_name,
        link_url=song["link"],
        header_text=f"Tiny Faith Songs — Song {song['idx']} link",
    )
    return {
        "song": song["idx"],
        "type": "link",
        "submitted_link": song["link"],
        "doc_id": doc.get("id"),
        "doc_link": doc.get("webViewLink"),
        "doc_name": doc_name,
    }


async def _process_song_inputs(drive, folder_id: str, song_inputs: list[dict], request_id: str) -> list[dict]:
    """Process all songs in order, collecting per-song results.

    Always closes UploadFile handles. Per-song failures are recorded but do not
    abort processing of subsequent songs — we want a partial success rather
    than losing everything to one transient API blip.
    """
    results: list[dict] = []
    for song in song_inputs:
        i = song["idx"]
        result: dict = {"song": i, "type": "skipped"}
        try:
            if song["mode"] == "upload" and song["file"] is not None:
                result = _process_upload_song(drive, folder_id, song)
            elif song["mode"] == "link" and song["link"]:
                result = _process_link_song(drive, folder_id, song)
        except Exception as exc:
            logger.exception("[register %s] song %d failed: %s", request_id, i, exc)
            result = {"song": i, "type": "error", "error": str(exc)}
        finally:
            results.append(result)
            await _close_upload_handle(song)
    return results


async def _close_upload_handle(song: dict) -> None:
    if song.get("file") is None:
        return
    try:
        await song["file"].close()
    except Exception:
        # Best-effort: handle may already be closed by stream consumer.
        pass


# ---------------------------------------------------------------------------
# Email notification
# ---------------------------------------------------------------------------

def _send_registration_email(payload: dict, locale: str) -> dict:
    try:
        subject, html, plain = render_registration_email(payload, locale=locale)
        send_html_email(
            subject=subject,
            html_body=html,
            plain_text=plain,
            to_email=admin_email(),
        )
        return {"sent": True, "to": admin_email()}
    except Exception as exc:
        logger.exception("registration email send failed")
        return {"sent": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# HTTP handlers
# ---------------------------------------------------------------------------

@router.post("/register")
async def register_entry(request: Request):
    """Multipart endpoint that handles streaming upload of up to 6 videos and / or links."""

    form = await request.form()

    contact = _validate_contact_fields(form)
    song_inputs = _collect_song_inputs(form)
    _validate_song_inputs(song_inputs)

    request_id = str(uuid.uuid4())[:8]
    logger.info(
        "[register %s] start child=%s parent=%s email=%s",
        request_id,
        contact["child_name"],
        contact["parent_name"],
        contact["parent_email"],
    )

    try:
        drive = build_drive_service()
    except Exception as exc:
        logger.exception("Failed to build Drive service")
        raise HTTPException(status_code=500, detail=f"Drive auth failed: {exc}")

    folder_name = _build_folder_name(contact["child_name"], contact["parent_name"])
    parent_folder_id = get_shared_drive_folder_id()

    try:
        folder = create_subfolder(drive, folder_name, parent_id=parent_folder_id)
    except Exception as exc:
        logger.exception("Folder creation failed")
        raise HTTPException(status_code=502, detail=f"Could not create Drive folder: {exc}")

    folder_id = folder["id"]
    folder_url = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"

    song_results = await _process_song_inputs(drive, folder_id, song_inputs, request_id)

    successful = [r for r in song_results if r["type"] in ("upload", "link")]
    failed = [r for r in song_results if r["type"] == "error"]

    email_status = _send_registration_email(
        {
            "child_name": contact["child_name"],
            "parent_name": contact["parent_name"],
            "parent_email": contact["parent_email"],
            "folder_url": folder_url,
            "folder_name": folder_name,
            "song_results": song_results,
        },
        locale=contact["locale"],
    )

    logger.info(
        "[register %s] done folder=%s ok=%d failed=%d email=%s",
        request_id,
        folder_id,
        len(successful),
        len(failed),
        email_status.get("sent"),
    )

    return JSONResponse(
        {
            "success": True,
            "request_id": request_id,
            "folder_id": folder_id,
            "folder_url": folder_url,
            "folder_name": folder_name,
            "song_results": song_results,
            "successful_count": len(successful),
            "failed_count": len(failed),
            "email": email_status,
        }
    )


@router.get("/health")
async def health():
    """Lightweight health check used by deployments and the testing agent."""
    sa_path = os.environ.get(
        "GOOGLE_SERVICE_ACCOUNT_JSON",
        "/app/credentials/tiny-faith-songs-contest-873c0e89fa85.json",
    )
    return {
        "ok": True,
        "service_account_present": os.path.exists(sa_path),
        "folder_id": get_shared_drive_folder_id(),
        "smtp_host": os.environ.get("SMTP_HOST", "mail.kinhthanhgotay.com"),
        "admin_email": admin_email(),
    }
