from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

TOTAL_SONGS = 6
DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "tinyfaith.db"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db_path() -> str:
    return os.environ.get("SQLITE_PATH", str(DEFAULT_DB_PATH))


def _connect() -> sqlite3.Connection:
    db_path = Path(_db_path())
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS participants (
                phone TEXT PRIMARY KEY,
                child_name TEXT,
                parent_name TEXT,
                parent_email TEXT,
                folder_id TEXT,
                folder_name TEXT,
                folder_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS participant_video_status (
                phone TEXT NOT NULL,
                song_idx INTEGER NOT NULL,
                status TEXT NOT NULL,
                submission_type TEXT,
                drive_file_id TEXT,
                drive_link TEXT,
                display_name TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (phone, song_idx),
                FOREIGN KEY (phone) REFERENCES participants(phone)
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_video_status_phone
            ON participant_video_status(phone)
            """
        )
        conn.commit()


def upsert_participant(
    *,
    phone: str,
    child_name: str,
    parent_name: str,
    parent_email: str,
    folder_id: str,
    folder_name: str,
    folder_url: str,
) -> None:
    now = _utc_now_iso()
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO participants (
                phone, child_name, parent_name, parent_email,
                folder_id, folder_name, folder_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET
                child_name=excluded.child_name,
                parent_name=excluded.parent_name,
                parent_email=excluded.parent_email,
                folder_id=excluded.folder_id,
                folder_name=excluded.folder_name,
                folder_url=excluded.folder_url,
                updated_at=excluded.updated_at
            """,
            (
                phone,
                child_name,
                parent_name,
                parent_email,
                folder_id,
                folder_name,
                folder_url,
                now,
                now,
            ),
        )
        conn.commit()


def mark_song_uploaded(
    *,
    phone: str,
    song_idx: int,
    submission_type: str,
    drive_file_id: Optional[str] = None,
    drive_link: Optional[str] = None,
    display_name: Optional[str] = None,
) -> None:
    now = _utc_now_iso()
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO participant_video_status (
                phone, song_idx, status, submission_type,
                drive_file_id, drive_link, display_name, updated_at
            ) VALUES (?, ?, 'uploaded', ?, ?, ?, ?, ?)
            ON CONFLICT(phone, song_idx) DO UPDATE SET
                status='uploaded',
                submission_type=excluded.submission_type,
                drive_file_id=excluded.drive_file_id,
                drive_link=excluded.drive_link,
                display_name=excluded.display_name,
                updated_at=excluded.updated_at
            """,
            (
                phone,
                song_idx,
                submission_type,
                drive_file_id,
                drive_link,
                display_name,
                now,
            ),
        )
        conn.execute(
            "UPDATE participants SET updated_at = ? WHERE phone = ?",
            (now, phone),
        )
        conn.commit()


def get_participant_progress(phone: str) -> Optional[dict]:
    with _connect() as conn:
        participant = conn.execute(
            """
            SELECT phone, child_name, parent_name, parent_email,
                   folder_id, folder_name, folder_url, created_at, updated_at
            FROM participants
            WHERE phone = ?
            """,
            (phone,),
        ).fetchone()

        if participant is None:
            return None

        rows = conn.execute(
            """
            SELECT song_idx, status, submission_type, drive_file_id, drive_link, display_name, updated_at
            FROM participant_video_status
            WHERE phone = ?
            ORDER BY song_idx ASC
            """,
            (phone,),
        ).fetchall()

    status_map: dict[str, str] = {}
    uploaded_songs: list[int] = []
    songs: list[dict] = []
    for row in rows:
        song_idx = int(row["song_idx"])
        status = row["status"]
        status_map[f"video_{song_idx}_status"] = status
        if status == "uploaded":
            uploaded_songs.append(song_idx)
        songs.append(
            {
                "song": song_idx,
                "status": status,
                "submission_type": row["submission_type"],
                "drive_file_id": row["drive_file_id"],
                "drive_link": row["drive_link"],
                "display_name": row["display_name"],
                "updated_at": row["updated_at"],
            }
        )

    missing_songs = [i for i in range(1, TOTAL_SONGS + 1) if i not in uploaded_songs]

    return {
        "phone": participant["phone"],
        "child_name": participant["child_name"] or "",
        "parent_name": participant["parent_name"] or "",
        "parent_email": participant["parent_email"] or "",
        "folder_id": participant["folder_id"] or "",
        "folder_name": participant["folder_name"] or "",
        "folder_url": participant["folder_url"] or "",
        "created_at": participant["created_at"],
        "updated_at": participant["updated_at"],
        "uploaded_songs": uploaded_songs,
        "missing_songs": missing_songs,
        "video_status": status_map,
        "songs": songs,
    }


ensure_schema()
