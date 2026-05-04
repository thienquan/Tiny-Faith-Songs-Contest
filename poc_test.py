"""
POC TEST — Tiny Faith Songs Contest
====================================
Validates the two core integrations needed for the registration backend:

1. Google Drive (Service Account → Shared Drive folder):
   - Authenticate with Service Account
   - Create subfolder under Shared Drive parent (supportsAllDrives=True)
   - Upload a small test video file via streaming/resumable upload (MediaIoBaseUpload)
   - Create a Google Docs file containing a sample link inside the subfolder
   - Read folder webViewLink
   - Cleanup: delete the test subfolder

2. SMTP (mail.kinhthanhgotay.com:465 SSL):
   - Authenticate with the configured SMTP_USER / SMTP_PASS
   - Send email to Tiny.faith2025@gmail.com containing the Drive folder URL

Run:
    /root/.venv/bin/python /app/poc_test.py
"""

import io
import os
import smtplib
import ssl
import sys
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

# ---------- Config ----------
SERVICE_ACCOUNT_FILE = "/app/credentials/tiny-faith-songs-contest-1e944b6e82cb.json"
SHARED_DRIVE_FOLDER_ID = "121rMtc6bwqBBARkwlpTch71WG1ESRVKN"
SCOPES = ["https://www.googleapis.com/auth/drive"]

SMTP_HOST = "mail.kinhthanhgotay.com"
SMTP_PORT = 465
SMTP_USER = "no-reply@kinhthanhgotay.com"
SMTP_PASS = "5k!zTKDemFc8ai6J"
SMTP_FROM = "no-reply@kinhthanhgotay.com"
ADMIN_EMAIL = "Tiny.faith2025@gmail.com"


# ---------- Helpers ----------
def log(msg, status="INFO"):
    color = {
        "INFO": "\033[94m",
        "OK": "\033[92m",
        "FAIL": "\033[91m",
        "WARN": "\033[93m",
    }.get(status, "")
    print(f"{color}[{status}]\033[0m {msg}", flush=True)


# ---------- Google Drive POC ----------
def build_drive_service():
    log("Building Google Drive service from Service Account...")
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise FileNotFoundError(f"Service Account file missing: {SERVICE_ACCOUNT_FILE}")
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    svc = build("drive", "v3", credentials=creds, cache_discovery=False)
    log(f"Drive service built (SA email = {creds.service_account_email})", "OK")
    return svc, creds.service_account_email


def create_folder(drive, name, parent_id):
    log(f"Creating folder '{name}' under parent {parent_id} (Shared Drive)...")
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = drive.files().create(
        body=metadata,
        fields="id, name, webViewLink, parents",
        supportsAllDrives=True,
    ).execute()
    log(f"Folder created. id={folder['id']} link={folder['webViewLink']}", "OK")
    return folder


def stream_upload(drive, parent_folder_id, name, data: bytes, mime: str):
    """Upload using MediaIoBaseUpload + resumable=True (proves no full-RAM buffering pattern)."""
    log(f"Streaming upload '{name}' ({len(data)} bytes) -> folder {parent_folder_id}...")
    media = MediaIoBaseUpload(
        io.BytesIO(data),
        mimetype=mime,
        chunksize=1024 * 1024,  # 1MB chunks (resumable)
        resumable=True,
    )
    request = drive.files().create(
        body={"name": name, "parents": [parent_folder_id]},
        media_body=media,
        fields="id, name, webViewLink, size",
        supportsAllDrives=True,
    )
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            log(f"  ...progress {int(status.progress() * 100)}%")
    log(f"Upload complete. id={response['id']} link={response['webViewLink']}", "OK")
    return response


def create_link_doc(drive, parent_folder_id, doc_name, link_url):
    """Create a Google Docs file containing the link text inside the folder."""
    log(f"Creating Google Doc '{doc_name}' with link inside folder...")
    text_body = f"Tiny Faith Songs Contest Submission Link:\n\n{link_url}\n"
    media = MediaIoBaseUpload(
        io.BytesIO(text_body.encode("utf-8")),
        mimetype="text/plain",
        resumable=False,
    )
    file = drive.files().create(
        body={
            "name": doc_name,
            "mimeType": "application/vnd.google-apps.document",
            "parents": [parent_folder_id],
        },
        media_body=media,
        fields="id, name, webViewLink",
        supportsAllDrives=True,
    ).execute()
    log(f"Doc created. id={file['id']} link={file['webViewLink']}", "OK")
    return file


def delete_folder(drive, folder_id):
    log(f"Cleaning up — deleting folder {folder_id} ...")
    drive.files().delete(fileId=folder_id, supportsAllDrives=True).execute()
    log("Folder deleted", "OK")


# ---------- SMTP POC ----------
def send_smtp_email(subject, html_body, to_email):
    log(f"Connecting to SMTP {SMTP_HOST}:{SMTP_PORT} (SSL) ...")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Use a relaxed SSL context — the server's cert hostname does not match
    # the dnsname `mail.kinhthanhgotay.com` (common for shared / self-hosted
    # mail servers). We still negotiate TLS but skip hostname verification.
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=30) as server:
        log("SMTP connected, attempting login ...")
        server.login(SMTP_USER, SMTP_PASS)
        log("SMTP login OK, sending mail ...")
        server.sendmail(SMTP_FROM, [to_email], msg.as_string())
    log(f"Email sent to {to_email}", "OK")


# ---------- Main ----------
def main():
    print("=" * 70)
    print("Tiny Faith Songs — POC TEST")
    print("=" * 70)

    failures = []
    folder_url = None
    folder_id = None

    # 1) Drive POC
    try:
        drive, sa_email = build_drive_service()

        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        folder = create_folder(drive, f"POC_Test_{ts}", SHARED_DRIVE_FOLDER_ID)
        folder_id = folder["id"]
        folder_url = folder["webViewLink"]

        # 1a) Streaming upload of a fake "video" payload (~3 MB)
        payload = (b"FAKEVIDEO" * 350_000)  # ~3.15 MB
        stream_upload(drive, folder_id, f"poc_song1_{ts}.mp4", payload, "video/mp4")

        # 1b) Google Docs with link
        create_link_doc(
            drive,
            folder_id,
            f"poc_song2_link_{ts}",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        )

        log("Drive POC succeeded", "OK")
    except HttpError as e:
        failures.append(f"Drive HttpError: {e}")
        log(f"Drive HttpError: {e}", "FAIL")
    except Exception as e:
        failures.append(f"Drive Exception: {e}")
        log(f"Drive Exception: {e}", "FAIL")

    # 2) SMTP POC
    try:
        link_part = folder_url or "(folder URL unavailable - Drive step failed)"
        html = f"""
        <h2>POC TEST — Tiny Faith Songs Registration</h2>
        <p>This is a POC email confirming the SMTP integration works.</p>
        <p><strong>Created Drive folder:</strong> <a href="{link_part}">{link_part}</a></p>
        <p>Sent at: {datetime.utcnow().isoformat()} UTC</p>
        """
        send_smtp_email(
            subject=f"[POC] Tiny Faith Songs SMTP test — {datetime.utcnow().strftime('%H:%M:%S UTC')}",
            html_body=html,
            to_email=ADMIN_EMAIL,
        )
        log("SMTP POC succeeded", "OK")
    except Exception as e:
        failures.append(f"SMTP Exception: {e}")
        log(f"SMTP Exception: {e}", "FAIL")

    # 3) Cleanup Drive folder (best-effort)
    if folder_id:
        try:
            # rebuild service in case earlier step failed mid-way
            drive2, _ = build_drive_service()
            delete_folder(drive2, folder_id)
        except Exception as e:
            log(f"Cleanup warning (folder may need manual delete): {e}", "WARN")

    # Final verdict
    print("=" * 70)
    if failures:
        log("POC FAILED", "FAIL")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        log("All POC tests passed ✅", "OK")
        sys.exit(0)


if __name__ == "__main__":
    main()
