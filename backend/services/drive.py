"""
Google Drive Service Account integration for Tiny Faith Songs Contest.

- Authenticates with Service Account JSON
- Creates a subfolder in a Shared Drive (uses supportsAllDrives=True)
- Streams uploads from a file-like object (resumable, 1MB chunks) so that 2GB
  videos never fully buffer in Node/Python RAM.
- Creates Google Docs file containing a YouTube/Drive submission link.
"""

from __future__ import annotations

import io
import logging
import os
import re
import time
from typing import Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]

DEFAULT_CHUNK_SIZE = 32 * 1024 * 1024  # 32 MB resumable chunks — reduces round-trips significantly
RETRYABLE_STATUS = (429, 500, 502, 503, 504)


def _is_retryable(err: Exception) -> bool:
    if isinstance(err, HttpError):
        try:
            status = int(getattr(err.resp, "status", 0)) if hasattr(err, "resp") else 0
        except Exception:
            status = 0
        if status in RETRYABLE_STATUS:
            return True
    # Network blips
    msg = str(err).lower()
    return "timed out" in msg or "broken pipe" in msg or "connection reset" in msg


def _service_account_path() -> str:
    return os.environ.get(
        "GOOGLE_SERVICE_ACCOUNT_JSON",
        "/app/credentials/tiny-faith-songs-contest-1e944b6e82cb.json",
    )


_drive_service_cache: dict = {}
_drive_credentials_cache: dict = {}


def _get_credentials():
    """Return cached service-account credentials (refreshed automatically)."""
    sa_path = _service_account_path()
    if sa_path not in _drive_credentials_cache:
        if not os.path.exists(sa_path):
            raise FileNotFoundError(f"Service Account file not found: {sa_path}")
        creds = service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)
        _drive_credentials_cache[sa_path] = creds
    return _drive_credentials_cache[sa_path]


def build_drive_service():
    sa_path = _service_account_path()
    if sa_path in _drive_service_cache:
        return _drive_service_cache[sa_path]
    creds = _get_credentials()
    svc = build("drive", "v3", credentials=creds, cache_discovery=False)
    _drive_service_cache[sa_path] = svc
    return svc


def create_resumable_upload_session(
    filename: str,
    mime_type: str,
    file_size: int,
    parent_folder_id: str,
) -> str:
    """Initiate a Drive resumable upload session and return the session URI.

    The caller (browser) can PUT the raw file bytes directly to this URI
    without needing any additional auth headers — the auth token is baked in.
    """
    import google.auth.transport.requests as ga_transport  # local import to avoid startup overhead

    creds = _get_credentials()
    # Build an authorized session that automatically refreshes the token
    authed = ga_transport.AuthorizedSession(creds)

    metadata = {
        "name": filename,
        "parents": [parent_folder_id],
    }

    resp = authed.post(
        "https://www.googleapis.com/upload/drive/v3/files"
        "?uploadType=resumable&supportsAllDrives=true&includeItemsFromAllDrives=true",
        headers={
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": mime_type or "video/mp4",
            "X-Upload-Content-Length": str(file_size),
        },
        json=metadata,
    )

    if resp.status_code != 200:
        raise RuntimeError(
            f"Drive refused to create upload session: HTTP {resp.status_code} — {resp.text[:300]}"
        )

    session_uri = resp.headers.get("Location") or resp.headers.get("location")
    if not session_uri:
        raise RuntimeError("Drive did not return a Location header for the resumable session")

    logger.info("Resumable session created for %s (size=%d)", filename, file_size)
    return session_uri


def get_shared_drive_folder_id() -> str:
    fid = os.environ.get("FOLDER_ID") or os.environ.get("SHARED_DRIVE_FOLDER_ID")
    if not fid:
        # Hard fallback to the project's known folder id (per problem statement)
        fid = "121rMtc6bwqBBARkwlpTch71WG1ESRVKN"
    return fid


def create_subfolder(drive, name: str, parent_id: Optional[str] = None) -> dict:
    """Create a folder inside the given Shared Drive parent.

    Returns: {"id", "name", "webViewLink"}
    """
    parent_id = parent_id or get_shared_drive_folder_id()
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = (
        drive.files()
        .create(body=metadata, fields="id, name, webViewLink, parents", supportsAllDrives=True)
        .execute()
    )
    logger.info("Drive folder created: id=%s name=%s", folder.get("id"), folder.get("name"))
    return folder


def get_folder_by_id(drive, folder_id: str) -> Optional[dict]:
    if not folder_id:
        return None
    try:
        folder = (
            drive.files()
            .get(
                fileId=folder_id,
                fields="id, name, webViewLink, mimeType, trashed",
                supportsAllDrives=True,
            )
            .execute()
        )
    except Exception:
        return None

    if not folder or folder.get("trashed"):
        return None
    if folder.get("mimeType") != "application/vnd.google-apps.folder":
        return None
    return folder


_SONG_SLOT_RE = re.compile(r"^song_(\d{2})_", re.IGNORECASE)


def list_uploaded_song_indices(drive, folder_id: str, total_songs: int = 6) -> list[int]:
    if not folder_id:
        return []

    query = f"'{folder_id}' in parents and trashed = false"
    uploaded: set[int] = set()
    page_token = None

    while True:
        response = (
            drive.files()
            .list(
                q=query,
                fields="nextPageToken, files(id, name)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                corpora="allDrives",
                spaces="drive",
                pageToken=page_token,
                pageSize=200,
            )
            .execute()
        )

        for item in response.get("files", []) or []:
            name = item.get("name") or ""
            match = _SONG_SLOT_RE.match(name)
            if not match:
                continue
            idx = int(match.group(1))
            if 1 <= idx <= total_songs:
                uploaded.add(idx)

        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return sorted(uploaded)


def _escape_drive_query_string(value: str) -> str:
    """Escape characters that have special meaning inside a Drive query
    `name contains '...'` literal. Drive uses backslash-escapes for ' and \\.
    """
    return value.replace("\\", "\\\\").replace("'", "\\'")


def find_folder_by_name_part(
    drive,
    name_part: str,
    parent_id: Optional[str] = None,
) -> Optional[dict]:
    """Look up an existing subfolder in the Shared Drive parent whose name
    contains ``name_part`` (case-sensitive substring search via Drive's
    `name contains` operator).

    Used for the "phone-number is the user's identifier" pattern: subsequent
    submissions look up the same folder instead of creating a new one.

    Returns the first matching folder dict (id/name/webViewLink) or ``None``.

    Notes
    -----
    - ``supportsAllDrives=True`` AND ``includeItemsFromAllDrives=True`` are
      both required when searching inside a Shared Drive.
    - We use ``corpora='allDrives'`` so the call works for any Shared Drive
      without needing the parent driveId up-front.
    """
    parent_id = parent_id or get_shared_drive_folder_id()
    safe = _escape_drive_query_string(name_part)
    query = (
        f"'{parent_id}' in parents "
        f"and mimeType = 'application/vnd.google-apps.folder' "
        f"and name contains '{safe}' "
        f"and trashed = false"
    )

    last_err = None
    for attempt in range(3):
        try:
            response = (
                drive.files()
                .list(
                    q=query,
                    fields="files(id, name, webViewLink, parents)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True,
                    corpora="allDrives",
                    pageSize=10,
                    spaces="drive",
                )
                .execute()
            )
            files = response.get("files", []) or []
            if not files:
                return None
            # Prefer the folder whose name STARTS with the name_part (our
            # canonical layout `[phone] - [child] - [parent]`).
            for f in files:
                if f.get("name", "").startswith(name_part):
                    logger.info(
                        "Drive: matched existing folder for '%s' -> %s",
                        name_part,
                        f.get("id"),
                    )
                    return f
            logger.info(
                "Drive: substring match for '%s' (no startswith) -> %s",
                name_part,
                files[0].get("id"),
            )
            return files[0]
        except Exception as exc:
            last_err = exc
            if _is_retryable(exc) and attempt < 2:
                wait = 1.5 ** attempt
                logger.warning(
                    "find_folder_by_name_part attempt %d failed (%s); retrying in %.1fs",
                    attempt + 1,
                    exc,
                    wait,
                )
                time.sleep(wait)
                continue
            raise
    if last_err:
        raise last_err
    return None


def find_file_in_folder_by_name(drive, folder_id: str, file_name: str) -> Optional[dict]:
    """Find a non-trashed file by exact name inside a folder.

    This is used by the direct-upload CORS fallback flow: when the browser
    cannot read Drive's upload response due CORS, backend can still verify
    whether the file has landed in Drive and persist its metadata.
    """
    if not folder_id or not file_name:
        return None

    safe_name = _escape_drive_query_string(file_name)
    query = (
        f"'{folder_id}' in parents "
        f"and trashed = false "
        f"and name = '{safe_name}'"
    )

    response = (
        drive.files()
        .list(
            q=query,
            fields="files(id, name, webViewLink, createdTime, modifiedTime)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            corpora="allDrives",
            spaces="drive",
            orderBy="createdTime desc",
            pageSize=1,
        )
        .execute()
    )

    files = response.get("files", []) or []
    if not files:
        return None
    return files[0]


def stream_upload_to_folder(
    drive,
    folder_id: str,
    name: str,
    file_obj,
    mime_type: str = "application/octet-stream",
    chunk_size: int = DEFAULT_CHUNK_SIZE,
) -> dict:
    """Upload a file via resumable, chunked stream.

    `file_obj` must support .read() (UploadFile.file from FastAPI works).
    `MediaIoBaseUpload` reads the stream in `chunk_size` chunks: this prevents
    full-file RAM buffering even for 2GB videos.

    Per-chunk transient errors are retried automatically by next_chunk()'s
    internal exponential backoff.
    """
    media = MediaIoBaseUpload(file_obj, mimetype=mime_type, chunksize=chunk_size, resumable=True)
    request = drive.files().create(
        body={"name": name, "parents": [folder_id]},
        media_body=media,
        fields="id, name, size, webViewLink, webContentLink, mimeType",
        supportsAllDrives=True,
    )
    response = None
    last_err = None
    while response is None:
        try:
            status, response = request.next_chunk(num_retries=3)
            if status and logger.isEnabledFor(logging.DEBUG):
                logger.debug("upload progress %s: %d%%", name, int(status.progress() * 100))
        except Exception as e:
            last_err = e
            if _is_retryable(e):
                logger.warning("Chunk upload failed (%s); retrying once", e)
                time.sleep(1.0)
                # If we can rewind, retry the whole upload
                try:
                    file_obj.seek(0)
                except Exception:
                    raise last_err
                # Rebuild media + request to start over
                media = MediaIoBaseUpload(file_obj, mimetype=mime_type, chunksize=chunk_size, resumable=True)
                request = drive.files().create(
                    body={"name": name, "parents": [folder_id]},
                    media_body=media,
                    fields="id, name, size, webViewLink, webContentLink, mimeType",
                    supportsAllDrives=True,
                )
                response = None
                continue
            raise
    logger.info("Drive file uploaded: id=%s name=%s size=%s", response.get("id"), response.get("name"), response.get("size"))
    return response


def create_link_doc(drive, folder_id: str, doc_name: str, link_url: str, header_text: str = "Submission link") -> dict:
    """Create a Google Docs file inside the folder with the link content.

    Retries on transient Google API errors (5xx / 429).
    """
    text_body = f"{header_text}:\n\n{link_url}\n"
    last_err = None
    for attempt in range(4):
        try:
            media = MediaIoBaseUpload(
                io.BytesIO(text_body.encode("utf-8")),
                mimetype="text/plain",
                resumable=False,
            )
            file = (
                drive.files()
                .create(
                    body={
                        "name": doc_name,
                        "mimeType": "application/vnd.google-apps.document",
                        "parents": [folder_id],
                    },
                    media_body=media,
                    fields="id, name, webViewLink",
                    supportsAllDrives=True,
                )
                .execute()
            )
            logger.info("Drive doc created: id=%s name=%s", file.get("id"), file.get("name"))
            return file
        except Exception as e:
            last_err = e
            if _is_retryable(e) and attempt < 3:
                wait = 1.5 ** attempt
                logger.warning(
                    "create_link_doc attempt %d failed (%s); retrying in %.1fs",
                    attempt + 1,
                    e,
                    wait,
                )
                time.sleep(wait)
                continue
            raise
    if last_err:
        raise last_err
