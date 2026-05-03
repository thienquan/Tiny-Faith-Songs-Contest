# plan.md — Tiny Faith Songs Bible Song Contest Landing Page (Updated)

## 1) Objectives
- ✅ Deliver a **production-ready end-to-end workflow**: FastAPI receives `multipart/form-data` → creates a subfolder inside **Google Shared Drive** → uploads videos via **streaming/resumable chunks** (no RAM buffering) → creates **Google Docs** for pasted links → sends **SMTP email notification** to the organizer.
- ✅ Build a **Next.js 14 (App Router)** bilingual (VI/EN) kid-friendly landing page, including all contest content and a robust registration form for 6 songs.
- ✅ Validate MVP with **full E2E tests** (frontend + backend + integration) against the real Drive + SMTP services.
- ⏳ Finish final delivery polish items (notably: replace robot mascot placeholder once `robot-mascot.jpg` is uploaded).

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) ✅ COMPLETED
**User stories (POC scope)**
1. ✅ As an admin, I can authenticate with the Google Service Account and access the Shared Drive.
2. ✅ As an admin, I can create a subfolder inside the target Shared Drive folder with `supportsAllDrives=True`.
3. ✅ As an admin, I can upload a file via streaming/resumable upload without loading it fully into RAM.
4. ✅ As an admin, I can create a Google Docs file containing a pasted link inside the created subfolder.
5. ✅ As an admin, I can send an SMTP email containing the Drive folder URL.

**Completed tasks / Outputs**
- ✅ Added backend deps (installed + persisted in `requirements.txt`):
  - `google-api-python-client`, `google-auth`, `google-auth-httplib2`, `python-multipart`
- ✅ Implemented `/app/poc_test.py` validating:
  - Service Account auth → Shared Drive folder creation
  - Streaming/resumable upload (chunked)
  - Google Docs creation for a pasted link
  - SMTP send to `Tiny.faith2025@gmail.com`
- ✅ Resolved SMTP SSL issue:
  - Customer SMTP cert has **hostname mismatch** for `mail.kinhthanhgotay.com`.
  - Solution used (POC + production): relaxed SSL context (`check_hostname=False`, `CERT_NONE`).

**Notes**
- Cleanup delete of test folders may fail if Service Account lacks delete permissions; the production app **does not delete** folders, so this is not a functional problem.

---

### Phase 2 — V1 App Development (Next.js + FastAPI) ✅ COMPLETED
**User stories (MVP UX)**
1. ✅ Visitor can understand the contest quickly with a clear CTA.
2. ✅ Visitor can switch VI/EN and see all content + hero banner swap correctly.
3. ✅ Parent can submit registration with child/parent names, email, and song submissions.
4. ✅ For each song, parent can choose **either** upload **or** link.
5. ✅ Parent sees success confirmation with Drive folder URL; errors are shown clearly.

**Key environment constraint handled**
- Supervisor is **read-only** and runs:
  - Frontend on port **3000**
  - Backend on port **8001** (FastAPI)
- Therefore backend is implemented in **FastAPI (Python)** (functional equivalent of Node API routes).

**Frontend (port 3000) — Completed implementation**
- ✅ Replaced CRA with **Next.js 14 App Router** in `/app/frontend`.
- ✅ Updated `package.json` so `yarn start` runs Next dev server:
  - `next dev -p 3000 -H 0.0.0.0`
- ✅ Tailwind configured with kid-friendly tokens and typography.
- ✅ Implemented all landing sections:
  - Navbar (sticky, mobile menu)
  - Hero (locale banner swap + CTA)
  - About
  - Timeline + playlist callout
  - Prizes (with mascot placeholder)
  - How to Participate (Tony + Windy)
  - Criteria (40/20/20/20 bars)
  - Poster section (mobile)
  - Registration Form
  - Footer
- ✅ i18n:
  - VI default, EN toggle saved to `localStorage` (`tfs-locale`)
  - All strings from `/app/frontend/messages/dictionary.js`
  - Hero banner swaps by locale: `banner-horizontal-vi.jpg` ↔ `banner-horizontal-en.jpg`
- ✅ Registration Form:
  - Child name, parent name, email
  - 6 song blocks with Tabs: **Upload** | **Link**
  - XHR upload to `/api/register` with progress indicator
  - Consent checkbox required
  - Success dialog with returned folder URL

**Backend (port 8001) — Completed implementation**
- ✅ Implemented `POST /api/register` (multipart form) with:
  - Validation: required fields, email, consent, at least 1 song, link host validation
  - Creates subfolder in Shared Drive:
    - Name: `"[Child] - [Parent] (timestamp)"`
    - Parent folder: `121rMtc6bwqBBARkwlpTch71WG1ESRVKN`
    - Uses `supportsAllDrives=True`
  - Upload mode:
    - Streams from `UploadFile.file` using `MediaIoBaseUpload(..., resumable=True, chunksize=1MB)`
    - No full-file buffering in RAM
  - Link mode:
    - Creates Google Docs file containing the pasted link
  - Email:
    - Sends HTML summary email to organizer `Tiny.faith2025@gmail.com` via SMTP SSL

**Key bug fixes performed during Phase 2**
- ✅ Upload detection fix:
  - `request.form()` returns **Starlette UploadFile**, not FastAPI’s UploadFile class.
  - Fixed by checking both classes + duck-typing via `hasattr(filename)`.
- ✅ Reliability improvements:
  - Added retry logic for transient Drive errors (429, 5xx, network) for:
    - `create_link_doc`
    - `stream_upload_to_folder`

**End-of-phase verification**
- ✅ Real E2E curl tests:
  - Mixed upload/link 6/6 → Drive folder + 6 items created + email delivered.

---

### Phase 3 — Testing & Hardening ✅ COMPLETED
**User stories (quality)**
1. ✅ Inline validation errors in the form before submitting.
2. ✅ Meaningful error handling for invalid inputs.
3. ✅ Organizer receives consistent emails with folder link and submission summary.
4. ✅ Mobile experience is readable; poster section appears on mobile.
5. ✅ Upload progress shown via XHR progress events.

**Completed tasks**
- ✅ Ran `testing_agent_v3` comprehensive suite:
  - Backend: health, validation cases, happy path
  - Frontend: hero + language toggle + CTA scroll + form validations + success dialog
  - Integration: real Drive folder creation + email send
- ✅ Result: **100% pass rate**
  - Backend: 6/6 tests passed
  - Frontend: 13/13 user stories verified

---

### Phase 4 — Polish & Delivery ⏳ IN PROGRESS
**User stories (polish)**
1. ✅ Landing page looks kid-friendly with consistent theme and spacing.
2. ✅ Banners/images load correctly with no major layout shifts.
3. ✅ Parent flow is clear with per-song blocks and guidance.
4. ✅ Success screen includes next steps and folder link.
5. ✅ Folder naming and file naming are consistent.

**Completed tasks**
- ✅ Cleaned up CRA backups and unused files.
- ✅ Confirmed local run target:
  - **App live (local):** http://127.0.0.1:3000

**Remaining tasks (to finish delivery)**
- ⏳ Replace robot mascot placeholder with real `robot-mascot.jpg` once you upload it:
  - File expected: `/app/frontend/public/robot-mascot.jpg`
  - Section: Prizes (currently uses kid-friendly placeholder card with Bot icon)
- ⏳ Optional final polish (nice-to-have):
  - Add minor animation refinements (respect `prefers-reduced-motion`)
  - Add small “Submission received” toast copy improvements
  - Consider a small FAQ / privacy note section if desired

---

## 3) Next Actions
1. **You upload `robot-mascot.jpg`** (final missing asset).
2. I will wire it into the Prizes section and remove the placeholder.
3. Run one final regression submission (links-only) and confirm email arrives.

---

## 4) Success Criteria
- ✅ **POC:** Service Account Drive + streaming upload + Docs creation + SMTP email verified.
- ✅ **V1 App:** US1–US14 satisfied; bilingual toggle works; registration creates folder + artifacts.
- ✅ **Reliability:** No RAM buffering for uploads; retries for transient Google API errors.
- ✅ **Testing:** 100% pass rate with `testing_agent_v3`.
- ⏳ **Final Delivery:** Replace robot mascot placeholder with real image and perform one final regression check.
