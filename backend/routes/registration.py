"""
Registration API for the Tiny Faith Songs Bible Song Contest.

Phone-keyed multi-session flow
------------------------------

Parents may submit anywhere from 1 to 6 song videos in a single request.
Phone number is the user's identifier — a parent can come back later, type
the same phone, and add more songs. Each request:

1. Validates contact fields (child name, parent name, email, phone, consent).
2. Searches the Shared Drive for an existing subfolder whose name contains
   the normalized phone (using ``drive.files().list`` with ``q``,
   ``supportsAllDrives=True`` and ``includeItemsFromAllDrives=True``).
3. If a folder exists → reuse its ID; otherwise → create a new folder named
   ``[phone] - [child] - [parent]`` inside the Shared Drive root folder.
4. Stream-uploads each provided video (resumable, 1 MB chunks → no full-file
   RAM buffering) or creates a Google Docs file for each pasted link.
5. Sends an HTML email summarising what was added in this session — the
   subject line marks first-time vs update submissions.

Multipart/form-data fields received:
  - child_name (str)
  - parent_name (str)
  - parent_email (str)
  - phone (str)
  - consent (str: 'true')
  - locale (optional, 'vi' | 'en')
  - For each song i in 1..6:
      - song_{i}_mode = 'upload' | 'link'
      - song_{i}_file (UploadFile)        when mode='upload'
      - song_{i}_link (str)               when mode='link'

The handler returns JSON containing the (possibly reused) folder URL plus
per-song results so the frontend can show a tailored success message.
"""

from __future__ import annotations

import asyncio
import asyncio
import logging
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.datastructures import UploadFile as StarletteUploadFile

from services.drive import (
    build_drive_service,
    create_link_doc,
    create_resumable_upload_session,
    create_subfolder,
    find_file_in_folder_by_name,
    find_folder_by_name_part,
    get_folder_by_id,
    get_shared_drive_folder_id,
    list_uploaded_song_indices,
    stream_upload_to_folder,
)
from services.email_service import (
    admin_email,
    render_registration_email,
    send_html_email,
)
from services.participant_progress import (
    get_participant_progress,
    mark_song_uploaded,
    upsert_participant,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["registration"])

# Drive uploads are blocking I/O — offload to a thread pool so FastAPI's
# async event loop is not blocked while videos are streamed to Google Drive.
_upload_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="drive-upload")

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
# Phone normalization & validation
# ---------------------------------------------------------------------------

def normalize_phone(value: str) -> str:
    """Normalize a phone number to its canonical digit-only form.

    Vietnamese phones may be entered as ``0912345678``, ``+84 912 345 678``
    or ``84 912-345-678``. We strip all non-digit characters, then collapse
    a leading ``+84`` / ``84`` country code to ``0`` so the same physical
    number always maps to the same key.
    """
    if not value:
        return ""
    digits = re.sub(r"\D+", "", value)
    if digits.startswith("84") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits


def _is_valid_vn_phone(normalized: str) -> bool:
    """Vietnamese mobile/landline numbers are 10–11 digits starting with 0
    after normalization. We stay generous (9–12) to support edge cases.
    """
    return bool(normalized) and 9 <= len(normalized) <= 12 and normalized.isdigit()


# ---------------------------------------------------------------------------
# Other validation helpers
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
    """Validate the parent/child/email/phone/consent block."""
    child_name = (form.get("child_name") or "").strip()
    parent_name = (form.get("parent_name") or "").strip()
    parent_email = (form.get("parent_email") or "").strip()
    raw_phone = (form.get("phone") or "").strip()
    consent = (form.get("consent") or "").strip().lower()
    locale = (form.get("locale") or "vi").strip().lower()

    if not child_name:
        raise HTTPException(status_code=400, detail="child_name is required")
    if not parent_name:
        raise HTTPException(status_code=400, detail="parent_name is required")
    if not parent_email or not _EMAIL_RE.match(parent_email):
        raise HTTPException(status_code=400, detail="parent_email is invalid")

    phone = normalize_phone(raw_phone)
    if not _is_valid_vn_phone(phone):
        raise HTTPException(status_code=400, detail="phone is invalid")

    if consent not in ("true", "1", "yes", "on"):
        raise HTTPException(status_code=400, detail="consent is required")

    return {
        "child_name": child_name,
        "parent_name": parent_name,
        "parent_email": parent_email,
        "phone": phone,
        "phone_raw": raw_phone,
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
    """At least one song must be provided in this request, and any link
    values must point to YouTube or Google Drive.
    """
    provided = [s for s in song_inputs if (s["file"] is not None) or (s["link"] != "")]
    if not provided:
        raise HTTPException(status_code=400, detail="At least one song must be submitted")

    for s in song_inputs:
        if s["mode"] == "link" and s["link"] and not _is_accepted_link(s["link"]):
            raise HTTPException(
                status_code=400,
                detail=f"Song {s['idx']} link is invalid (must be YouTube or Google Drive)",
            )


def _build_canonical_folder_name(phone: str, child_name: str, parent_name: str) -> str:
    """`[phone] - [child] - [parent]` with whitespace normalized."""
    return (
        f"{phone} - {_safe_name_part(child_name)} - {_safe_name_part(parent_name)}"
    )


# ---------------------------------------------------------------------------
# Folder resolution (find-or-create)
# ---------------------------------------------------------------------------

def _resolve_target_folder(
    drive,
    phone: str,
    child_name: str,
    parent_name: str,
    parent_folder_id: str,
    existing_folder_id: Optional[str] = None,
) -> tuple[dict, bool]:
    """Look up an existing folder for this phone in the Shared Drive; create
    one if it does not exist.

    Returns ``(folder_dict, created)`` where ``created`` is True if we just
    created the folder, False if we reused an existing one.
    """
    existing = None

    if existing_folder_id:
        existing = get_folder_by_id(drive, existing_folder_id)
        if existing:
            logger.info(
                "Reusing stored folder %s for phone %s",
                existing.get("id"),
                phone,
            )

    if existing is None:
        try:
            existing = find_folder_by_name_part(drive, phone, parent_id=parent_folder_id)
        except Exception as exc:
            logger.exception("Folder lookup failed")
            raise HTTPException(status_code=502, detail=f"Could not search Drive: {exc}")

    if existing:
        logger.info("Reusing existing folder %s for phone %s", existing.get("id"), phone)
        return existing, False

    folder_name = _build_canonical_folder_name(phone, child_name, parent_name)
    try:
        created_folder = create_subfolder(drive, folder_name, parent_id=parent_folder_id)
    except Exception as exc:
        logger.exception("Folder creation failed")
        raise HTTPException(status_code=502, detail=f"Could not create Drive folder: {exc}")
    return created_folder, True


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


async def _process_song_inputs(
    drive,
    folder_id: str,
    song_inputs: list[dict],
    request_id: str,
) -> list[dict]:
    """Process all songs, offloading blocking Drive I/O to a thread pool.

    Always closes UploadFile handles. Per-song failures are recorded but do
    not abort processing of subsequent songs — partial success is preferable
    to losing every song to one transient API error.
    """
    loop = asyncio.get_event_loop()
    results: list[dict] = []
    for song in song_inputs:
        i = song["idx"]
        result: dict = {"song": i, "type": "skipped"}
        try:
            if song["mode"] == "upload" and song["file"] is not None:
                result = await loop.run_in_executor(
                    _upload_executor,
                    _process_upload_song,
                    drive,
                    folder_id,
                    song,
                )
            elif song["mode"] == "link" and song["link"]:
                result = await loop.run_in_executor(
                    _upload_executor,
                    _process_link_song,
                    drive,
                    folder_id,
                    song,
                )
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


def _song_result_to_store_payload(song_result: dict) -> Optional[dict]:
    song_idx = song_result.get("song")
    if not isinstance(song_idx, int):
        return None

    song_type = song_result.get("type")
    if song_type == "upload":
        return {
            "song_idx": song_idx,
            "submission_type": "upload",
            "drive_file_id": song_result.get("file_id"),
            "drive_link": song_result.get("file_link"),
            "display_name": song_result.get("file_name"),
        }
    if song_type == "link":
        return {
            "song_idx": song_idx,
            "submission_type": "link",
            "drive_file_id": song_result.get("doc_id"),
            "drive_link": song_result.get("doc_link"),
            "display_name": song_result.get("doc_name") or song_result.get("submitted_link"),
        }
    return None


# ---------------------------------------------------------------------------
# HTTP handlers
# ---------------------------------------------------------------------------

@router.post("/register")
async def register_entry(request: Request):
    """Multipart endpoint that accepts 1..6 video / link submissions.

    Phone number is the unique user identifier — repeat submissions with the
    same phone are appended to the existing Drive folder.
    """

    form = await request.form()

    contact = _validate_contact_fields(form)
    song_inputs = _collect_song_inputs(form)
    _validate_song_inputs(song_inputs)

    request_id = str(uuid.uuid4())[:8]
    logger.info(
        "[register %s] start phone=%s child=%s parent=%s email=%s",
        request_id,
        contact["phone"],
        contact["child_name"],
        contact["parent_name"],
        contact["parent_email"],
    )

    try:
        drive = build_drive_service()
    except Exception as exc:
        logger.exception("Failed to build Drive service")
        raise HTTPException(status_code=500, detail=f"Drive auth failed: {exc}")

    existing_progress = get_participant_progress(contact["phone"])
    existing_folder_id = None
    if existing_progress and existing_progress.get("folder_id"):
        existing_folder_id = existing_progress.get("folder_id")

    parent_folder_id = get_shared_drive_folder_id()
    folder, is_new_folder = _resolve_target_folder(
        drive,
        phone=contact["phone"],
        child_name=contact["child_name"],
        parent_name=contact["parent_name"],
        parent_folder_id=parent_folder_id,
        existing_folder_id=existing_folder_id,
    )
    folder_id = folder["id"]
    folder_name = folder.get("name", "")
    folder_url = (
        folder.get("webViewLink")
        or f"https://drive.google.com/drive/folders/{folder_id}"
    )

    upsert_participant(
        phone=contact["phone"],
        child_name=contact["child_name"],
        parent_name=contact["parent_name"],
        parent_email=contact["parent_email"],
        folder_id=folder_id,
        folder_name=folder_name,
        folder_url=folder_url,
    )

    song_results = await _process_song_inputs(drive, folder_id, song_inputs, request_id)

    for song_result in song_results:
        store_payload = _song_result_to_store_payload(song_result)
        if not store_payload:
            continue
        try:
            mark_song_uploaded(
                phone=contact["phone"],
                song_idx=store_payload["song_idx"],
                submission_type=store_payload["submission_type"],
                drive_file_id=store_payload.get("drive_file_id"),
                drive_link=store_payload.get("drive_link"),
                display_name=store_payload.get("display_name"),
            )
        except Exception:
            logger.exception(
                "[register %s] could not persist song status phone=%s song=%s",
                request_id,
                contact["phone"],
                store_payload["song_idx"],
            )

    progress = get_participant_progress(contact["phone"]) or {}

    successful = [r for r in song_results if r["type"] in ("upload", "link")]
    failed = [r for r in song_results if r["type"] == "error"]

    email_status = _send_registration_email(
        {
            "child_name": contact["child_name"],
            "parent_name": contact["parent_name"],
            "parent_email": contact["parent_email"],
            "phone": contact["phone"],
            "phone_raw": contact["phone_raw"],
            "folder_url": folder_url,
            "folder_name": folder_name,
            "song_results": song_results,
            "is_new_folder": is_new_folder,
        },
        locale=contact["locale"],
    )

    logger.info(
        "[register %s] done phone=%s folder=%s new=%s ok=%d failed=%d email=%s",
        request_id,
        contact["phone"],
        folder_id,
        is_new_folder,
        len(successful),
        len(failed),
        email_status.get("sent"),
    )

    return JSONResponse(
        {
            "success": True,
            "request_id": request_id,
            "phone": contact["phone"],
            "folder_id": folder_id,
            "folder_url": folder_url,
            "folder_name": folder_name,
            "is_new_folder": is_new_folder,
            "song_results": song_results,
            "successful_count": len(successful),
            "failed_count": len(failed),
            "uploaded_songs": progress.get("uploaded_songs", []),
            "missing_songs": progress.get("missing_songs", []),
            "video_status": progress.get("video_status", {}),
            "email": email_status,
        }
    )


@router.get("/health")
async def health():
    """Lightweight health check used by deployments and the testing agent."""
    sa_path = os.environ.get(
        "GOOGLE_SERVICE_ACCOUNT_JSON",
        "/app/credentials/tiny-faith-songs-contest-1e944b6e82cb.json",
    )
    return {
        "ok": True,
        "service_account_present": os.path.exists(sa_path),
        "folder_id": get_shared_drive_folder_id(),
        "smtp_host": os.environ.get("SMTP_HOST", "mail.kinhthanhgotay.com"),
        "admin_email": admin_email(),
    }


@router.get("/lookup")
async def lookup_phone(phone: Optional[str] = None):
    """Quick lookup: does this phone already have a folder? Used by the form
    to show a friendly hint ("Welcome back, you've already submitted N songs").
    Returns ``{exists: bool, folder_url?, folder_name?}``.
    """
    if not phone:
        return {"exists": False}
    normalized = normalize_phone(phone)
    if not _is_valid_vn_phone(normalized):
        return {"exists": False, "phone": normalized}

    progress = get_participant_progress(normalized)
    if progress and progress.get("folder_id"):
        return {
            "exists": True,
            "phone": normalized,
            "folder_id": progress.get("folder_id"),
            "folder_name": progress.get("folder_name"),
            "folder_url": progress.get("folder_url"),
            "participant": {
                "child_name": progress.get("child_name", ""),
                "parent_name": progress.get("parent_name", ""),
                "parent_email": progress.get("parent_email", ""),
            },
            "uploaded_songs": progress.get("uploaded_songs", []),
            "missing_songs": progress.get("missing_songs", []),
            "video_status": progress.get("video_status", {}),
            "source": "sqlite",
        }

    try:
        drive = build_drive_service()
        folder = find_folder_by_name_part(drive, normalized)
    except Exception as exc:
        logger.exception("lookup failed")
        return {"exists": False, "error": str(exc), "phone": normalized}

    if not folder:
        return {"exists": False, "phone": normalized}

    folder_id = folder.get("id")
    folder_url = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"
    uploaded_songs = []
    try:
        uploaded_songs = list_uploaded_song_indices(drive, folder_id, total_songs=TOTAL_SONGS)
    except Exception:
        logger.exception("lookup list songs failed phone=%s folder=%s", normalized, folder_id)
    missing_songs = [i for i in range(1, TOTAL_SONGS + 1) if i not in uploaded_songs]
    video_status = {f"video_{idx}_status": "uploaded" for idx in uploaded_songs}

    return {
        "exists": True,
        "phone": normalized,
        "folder_id": folder_id,
        "folder_name": folder.get("name"),
        "folder_url": folder_url,
        "participant": {
            "child_name": "",
            "parent_name": "",
            "parent_email": "",
        },
        "uploaded_songs": uploaded_songs,
        "missing_songs": missing_songs,
        "video_status": video_status,
        "source": "drive",
    }


# ---------------------------------------------------------------------------
# Direct-upload endpoints (browser → Drive)
# ---------------------------------------------------------------------------

class _UploadInitBody(BaseModel):
    phone: str
    child_name: str
    parent_name: str
    parent_email: str
    consent: bool = False
    song_idx: int  # 1-based
    filename: str
    mime_type: str = "video/mp4"
    file_size: int


class _UploadCompleteBody(BaseModel):
    phone: str
    song_idx: int  # 1-based
    file_id: str
    file_name: str
    folder_id: str


class _RegisterLinkBody(BaseModel):
    phone: str
    child_name: str
    parent_name: str
    parent_email: str
    consent: bool = False
    song_idx: int  # 1-based
    link: str


class _UploadConfirmBody(BaseModel):
    phone: str
    song_idx: int  # 1-based
    folder_id: str
    drive_filename: str


@router.post("/upload/init")
async def upload_init(body: _UploadInitBody):
    """Create (or reuse) a Drive participant folder and return a resumable
    upload session URI.  The browser will PUT the video directly to that URI
    without going through this server.
    """
    normalized = normalize_phone(body.phone)
    if not _is_valid_vn_phone(normalized):
        raise HTTPException(status_code=422, detail="Số điện thoại không hợp lệ")

    if not body.child_name.strip():
        raise HTTPException(status_code=422, detail="Thiếu tên bé")
    if not body.parent_name.strip():
        raise HTTPException(status_code=422, detail="Thiếu tên phụ huynh")
    if not body.parent_email.strip() or not _EMAIL_RE.match(body.parent_email):
        raise HTTPException(status_code=422, detail="Email không hợp lệ")
    if not (1 <= body.song_idx <= TOTAL_SONGS):
        raise HTTPException(status_code=422, detail=f"song_idx phải từ 1 đến {TOTAL_SONGS}")
    if body.file_size <= 0 or body.file_size > MAX_FILE_BYTES:
        raise HTTPException(status_code=422, detail="Kích thước file không hợp lệ")

    loop = asyncio.get_event_loop()

    def _init_in_thread():
        drive = build_drive_service()

        # Resolve or create the participant folder
        existing_progress = get_participant_progress(normalized)
        existing_folder_id = existing_progress.get("folder_id") if existing_progress else None

        parent_folder_id = get_shared_drive_folder_id()
        folder, _ = _resolve_target_folder(
            drive,
            phone=normalized,
            child_name=body.child_name.strip(),
            parent_name=body.parent_name.strip(),
            parent_folder_id=parent_folder_id,
            existing_folder_id=existing_folder_id,
        )
        folder_id = folder["id"]
        folder_url = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"

        # Upsert participant metadata into SQLite
        upsert_participant(
            phone=normalized,
            child_name=body.child_name.strip(),
            parent_name=body.parent_name.strip(),
            parent_email=body.parent_email.strip(),
            folder_id=folder_id,
            folder_name=folder.get("name", ""),
            folder_url=folder_url,
        )

        # Song filename prefix: "song_01_<original_filename>"
        safe_idx = str(body.song_idx).zfill(2)
        drive_filename = f"song_{safe_idx}_{body.filename}"

        session_uri = create_resumable_upload_session(
            filename=drive_filename,
            mime_type=body.mime_type or "video/mp4",
            file_size=body.file_size,
            parent_folder_id=folder_id,
        )

        return {
            "session_uri": session_uri,
            "folder_id": folder_id,
            "folder_url": folder_url,
            "song_idx": body.song_idx,
            "drive_filename": drive_filename,
        }

    try:
        result = await loop.run_in_executor(_upload_executor, _init_in_thread)
    except Exception as exc:
        logger.exception("upload/init failed phone=%s song=%d", normalized, body.song_idx)
        raise HTTPException(status_code=500, detail=f"Không thể tạo phiên upload: {exc}")

    return JSONResponse(result)


@router.post("/upload/complete")
async def upload_complete(body: _UploadCompleteBody):
    """Record a completed direct upload in SQLite.
    Called by the browser after the Drive PUT succeeds.
    """
    normalized = normalize_phone(body.phone)
    if not _is_valid_vn_phone(normalized):
        raise HTTPException(status_code=422, detail="Số điện thoại không hợp lệ")
    if not (1 <= body.song_idx <= TOTAL_SONGS):
        raise HTTPException(status_code=422, detail=f"song_idx phải từ 1 đến {TOTAL_SONGS}")

    drive_link = f"https://drive.google.com/file/d/{body.file_id}/view" if body.file_id else None

    try:
        mark_song_uploaded(
            phone=normalized,
            song_idx=body.song_idx,
            submission_type="direct_upload",
            drive_file_id=body.file_id,
            drive_link=drive_link,
            display_name=body.file_name,
        )
    except Exception as exc:
        logger.exception("upload/complete persist failed phone=%s song=%d", normalized, body.song_idx)
        raise HTTPException(status_code=500, detail=f"Không thể lưu trạng thái: {exc}")

    progress = get_participant_progress(normalized) or {}
    logger.info(
        "upload/complete phone=%s song=%d file_id=%s",
        normalized, body.song_idx, body.file_id,
    )

    return JSONResponse({
        "success": True,
        "phone": normalized,
        "song_idx": body.song_idx,
        "uploaded_songs": progress.get("uploaded_songs", []),
        "missing_songs": progress.get("missing_songs", []),
    })


@router.post("/upload/confirm")
async def upload_confirm(body: _UploadConfirmBody):
    """Confirm a direct upload by looking up the expected file in Drive.

    Used as a fallback when browser gets blocked by CORS reading the upload
    response from Google, even though file bytes may have uploaded.
    """
    normalized = normalize_phone(body.phone)
    if not _is_valid_vn_phone(normalized):
        raise HTTPException(status_code=422, detail="Số điện thoại không hợp lệ")
    if not (1 <= body.song_idx <= TOTAL_SONGS):
        raise HTTPException(status_code=422, detail=f"song_idx phải từ 1 đến {TOTAL_SONGS}")
    if not body.folder_id.strip() or not body.drive_filename.strip():
        raise HTTPException(status_code=422, detail="Thiếu folder_id hoặc drive_filename")

    loop = asyncio.get_event_loop()

    def _confirm_in_thread():
        drive = build_drive_service()
        return find_file_in_folder_by_name(
            drive,
            folder_id=body.folder_id.strip(),
            file_name=body.drive_filename.strip(),
        )

    try:
        found_file = await loop.run_in_executor(_upload_executor, _confirm_in_thread)
    except Exception as exc:
        logger.exception(
            "upload/confirm drive lookup failed phone=%s song=%d",
            normalized,
            body.song_idx,
        )
        raise HTTPException(status_code=500, detail=f"Không thể xác nhận file trên Drive: {exc}")

    if not found_file:
        return JSONResponse(
            {
                "success": False,
                "confirmed": False,
                "phone": normalized,
                "song_idx": body.song_idx,
                "message": "Chưa tìm thấy file trên Drive",
            },
            status_code=404,
        )

    file_id = found_file.get("id")
    drive_link = found_file.get("webViewLink") or (
        f"https://drive.google.com/file/d/{file_id}/view" if file_id else None
    )

    try:
        mark_song_uploaded(
            phone=normalized,
            song_idx=body.song_idx,
            submission_type="direct_upload",
            drive_file_id=file_id,
            drive_link=drive_link,
            display_name=found_file.get("name") or body.drive_filename,
        )
    except Exception as exc:
        logger.exception("upload/confirm persist failed phone=%s song=%d", normalized, body.song_idx)
        raise HTTPException(status_code=500, detail=f"Không thể lưu trạng thái: {exc}")

    progress = get_participant_progress(normalized) or {}
    logger.info(
        "upload/confirm success phone=%s song=%d file_id=%s",
        normalized,
        body.song_idx,
        file_id,
    )

    return JSONResponse(
        {
            "success": True,
            "confirmed": True,
            "phone": normalized,
            "song_idx": body.song_idx,
            "file_id": file_id,
            "file_name": found_file.get("name"),
            "uploaded_songs": progress.get("uploaded_songs", []),
            "missing_songs": progress.get("missing_songs", []),
        }
    )


@router.post("/upload/direct")
async def upload_direct(
    phone: str = Form(...),
    child_name: str = Form(...),
    parent_name: str = Form(...),
    parent_email: str = Form(...),
    consent: bool = Form(...),
    song_idx: int = Form(...),
    file: UploadFile = File(...),
):
    """Simple direct upload: browser POST file to backend (CORS-safe),
    backend uploads to Drive via resumable session.
    
    Form fields:
      - phone (str)
      - child_name (str)
      - parent_name (str)
      - parent_email (str)
      - consent (bool)
      - song_idx (int, 1-6)
      - file (UploadFile)
    
    Returns: {success, file_id, drive_filename, uploaded_songs, missing_songs, folder_id, folder_url}
    """
    # Validate inputs
    normalized = normalize_phone(phone)
    if not _is_valid_vn_phone(normalized):
        raise HTTPException(status_code=422, detail="Số điện thoại không hợp lệ")
    if not child_name or not child_name.strip():
        raise HTTPException(status_code=422, detail="Thiếu tên bé")
    if not parent_name or not parent_name.strip():
        raise HTTPException(status_code=422, detail="Thiếu tên phụ huynh")
    if not parent_email or not parent_email.strip() or not _EMAIL_RE.match(parent_email):
        raise HTTPException(status_code=422, detail="Email không hợp lệ")
    if not (1 <= song_idx <= TOTAL_SONGS):
        raise HTTPException(status_code=422, detail=f"song_idx phải từ 1 đến {TOTAL_SONGS}")
    if not file:
        raise HTTPException(status_code=422, detail="Thiếu file")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size <= 0 or file_size > MAX_FILE_BYTES:
        raise HTTPException(status_code=422, detail="Kích thước file không hợp lệ")

    loop = asyncio.get_event_loop()

    def _upload_in_thread():
        drive = build_drive_service()

        # Resolve or create participant folder
        existing_progress = get_participant_progress(normalized)
        existing_folder_id = existing_progress.get("folder_id") if existing_progress else None

        parent_folder_id = get_shared_drive_folder_id()
        folder, _ = _resolve_target_folder(
            drive,
            phone=normalized,
            child_name=child_name.strip(),
            parent_name=parent_name.strip(),
            parent_folder_id=parent_folder_id,
            existing_folder_id=existing_folder_id,
        )
        folder_id = folder["id"]
        folder_url = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"

        # Upsert participant metadata
        upsert_participant(
            phone=normalized,
            child_name=child_name.strip(),
            parent_name=parent_name.strip(),
            parent_email=parent_email.strip(),
            folder_id=folder_id,
            folder_name=folder.get("name", ""),
            folder_url=folder_url,
        )

        # Create Drive filename with prefix
        safe_idx = str(song_idx).zfill(2)
        drive_filename = f"song_{safe_idx}_{file.filename}"

        # Stream upload file bytes to Drive
        from io import BytesIO
        
        file_stream = BytesIO(file_bytes)
        upload_result = stream_upload_to_folder(
            drive=drive,
            folder_id=folder_id,
            name=drive_filename,
            file_obj=file_stream,
            mime_type=file.content_type or "video/mp4",
        )

        file_id = upload_result.get("id", "")
        drive_link = upload_result.get("webViewLink") or (
            f"https://drive.google.com/file/d/{file_id}/view" if file_id else None
        )

        # Persist metadata
        mark_song_uploaded(
            phone=normalized,
            song_idx=song_idx,
            submission_type="direct_upload",
            drive_file_id=file_id,
            drive_link=drive_link,
            display_name=drive_filename,
        )

        progress = get_participant_progress(normalized) or {}
        logger.info(
            "upload/direct success phone=%s song=%d file_id=%s",
            normalized,
            song_idx,
            file_id,
        )

        return {
            "success": True,
            "file_id": file_id,
            "drive_filename": drive_filename,
            "folder_id": folder_id,
            "folder_url": folder_url,
            "uploaded_songs": progress.get("uploaded_songs", []),
            "missing_songs": progress.get("missing_songs", []),
        }

    try:
        result = await loop.run_in_executor(_upload_executor, _upload_in_thread)
    except Exception as exc:
        logger.exception("upload/direct failed phone=%s song=%d", normalized, song_idx)
        raise HTTPException(status_code=500, detail=f"Lỗi tải lên: {exc}")

    return JSONResponse(result)


@router.post("/register/link")
async def register_link(body: _RegisterLinkBody):
    """Record a YouTube / Drive link submission.  No Drive file is created —
    only SQLite is updated.  This is intentionally lightweight.
    """
    normalized = normalize_phone(body.phone)
    if not _is_valid_vn_phone(normalized):
        raise HTTPException(status_code=422, detail="Số điện thoại không hợp lệ")
    if not body.child_name.strip():
        raise HTTPException(status_code=422, detail="Thiếu tên bé")
    if not body.parent_name.strip():
        raise HTTPException(status_code=422, detail="Thiếu tên phụ huynh")
    if not body.parent_email.strip() or not _EMAIL_RE.match(body.parent_email):
        raise HTTPException(status_code=422, detail="Email không hợp lệ")
    if not (1 <= body.song_idx <= TOTAL_SONGS):
        raise HTTPException(status_code=422, detail=f"song_idx phải từ 1 đến {TOTAL_SONGS}")
    if not _is_accepted_link(body.link):
        raise HTTPException(status_code=422, detail="Link không hợp lệ (chấp nhận YouTube / Drive)")

    # Ensure participant row exists in SQLite
    existing_progress = get_participant_progress(normalized)
    if not existing_progress:
        # Create a Drive folder so there's a folder_id for this participant
        loop = asyncio.get_event_loop()

        def _create_folder():
            drive = build_drive_service()
            parent_folder_id = get_shared_drive_folder_id()
            folder, _ = _resolve_target_folder(
                drive,
                phone=normalized,
                child_name=body.child_name.strip(),
                parent_name=body.parent_name.strip(),
                parent_folder_id=parent_folder_id,
                existing_folder_id=None,
            )
            return folder

        try:
            folder = await loop.run_in_executor(_upload_executor, _create_folder)
        except Exception as exc:
            logger.exception("register/link folder creation failed phone=%s", normalized)
            raise HTTPException(status_code=500, detail=f"Không thể tạo thư mục: {exc}")

        folder_id = folder["id"]
        folder_url = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"
        upsert_participant(
            phone=normalized,
            child_name=body.child_name.strip(),
            parent_name=body.parent_name.strip(),
            parent_email=body.parent_email.strip(),
            folder_id=folder_id,
            folder_name=folder.get("name", ""),
            folder_url=folder_url,
        )
    else:
        # Update contact info in case it changed
        upsert_participant(
            phone=normalized,
            child_name=body.child_name.strip(),
            parent_name=body.parent_name.strip(),
            parent_email=body.parent_email.strip(),
            folder_id=existing_progress.get("folder_id", ""),
            folder_name=existing_progress.get("folder_name", ""),
            folder_url=existing_progress.get("folder_url", ""),
        )

    try:
        mark_song_uploaded(
            phone=normalized,
            song_idx=body.song_idx,
            submission_type="link",
            drive_file_id=None,
            drive_link=body.link.strip(),
            display_name=body.link.strip(),
        )
    except Exception as exc:
        logger.exception("register/link persist failed phone=%s song=%d", normalized, body.song_idx)
        raise HTTPException(status_code=500, detail=f"Không thể lưu link: {exc}")

    progress = get_participant_progress(normalized) or {}
    logger.info("register/link phone=%s song=%d link=%s", normalized, body.song_idx, body.link[:60])

    return JSONResponse({
        "success": True,
        "phone": normalized,
        "song_idx": body.song_idx,
        "uploaded_songs": progress.get("uploaded_songs", []),
        "missing_songs": progress.get("missing_songs", []),
    })
