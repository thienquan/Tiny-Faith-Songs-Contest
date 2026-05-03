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
"""

from __future__ import annotations

import datetime as _dt
import logging
import os
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, Request, UploadFile, File
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


@router.post("/register")
async def register_entry(request: Request):
    """Multipart endpoint that handles streaming upload of up to 6 videos and / or links."""

    # Parse multipart form manually to keep stream behaviour for files
    form = await request.form()

    child_name = (form.get("child_name") or "").strip()
    parent_name = (form.get("parent_name") or "").strip()
    parent_email = (form.get("parent_email") or "").strip()
    consent = (form.get("consent") or "").strip().lower()
    locale = (form.get("locale") or "vi").strip().lower()

    # ---------- Validation ----------
    if not child_name:
        raise HTTPException(status_code=400, detail="child_name is required")
    if not parent_name:
        raise HTTPException(status_code=400, detail="parent_name is required")
    if not parent_email or not _EMAIL_RE.match(parent_email):
        raise HTTPException(status_code=400, detail="parent_email is invalid")
    if consent not in ("true", "1", "yes", "on"):
        raise HTTPException(status_code=400, detail="consent is required")

    # Collect songs and validate at least one provided
    song_inputs = []  # list of dicts: {idx, mode, file?, link?}
    for i in range(1, TOTAL_SONGS + 1):
        mode = (form.get(f"song_{i}_mode") or "upload").strip().lower()
        if mode not in ("upload", "link"):
            mode = "upload"
        raw_value = form.get(f"song_{i}_file") if mode == "upload" else None
        link_value = (form.get(f"song_{i}_link") or "").strip() if mode == "link" else ""

        # `form.get()` returns either a Starlette UploadFile (when the part had
        # a filename) or `str` (text part). FastAPI's UploadFile is a different
        # wrapper class in modern FastAPI, so we check for Starlette's class
        # OR duck-type via `filename` attribute.
        is_file = isinstance(raw_value, (UploadFile, StarletteUploadFile)) or hasattr(raw_value, "filename")
        upload_file = raw_value if (mode == "upload" and is_file) else None

        song_inputs.append(
            {
                "idx": i,
                "mode": mode,
                "file": upload_file,
                "link": link_value if mode == "link" else "",
            }
        )

    provided = [s for s in song_inputs if (s["file"] is not None) or (s["link"] != "")]
    if not provided:
        raise HTTPException(status_code=400, detail="At least one song must be submitted")

    # Validate links
    for s in song_inputs:
        if s["mode"] == "link" and s["link"] and not _is_accepted_link(s["link"]):
            raise HTTPException(
                status_code=400,
                detail=f"Song {s['idx']} link is invalid (must be YouTube or Google Drive)",
            )

    # ---------- Build Drive folder ----------
    request_id = str(uuid.uuid4())[:8]
    logger.info(
        "[register %s] start child=%s parent=%s email=%s songs=%d",
        request_id,
        child_name,
        parent_name,
        parent_email,
        len(provided),
    )

    try:
        drive = build_drive_service()
    except Exception as e:
        logger.exception("Failed to build Drive service")
        raise HTTPException(status_code=500, detail=f"Drive auth failed: {e}")

    # Folder name: "[Child Name] - [Parent Name]" (with timestamp to keep uniqueness)
    timestamp = _dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    folder_name = f"{_safe_name_part(child_name)} - {_safe_name_part(parent_name)} ({timestamp})"
    parent_folder_id = get_shared_drive_folder_id()

    try:
        folder = create_subfolder(drive, folder_name, parent_id=parent_folder_id)
    except Exception as e:
        logger.exception("Folder creation failed")
        raise HTTPException(status_code=502, detail=f"Could not create Drive folder: {e}")

    folder_id = folder["id"]
    folder_url = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"

    # ---------- Process each song ----------
    song_results = []
    for s in song_inputs:
        i = s["idx"]
        result = {"song": i, "type": "skipped"}
        try:
            if s["mode"] == "upload" and s["file"] is not None:
                upload: UploadFile = s["file"]
                # Determine a clean filename
                original = upload.filename or f"song_{i}.mp4"
                safe = _safe_name_part(original, max_len=120) or f"song_{i}.mp4"
                target_name = f"Song_{i:02d}_{safe}"
                mime = upload.content_type or "video/mp4"

                # Stream the SpooledTemporaryFile directly into Drive
                file_obj = upload.file
                try:
                    file_obj.seek(0)
                except Exception:
                    pass

                # Soft size pre-check (only if we can find size cheaply)
                # FastAPI does not provide size directly; we rely on chunked upload.
                drive_file = stream_upload_to_folder(
                    drive,
                    folder_id=folder_id,
                    name=target_name,
                    file_obj=file_obj,
                    mime_type=mime,
                )
                result.update(
                    {
                        "type": "upload",
                        "file_id": drive_file.get("id"),
                        "file_name": target_name,
                        "file_link": drive_file.get("webViewLink"),
                        "size": drive_file.get("size"),
                    }
                )
            elif s["mode"] == "link" and s["link"]:
                doc_name = f"Song_{i:02d}_link"
                doc = create_link_doc(
                    drive,
                    folder_id=folder_id,
                    doc_name=doc_name,
                    link_url=s["link"],
                    header_text=f"Tiny Faith Songs — Song {i} link",
                )
                result.update(
                    {
                        "type": "link",
                        "submitted_link": s["link"],
                        "doc_id": doc.get("id"),
                        "doc_link": doc.get("webViewLink"),
                        "doc_name": doc_name,
                    }
                )
            else:
                # No content for this song
                result["type"] = "skipped"
        except Exception as e:
            logger.exception("[register %s] song %d failed: %s", request_id, i, e)
            result.update({"type": "error", "error": str(e)})
        finally:
            song_results.append(result)
            # Always close UploadFile handle if we opened it
            try:
                if s.get("file") is not None:
                    await s["file"].close()
            except Exception:
                pass

    successful = [r for r in song_results if r["type"] in ("upload", "link")]
    failed = [r for r in song_results if r["type"] == "error"]

    # ---------- Send email notification ----------
    email_status = {"sent": False}
    try:
        subject, html, plain = render_registration_email(
            {
                "child_name": child_name,
                "parent_name": parent_name,
                "parent_email": parent_email,
                "folder_url": folder_url,
                "folder_name": folder_name,
                "song_results": song_results,
            },
            locale=locale,
        )
        send_html_email(
            subject=subject,
            html_body=html,
            plain_text=plain,
            to_email=admin_email(),
        )
        email_status = {"sent": True, "to": admin_email()}
    except Exception as e:
        logger.exception("[register %s] email send failed", request_id)
        email_status = {"sent": False, "error": str(e)}

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
