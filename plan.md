# plan.md — Tiny Faith Songs Bible Song Contest Landing Page

## 1) Objectives
- Prove the **core workflow** works end-to-end: FastAPI receives `multipart/form-data` → creates subfolder in **Shared Drive** → streams uploads without RAM buffering → creates Google Docs for pasted links → sends SMTP email notification.
- Build a **Next.js 14** bilingual (VI/EN) landing page with kid-friendly visuals, full contest info, and a robust registration form for 6 songs.
- Deliver an MVP that satisfies US1–US14 with clear success/error states.

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) ✅ must pass before UI work
**User stories (POC scope)**
1. As an admin, I can run a script to authenticate with the Google Service Account and access the Shared Drive.
2. As an admin, I can create a subfolder inside the target Shared Drive folder with `supportsAllDrives=True`.
3. As an admin, I can upload a file via streaming/resumable upload without loading it fully into RAM.
4. As an admin, I can create a Google Docs file containing a pasted link inside the created subfolder.
5. As an admin, I can send an SMTP SSL email containing the Drive folder URL.

**Tasks**
- Dependencies (backend): add to `/app/backend/requirements.txt`:
  - `google-api-python-client`, `google-auth`, `google-auth-httplib2`, `python-multipart`
- Write `/app/poc_test.py` that:
  - Loads `/app/credentials/tiny-faith-songs-contest-873c0e89fa85.json`
  - Creates folder `POC_Test_<timestamp>` under parent `121rMtc6bwqBBARkwlpTch71WG1ESRVKN` (Shared Drive)
  - Creates a Google Docs file with a sample YouTube/Drive link
  - Streams a ~5MB test file into Drive (resumable upload)
  - Fetches `webViewLink` and prints it
  - Sends SMTP email via `mail.kinhthanhgotay.com:465` SSL to `Tiny.faith2025@gmail.com`
  - Cleans up by deleting the test folder (supportsAllDrives)
- Run POC until it prints **“All POC tests passed”**.

**Notes / best-practice lookup**
- Confirm correct flags for Shared Drive: `supportsAllDrives=True`, and any required fields (`driveId` not needed when using parent folder).
- Validate best practice for streaming upload with `MediaIoBaseUpload(..., resumable=True)` and FastAPI `UploadFile.file`.

---

### Phase 2 — V1 App Development (Next.js + FastAPI)
**User stories (MVP UX)**
1. As a visitor, I can open the landing page and immediately understand the contest and see a clear CTA.
2. As a visitor, I can switch VI/EN and see all content + hero banner swap language correctly.
3. As a parent, I can submit a registration with child/parent names, email, and 6 song submissions.
4. As a parent, for each song I can choose **either** upload **or** link, and the UI prevents invalid combinations.
5. As a parent, I get a success confirmation including the Drive folder URL; if something fails I get a clear error.

**Frontend (port 3000)**
- Replace CRA frontend with **Next.js 14 App Router** in `/app/frontend`.
- Update `package.json` so supervisor’s `yarn start` runs Next.js (e.g., `next dev -p 3000 -H 0.0.0.0` for MVP).
- Install/configure: Tailwind CSS, `next-intl` (VI default, EN optional).
- Pages/sections (single landing page):
  - Hero with locale-specific banner (`banner-horizontal-vi.jpg` / `banner-horizontal-en.jpg`) + CTA scroll-to-form
  - Contest summary: eligibility, timeline, playlist link, prizes, judging criteria
  - Visual sections: poster for mobile (`poster-vertical.jpg`), Tony/Windy images, robot mascot placeholder until provided
  - Registration form:
    - childName, parentName, parentEmail
    - 6 song blocks: toggle (Upload | Link)
      - Upload: file input `video/*`, client-side size check (≤2GB), progress bar
      - Link: URL input with basic validation (YouTube/Drive allowed)
    - required consent checkbox
    - submit → POST `/api/register` using XHR (for upload progress)

**Backend (port 8001)**
- Add `POST /api/register` (FastAPI) receiving `multipart/form-data`:
  - Fields: `child_name`, `parent_name`, `parent_email`, `consent`, and for each song either `song{i}_file` or `song{i}_link`
  - Validate: consent required; for each song exactly one mode selected; email format basic
- Google Drive logic (Service Account):
  - Create subfolder `[Child Name] - [Parent Name]` under parent folder ID `121rMtc6bwqBBARkwlpTch71WG1ESRVKN` with `supportsAllDrives=True`
  - For uploads: stream/resumable upload from `UploadFile.file` (no full buffering)
  - For links: create Google Docs file in folder containing the URL text
  - Return `folder_url` and per-song results
- Email: send SMTP SSL mail to `Tiny.faith2025@gmail.com` including `folder_url` and summary.

**End of Phase 2**
- Run a single end-to-end manual flow: submit mixed uploads/links → verify folder/files/docs in Shared Drive → verify email received.

---

### Phase 3 — Testing & Hardening
**User stories (quality)**
1. As a parent, I see inline validation errors before submitting.
2. As a parent, if Drive fails I see a meaningful message and can retry.
3. As an organizer, I receive consistent emails with the folder link and submission summary.
4. As a visitor on mobile, the page is readable and the poster section is optimized.
5. As a parent, large uploads show continuous progress and don’t freeze the page.

**Tasks**
- Use `testing_agent_v3`:
  - Backend: curl tests for (a) links-only, (b) file-only small test files, (c) mixed mode, (d) invalid payload.
  - Frontend: language toggle, CTA scroll, form validation, submission success path.
- Fix: Shared Drive permission edge cases, SMTP errors, timeouts, file naming, CORS if needed.

---

### Phase 4 — Polish & Delivery
**User stories (polish)**
1. As a visitor, the page looks kid-friendly with consistent theme and spacing.
2. As a visitor, banners/images load fast and don’t shift layout.
3. As a parent, I can complete registration quickly with clear guidance per song.
4. As a parent, success screen includes next steps and contact email.
5. As an organizer, folder naming and file naming are consistent for easy review.

**Tasks**
- Add mascot placeholder now; replace with `robot-mascot.jpg` when provided.
- UI polish: gradients, music-note decorations, section anchors, improved error banners.
- Final regression test (one full submission) + verify Drive + email.

---

## 3) Next Actions
1. Implement Phase 1 POC (`/app/poc_test.py`) + install backend deps; run until “All POC tests passed”.
2. If POC passes, scaffold Next.js 14 in `/app/frontend` and wire i18n + landing sections.
3. Implement `/api/register` using proven Drive/SMTP code from POC.
4. Run 1 end-to-end submission test (mixed upload/link) and iterate.

---

## 4) Success Criteria
- **POC:** Creates & deletes Shared Drive folder; uploads test file via streaming; creates Google Doc with link; sends SMTP email successfully.
- **V1 App:** US1–US14 satisfied; bilingual content switches fully; registration creates folder + 6 artifacts (files/docs) correctly.
- **Reliability:** Clear error handling; no large-file RAM buffering; progress UI works.
- **Delivery:** Landing page looks polished; assets load; organizer receives email with correct folder URL and summary.
