# projectinfos.md — Photomaton POC (Docker • WSL2 • Local Browser)

## 1) One-liner
A local, Dockerized **photobooth** (“Photomaton”) you open in your browser. It shows a **live webcam preview**, lets you **capture** a photo, **send it to a pluggable image-generation service** (LLM/vision model) to **stylize** it (e.g., toon/vampire/comic), then displays the **transformed image** with a short **animation** and **saves both original and result** locally. A **right-side vertical carousel** keeps recent shots; clicking any item shows **before/after**.

> FR context (original intent):  
> « On clique, ça prend une photo, ça l’envoie à un LLM d’image (ex: Gemini, Banana, Nano), ça la transforme en cartoon, et on l’affiche. Il y a plusieurs boutons de styles (vampire, “Simpson”-like, etc.), un carrousel vertical à droite avec les photos prises, on peut revoir l’originale vs transformée, tout est sauvegardé localement (chemins, style, timestamp). Au moment de prendre la photo: décompte 10→1, freeze & flash, état de chargement pendant la transformation, puis l’image transformée s’affiche ~10s avant de revenir au live. »

---

## 2) Goals & Non-Goals

### Goals (MVP)
- **Local app via Docker** on Windows + **WSL2/Ubuntu**, reachable at `http://localhost:<port>`.
- **Webcam live preview** in the browser (desktop/laptop).
- **Capture workflow**: 10-second countdown → freeze+flash animation → send captured frame to backend → call current **provider** → receive stylized image → **show for ~10s** → return to live preview.
- **Style presets**: at least 3 named buttons (e.g., `toon-yellow`, `vampire`, `comic-ink`).  
  *Note*: avoid trademarked names; use descriptive, generic wording.
- **Local persistence** for every shot: store **original** and **transformed** images, plus metadata (style, timestamp, provider, etc.).
- **Right-side vertical carousel** of recent photos; clicking opens a **before/after** view (toggle or slider).
- **Privacy by default**: local-only, no analytics, controlled CORS, no cloud calls unless a provider is enabled.

### Non-Goals (POC)
- Mobile/browser cross-platform hardening beyond desktop Chrome/Edge.
- Multi-user accounts, auth, or cloud sync.
- GPU-accelerated local models (can be a later feature).
- Advanced editing (masks, stickers, multi-prompt pipelines).
- Printing, sharing, or export flows (nice-to-have later).

---

## 3) Primary Use Cases / User Stories

1. **As a user**, I open the app locally and see my **webcam preview**.
2. I pick a **style preset** and hit **Capture** (or press Space).
3. I watch a **10→1 countdown**, the preview **freezes** with a brief **flash** effect, then I see a **loading** indicator.
4. Within a short time, I see the **stylized photo** for about **10 seconds**; it then returns to the **live preview**.
5. The **carousel** shows a new thumbnail; clicking it shows **before vs after** with an easy toggle.
6. If I take more photos, I can **scroll** the carousel and **reopen** any item.

---

## 4) UX Requirements

### Layout
- **Left/Main**: Webcam stage (16:9 container), overlays for countdown, freeze flash, loading, and the temporary stylized result (~10s).
- **Top or Bottom Bar**: **Style preset buttons** (prominent, accessible). Optional dropdown if many styles.
- **Right Rail**: **Vertical carousel** (thumbnails newest first). Scrollable, with hover/tooltip timestamp & style.

### Interactions & States
- **Countdown Overlay (10s)**: Large digits centered, 1-sec cadence. Cancel with `Esc`.
- **Freeze & Flash**: On capture, freeze the last video frame as an image layer; subtle scale/flash animation ~250–400ms.
- **Loading State**: Replace frozen frame with a spinner/progress pulse while waiting for provider response.
- **Show Transformed**: Display returned stylized image in the main stage for **~10s** (configurable), then revert to **live feed**.
- **Carousel Click**: Opens a viewer with **Before/After** toggle or slider (keyboard accessible).
- **Keyboard**: `Space` capture, `←/→` navigate carousel items, `Esc` close overlays.

### Accessibility
- Focus outlines; tab order; ARIA labels for controls; high-contrast mode toggle (optional).

---

## 5) Functional Requirements

### Capture & Transform Flow
1. Frontend requests **camera access** via `getUserMedia`.
2. On capture:
   - Frontend renders **countdown** (10→1).
   - Grabs a frame to a **canvas**; encodes to **JPEG/PNG** (configurable quality).
   - Sends image to backend `POST /api/capture` → backend saves **original** file, creates a record.
   - Frontend calls `POST /api/transform` with `{ photoId, preset }`.
   - Backend invokes the **selected provider adapter**. On success, backend writes the **transformed** file and updates the record.
   - Frontend **polls or awaits** completion and then swaps to show transformed for ~10s.
3. The **carousel** updates with the new item.

### Style Presets
- **Preset list** is **provider-agnostic**: title, description, optional prompt hints & negative hints.
- Examples:
  - `toon-yellow` – flat colors, bold outlines, 2D cartoon vibe.
  - `vampire` – pale skin, cinematic contrast, subtle fangs; **no gore**.
  - `comic-ink` – high-contrast ink lines, halftone shading.

### Persistence
- **Images on disk** under `/data/photos/<uuid>/original.jpg` and `/data/photos/<uuid>/styled-<preset>.jpg`.
- **Metadata** saved to a local **database** (SQLite) with fields:
  - `id`, `createdAt`, `preset`, `originalPath`, `transformedPath`, `provider`, `meta (JSON)`.
- **Alternative** (fallback/debug): a **single JSON** index file (not default due to corruption risk).

### Carousel & Viewer
- Shows **thumbnail** (prefer the transformed version).  
- Clicking opens **viewer** with before/after switch or slider; display style name, timestamp, provider.

### Safety/Housekeeping
- Optional “**Wipe Library**” action moves items to `/data/.trash/<timestamp>/…` (no hard delete).
- No auto-delete; user retains full control.

---

## 6) Non-Functional Requirements

- **Local by default**: no external calls unless a provider is explicitly configured.
- **Performance targets** (POC):  
  - Countdown & animations are **butter-smooth** on a typical laptop.  
  - Mock provider returns in ≤ 1s; cloud providers usually **2–12s** (network/model dependent).
- **Reliability**: API responds with structured errors; UI shows actionable toasts and safe retries.
- **Security & Privacy**:  
  - CORS: `http://localhost:*` only.  
  - Secrets via env, never logged; `.env.example` provided.  
  - No analytics/trackers.

---

## 7) Architecture (High-level)

- **Frontend**: React + Vite + TypeScript + Tailwind.  
  Components (reusable): `CameraFeed`, `CountdownOverlay`, `FreezeFrame`, `LoadingState`, `TransformedStage`, `RightRailCarousel`, `BeforeAfterToggle`, `PresetButton`.
- **Backend**: Node/Express + TypeScript.  
  Responsibilities: file IO, provider orchestration, persistence (SQLite/Drizzle), REST API, static file serving (built UI).
- **Provider Adapters** (pluggable):
  - `mock` (local posterize/edge effect using `sharp`) for offline demos.
  - `gemini-imagen` (PRIMARY): Google's Gemini Imagen API for image transformation (https://ai.google.dev/gemini-api/docs/imagen#javascript)
- **Storage**:  
  - **Filesystem** under `/data` (Docker volume).  
  - **SQLite** DB at `/data/photomaton.db` for metadata; migrations at startup.

**Data Flow (POC)**  
Browser → `/api/capture` (save original) → `/api/transform` (provider) → write transformed → return result → front-end shows/stores & updates carousel.

---

## 8) API Outline (initial)

- `POST /api/capture`  
  **Body**: multipart file or base64 image; **Resp**: `{ id, originalPath, createdAt }`
- `POST /api/transform`  
  **Body**: `{ photoId, preset }`; **Resp**: `{ transformedPath, provider, meta }`
- `GET /api/photos?cursor=<id>&limit=…`  
  **Resp**: paged list of `{ id, createdAt, preset, originalPath, transformedPath, provider }`
- `GET /api/photos/:id`  
  Detail record including `meta`.
- `POST /api/photos/:id/wipe`  
  Move original & transformed to `.trash`; update record.
- `GET /healthz`  
  Liveness check.

**Validation**: All inputs/outputs validated with Zod; consistent error envelope:  
`{ error: { code: string, message: string, details?: any } }`

---

## 12) Risks & Mitigations

- **Trademarked style naming** → Use **generic** descriptors (e.g., “toon-yellow”).
- **Provider latency/limits** → Keep `mock` provider for demos; show clear loading; add retry/backoff.
- **File corruption** (sudden stop) → Use **SQLite transactions**; write files atomically; never hard-delete by default.
- **Camera API differences** → Target desktop Chromium first; document browser requirements.
- 
