# TRACE AI

AI Crime Scene Generator from Witness Description. From witness words to visual context.

SVIT Hack Fest Season 1, 2026.

## Project

A responsive React and Vite frontend for organizing witness descriptions into structured observations and an interactive schematic. The sample case is fictional. No backend, AI analysis service, or image-generation provider is included or configured by default.

## TRACE TrustLayer

The reconstruction page includes **TRACE TrustLayer — Evidence & Confidence**. It resolves a supplied source fragment only when it can map it to an exact sentence in the original statement. Details are labeled `STATED`, `INFERRED`, or `UNKNOWN`; unsupported details do not receive invented quotes. Selecting a detail highlights its source sentence and linked SVG object when available. Selecting a linked sentence focuses the corresponding detail. Filters show each status separately. Object fact status and object-position provenance are separate: an object can be stated while its exact position remains illustrative or unknown.

## Run locally

Requires Node.js/npm and Python 3.10+.

Start the backend in Terminal 1 (PowerShell):

```powershell
cd "C:\Users\adars\Desktop\hackathon 2026\crime-scene-reconstruction\backend"
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, use `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` without activating.

Start the frontend in Terminal 2:

```powershell
cd "C:\Users\adars\Desktop\hackathon 2026\crime-scene-reconstruction"
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173/`. The Vite development proxy forwards `/api/*` and `/health` to `http://127.0.0.1:8000`, so no frontend environment setup is needed for local development. The backend API is at `http://127.0.0.1:8000`; interactive docs are at `http://127.0.0.1:8000/docs`.

Test the backend from a third terminal after installing its dependencies:

```powershell
cd "C:\Users\adars\Desktop\hackathon 2026\crime-scene-reconstruction\backend"
.venv\Scripts\python.exe -m pytest -q
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/analyze-scene -ContentType "application/json" -Body '{"witness_description":"I saw a person standing near a table. A chair was beside the table."}'
```

## Demo and local storage

Choose **Explore Sample Case** to load the fictional statement and review its source-linked observations. Object locations marked as reported come from that statement; other positions are labeled illustrative or manually placed. The image preview explicitly remains unavailable because there is no image provider.

Saved scenes are stored in the browser's local storage on this device only. They are not uploaded or synchronized. Clearing site data removes them.

## Optional backend integration

The bundled analyzer is rule-based demo logic, not a live AI model. The backend accepts `TRACE_CORS_ORIGINS` as a comma-separated environment variable for direct browser clients; local Vite development uses a same-origin proxy. For a separately hosted frontend, set `VITE_RECONSTRUCTION_URL` and `VITE_BACKEND_HEALTH_URL` to public endpoint URLs in `.env.local`, then restart Vite. Never put secret keys in frontend environment variables.

The analysis endpoint is `POST /api/analyze-scene` with `{ "witness_description": "..." }` (the legacy `{ "description": "..." }` key is also accepted). It returns `scene_summary`, `location`, `lighting`, `objects`, `people_descriptions`, `explicit_observations`, `uncertain_details`, `missing_information`, and `analysis_mode`. The frontend adapter in `src/services/sceneApi.js` maps this response into the existing scene UI. Relational positions may include a text label but intentionally have null coordinates; the scene canvas does not draw unlocated objects at guessed coordinates.

Objects, people, settings, and observations may additionally provide `source_text`, `status` (`STATED`, `INFERRED`, or `UNKNOWN`), and `reason`. A source value can be a quote or sentence fragment; the frontend resolves it to the containing sentence only if that text occurs in the submitted statement. `approximate_position` is display-only and does not establish that a position was stated. Explicit `INFERRED` and `UNKNOWN` classifications are preserved.

`GET /health` reports backend status and `analysis_mode: "demo"`. A healthy backend is not the same as live AI; the interface labels this as a demo analyzer.

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Backend tests: from `backend`, run `.venv\Scripts\python.exe -m pytest -q`.

Use **Load Sample** to preview the frontend's fictional sample. **Generate Scene Analysis** calls the FastAPI rule-based demo analyzer when the backend is running. It does not call an AI model and makes no claim of forensic verification.
