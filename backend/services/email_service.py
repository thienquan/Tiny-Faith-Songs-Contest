"""
SMTP email service for Tiny Faith Songs Contest.

- Connects to SMTP_HOST:SMTP_PORT over SSL
- Uses a relaxed SSL context (no hostname check) since the customer mail
  server's certificate is not registered for the bare hostname.
- Sends an HTML email summarizing a contest registration.
"""

from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Iterable, Optional

logger = logging.getLogger(__name__)

DEFAULT_HOST = "mail.kinhthanhgotay.com"
DEFAULT_PORT = 465
DEFAULT_ADMIN_EMAIL = "Tiny.faith2025@gmail.com"


def _cfg(key: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(key)
    if val is None or val == "":
        return default
    return val


def send_html_email(
    subject: str,
    html_body: str,
    to_email: str,
    *,
    plain_text: Optional[str] = None,
    cc: Optional[Iterable[str]] = None,
    timeout: int = 60,
) -> dict:
    host = _cfg("SMTP_HOST", DEFAULT_HOST)
    port = int(_cfg("SMTP_PORT", str(DEFAULT_PORT)) or DEFAULT_PORT)
    secure = (_cfg("SMTP_SECURE", "true") or "true").lower() in ("1", "true", "yes")
    user = _cfg("SMTP_USER")
    password = _cfg("SMTP_PASS")
    sender = _cfg("SMTP_FROM", user)

    if not user or not password:
        raise RuntimeError("SMTP credentials missing (SMTP_USER / SMTP_PASS)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr(("Tiny Faith Songs", sender))
    msg["To"] = to_email
    if cc:
        msg["Cc"] = ", ".join(cc)

    if plain_text:
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Build SSL context — relax hostname check because the mail server's cert
    # is not bound to the bare hostname (common for shared mail hosting).
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    recipients = [to_email] + list(cc or [])
    logger.info("SMTP connecting to %s:%s (secure=%s)", host, port, secure)

    try:
        if secure:
            with smtplib.SMTP_SSL(host, port, context=context, timeout=timeout) as server:
                server.login(user, password)
                server.sendmail(sender, recipients, msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=timeout) as server:
                server.starttls(context=context)
                server.login(user, password)
                server.sendmail(sender, recipients, msg.as_string())
    except Exception:
        logger.exception("SMTP send failed")
        raise

    logger.info("SMTP email sent to %s (cc=%s)", to_email, list(cc or []))
    return {"to": to_email, "cc": list(cc or []), "subject": subject}


def admin_email() -> str:
    return _cfg("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL) or DEFAULT_ADMIN_EMAIL


def render_registration_email(payload: dict, locale: str = "vi") -> tuple[str, str, str]:
    """Return (subject, html_body, plain_text)."""

    child = payload.get("child_name", "?")
    parent = payload.get("parent_name", "?")
    parent_email = payload.get("parent_email", "?")
    folder_url = payload.get("folder_url", "")
    folder_name = payload.get("folder_name", "")
    songs = payload.get("song_results", [])  # list of dicts

    subject = f"[Tiny Faith Songs] New entry: {child} — {parent}"

    rows = []
    for i, s in enumerate(songs, start=1):
        kind = s.get("type", "-")
        if kind == "upload":
            label = "📹 Upload"
            link = s.get("file_link") or s.get("url") or ""
            extra = s.get("file_name") or ""
        elif kind == "link":
            label = "🔗 Link"
            link = s.get("doc_link") or s.get("submitted_link") or ""
            extra = s.get("submitted_link") or ""
        else:
            label = "—"
            link = ""
            extra = "(skipped)"

        link_html = f'<a href="{link}" target="_blank" rel="noopener">Open</a>' if link else "—"
        rows.append(
            f'<tr><td style="padding:6px 10px;">Song {i}</td>'
            f'<td style="padding:6px 10px;">{label}</td>'
            f'<td style="padding:6px 10px; max-width: 380px; word-break: break-all;">{extra}</td>'
            f'<td style="padding:6px 10px;">{link_html}</td></tr>'
        )

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a;">
      <h2 style="color:#0369A1;">🎵 Tiny Faith Songs — Bài dự thi mới</h2>
      <p>Đã nhận được bài dự thi mới với thông tin sau:</p>
      <table style="border-collapse: collapse; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
        <tr><td style="padding:6px 10px; font-weight:600;">Tên bé</td><td style="padding:6px 10px;">{child}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Phụ huynh</td><td style="padding:6px 10px;">{parent}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Email phụ huynh</td><td style="padding:6px 10px;">{parent_email}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Thư mục Drive</td>
          <td style="padding:6px 10px;"><a href="{folder_url}" target="_blank" rel="noopener">{folder_name or folder_url}</a></td>
        </tr>
      </table>
      <h3 style="margin-top:24px; color:#0f172a;">📂 Danh sách 6 bài hát</h3>
      <table style="border-collapse: collapse; width:100%; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">
        <thead style="background:#e0f2fe; color:#0c4a6e;">
          <tr><th style="text-align:left; padding:8px 10px;">#</th><th style="text-align:left; padding:8px 10px;">Loại</th><th style="text-align:left; padding:8px 10px;">Thông tin</th><th style="text-align:left; padding:8px 10px;">Liên kết</th></tr>
        </thead>
        <tbody>{''.join(rows) if rows else '<tr><td colspan="4" style="padding:8px 10px; color:#64748b;">(no song uploaded)</td></tr>'}</tbody>
      </table>
      <p style="margin-top:24px; color:#64748b; font-size:12px;">Email này được gửi tự động từ hệ thống đăng ký Tiny Faith Songs Contest.</p>
    </div>
    """

    plain_lines = [
        "Tiny Faith Songs — New entry",
        f"Child: {child}",
        f"Parent: {parent}",
        f"Email: {parent_email}",
        f"Folder: {folder_url}",
        "",
        "Songs:",
    ]
    for i, s in enumerate(songs, start=1):
        kind = s.get("type", "-")
        if kind == "upload":
            link = s.get("file_link") or ""
            plain_lines.append(f"  Song {i} (upload): {s.get('file_name') or ''} -> {link}")
        elif kind == "link":
            plain_lines.append(f"  Song {i} (link): {s.get('submitted_link') or ''} -> {s.get('doc_link') or ''}")
        else:
            plain_lines.append(f"  Song {i}: (skipped)")
    plain = "\n".join(plain_lines)

    return subject, html, plain
