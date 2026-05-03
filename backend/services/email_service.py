"""
SMTP email service for Tiny Faith Songs Contest.

- Connects to SMTP_HOST:SMTP_PORT over SSL
- Uses a relaxed SSL context (no hostname check) since the customer mail
  server's certificate is not registered for the bare hostname.
- Sends an HTML email summarizing a contest registration.

This module is split into small private helpers so each piece is easy to
unit-test or replace (e.g. swap out the template renderer).
"""

from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape
from typing import Iterable, Optional

logger = logging.getLogger(__name__)

DEFAULT_HOST = "mail.kinhthanhgotay.com"
DEFAULT_PORT = 465
DEFAULT_ADMIN_EMAIL = "Tiny.faith2025@gmail.com"


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _cfg(key: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(key)
    if val is None or val == "":
        return default
    return val


def _resolve_smtp_config() -> dict:
    """Read all SMTP-related env vars in one place."""
    return {
        "host": _cfg("SMTP_HOST", DEFAULT_HOST),
        "port": int(_cfg("SMTP_PORT", str(DEFAULT_PORT)) or DEFAULT_PORT),
        "secure": (_cfg("SMTP_SECURE", "true") or "true").lower() in ("1", "true", "yes"),
        "user": _cfg("SMTP_USER"),
        "password": _cfg("SMTP_PASS"),
        "sender": _cfg("SMTP_FROM") or _cfg("SMTP_USER"),
    }


def admin_email() -> str:
    return _cfg("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL) or DEFAULT_ADMIN_EMAIL


# ---------------------------------------------------------------------------
# Message construction & transport
# ---------------------------------------------------------------------------

def _build_relaxed_ssl_context() -> ssl.SSLContext:
    """The customer's mail server cert isn't bound to its hostname (typical
    for shared mail hosting), so we negotiate TLS but skip strict checks.
    """
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context


def _build_message(
    subject: str,
    html_body: str,
    sender: str,
    to_email: str,
    *,
    plain_text: Optional[str] = None,
    cc: Optional[Iterable[str]] = None,
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr(("Tiny Faith Songs", sender))
    msg["To"] = to_email
    if cc:
        msg["Cc"] = ", ".join(cc)
    if plain_text:
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def _send_message(
    cfg: dict,
    msg: MIMEMultipart,
    recipients: list[str],
    *,
    timeout: int,
) -> None:
    context = _build_relaxed_ssl_context()
    if cfg["secure"]:
        with smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=context, timeout=timeout) as server:
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["sender"], recipients, msg.as_string())
    else:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=timeout) as server:
            server.starttls(context=context)
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["sender"], recipients, msg.as_string())


def send_html_email(
    subject: str,
    html_body: str,
    to_email: str,
    *,
    plain_text: Optional[str] = None,
    cc: Optional[Iterable[str]] = None,
    timeout: int = 60,
) -> dict:
    cfg = _resolve_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        raise RuntimeError("SMTP credentials missing (SMTP_USER / SMTP_PASS)")

    msg = _build_message(
        subject=subject,
        html_body=html_body,
        sender=cfg["sender"],
        to_email=to_email,
        plain_text=plain_text,
        cc=cc,
    )
    recipients = [to_email] + list(cc or [])

    logger.info("SMTP connecting to %s:%s (secure=%s)", cfg["host"], cfg["port"], cfg["secure"])
    _send_message(cfg, msg, recipients, timeout=timeout)
    logger.info("SMTP email sent to %s (cc=%s)", to_email, list(cc or []))
    return {"to": to_email, "cc": list(cc or []), "subject": subject}


# ---------------------------------------------------------------------------
# Registration email template
# ---------------------------------------------------------------------------

def _format_song_label(song: dict) -> tuple[str, str, str]:
    """Return (label, link_url, extra_text) for a single song result row."""
    kind = song.get("type", "-")
    if kind == "upload":
        return "📹 Upload", song.get("file_link") or "", song.get("file_name") or ""
    if kind == "link":
        return "🔗 Link", song.get("doc_link") or "", song.get("submitted_link") or ""
    if kind == "error":
        return "❌ Error", "", song.get("error") or ""
    return "—", "", "(skipped)"


def _render_song_row_html(idx: int, song: dict) -> str:
    label, link, extra = _format_song_label(song)
    safe_extra = escape(extra)
    if link:
        link_html = f'<a href="{escape(link)}" target="_blank" rel="noopener">Open</a>'
    else:
        link_html = "—"
    return (
        f'<tr><td style="padding:6px 10px;">Song {idx}</td>'
        f'<td style="padding:6px 10px;">{label}</td>'
        f'<td style="padding:6px 10px; max-width: 380px; word-break: break-all;">{safe_extra}</td>'
        f"<td style=\"padding:6px 10px;\">{link_html}</td></tr>"
    )


def _render_song_row_plain(idx: int, song: dict) -> str:
    kind = song.get("type", "-")
    if kind == "upload":
        link = song.get("file_link") or ""
        return f"  Song {idx} (upload): {song.get('file_name') or ''} -> {link}"
    if kind == "link":
        return (
            f"  Song {idx} (link): {song.get('submitted_link') or ''} "
            f"-> {song.get('doc_link') or ''}"
        )
    if kind == "error":
        return f"  Song {idx} (error): {song.get('error') or ''}"
    return f"  Song {idx}: (skipped this session)"


def _filter_actionable_songs(songs: list) -> list:
    """Songs that were actually processed in this session (not 'skipped')."""
    return [s for s in songs if s.get("type") in ("upload", "link", "error")]


def _render_html_body(payload: dict) -> str:
    child = escape(payload.get("child_name", "?"))
    parent = escape(payload.get("parent_name", "?"))
    parent_email = escape(payload.get("parent_email", "?"))
    phone_raw = escape(payload.get("phone_raw") or payload.get("phone") or "")
    phone = escape(payload.get("phone") or "")
    folder_url = escape(payload.get("folder_url", ""))
    folder_name = escape(payload.get("folder_name", "")) or folder_url
    is_new = bool(payload.get("is_new_folder"))
    songs = payload.get("song_results", [])
    actionable = _filter_actionable_songs(songs)

    rows = "".join(_render_song_row_html(s.get("song", i + 1), s) for i, s in enumerate(actionable))
    if not rows:
        rows = (
            '<tr><td colspan="4" style="padding:8px 10px; color:#64748b;">'
            "(no song processed in this session)</td></tr>"
        )

    banner_text = (
        "🎉 Bài dự thi mới"
        if is_new
        else "🔁 Bổ sung bài thi (cập nhật)"
    )
    banner_color = "#0369A1" if is_new else "#9A3412"

    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a;">
      <h2 style="color:{banner_color};">{banner_text} — Tiny Faith Songs</h2>
      <p style="margin:0 0 12px;">Bài dự thi vừa được {('tạo' if is_new else 'cập nhật')} với thông tin sau:</p>
      <table style="border-collapse: collapse; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
        <tr><td style="padding:6px 10px; font-weight:600;">Số điện thoại</td><td style="padding:6px 10px; font-family: ui-monospace, monospace;">{phone}{f' <span style=\"color:#64748b\">(nhập: {phone_raw})</span>' if phone_raw and phone_raw != phone else ''}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Tên bé</td><td style="padding:6px 10px;">{child}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Phụ huynh</td><td style="padding:6px 10px;">{parent}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Email phụ huynh</td><td style="padding:6px 10px;">{parent_email}</td></tr>
        <tr><td style="padding:6px 10px; font-weight:600;">Thư mục Drive</td>
          <td style="padding:6px 10px;"><a href="{folder_url}" target="_blank" rel="noopener">{folder_name}</a></td>
        </tr>
      </table>
      <h3 style="margin-top:24px; color:#0f172a;">📂 Bài hát {'đã nộp' if is_new else 'thêm trong lần cập nhật này'} ({len(actionable)})</h3>
      <table style="border-collapse: collapse; width:100%; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">
        <thead style="background:#e0f2fe; color:#0c4a6e;">
          <tr><th style="text-align:left; padding:8px 10px;">#</th><th style="text-align:left; padding:8px 10px;">Loại</th><th style="text-align:left; padding:8px 10px;">Thông tin</th><th style="text-align:left; padding:8px 10px;">Liên kết</th></tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <p style="margin-top:24px; color:#64748b; font-size:12px;">Email này được gửi tự động từ hệ thống đăng ký Tiny Faith Songs Contest.</p>
    </div>
    """


def _render_plain_body(payload: dict) -> str:
    songs = payload.get("song_results", [])
    actionable = _filter_actionable_songs(songs)
    is_new = bool(payload.get("is_new_folder"))
    lines = [
        "Tiny Faith Songs — " + ("New entry" if is_new else "Update"),
        f"Phone: {payload.get('phone', '?')}",
        f"Child: {payload.get('child_name', '?')}",
        f"Parent: {payload.get('parent_name', '?')}",
        f"Email: {payload.get('parent_email', '?')}",
        f"Folder: {payload.get('folder_url', '')}",
        "",
        f"Songs in this session ({len(actionable)}):",
    ]
    for s in actionable:
        lines.append(_render_song_row_plain(s.get("song", 0), s))
    return "\n".join(lines)


def render_registration_email(payload: dict, locale: str = "vi") -> tuple[str, str, str]:
    """Return (subject, html_body, plain_text). The subject distinguishes
    first-time vs update submissions, as required by the contest organizer.
    """
    _ = locale  # noqa: F841 — reserved for future per-locale subject lines
    phone = payload.get("phone") or "?"
    is_new = bool(payload.get("is_new_folder"))
    if is_new:
        subject = (
            f"[Đăng ký mới] SĐT: {phone} — {payload.get('child_name', '?')} "
            f"vừa đăng ký dự thi"
        )
    else:
        subject = f"[Cập nhật bài thi] SĐT: {phone} vừa nộp thêm video"
    return subject, _render_html_body(payload), _render_plain_body(payload)
