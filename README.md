# TRACE AI

AI Crime Scene Generator from Witness Description. From witness words to visual context.

SVIT Hack Fest Season 1, 2026.

## Project

A responsive React and Vite frontend for organizing witness descriptions into structured observations, an interactive schematic, and an optional AI-generated scene illustration. The sample case is fictional. The bundled analysis service is rule-based demo logic; actual image generation requires an OpenAI API key configured on the backend.

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

To enable AI portrait analysis and image generation, copy `backend\.env.example` to `backend\.env` and set `OPENAI_API_KEY` to an API key with access to the configured models. `OPENAI_TEXT_MODEL` defaults to `gpt-4o-mini`; `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-sunburst`. The backend loads `backend/.env` from the directory containing `main.py`, independent of the terminal's current directory. Keep the key in `backend\.env`; never put it in a frontend environment file or commit it.

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

Choose **Explore Sample Case** to load the fictional statement and review its source-linked observations. Object locations marked as reported come from that statement; other positions are labeled illustrative or manually placed. Choose **Generate Scene Image** in the scene panel to request an illustration; the image preview opens automatically. Without `OPENAI_API_KEY`, the backend returns a setup message and no image is shown. Images are held only in the current page state; they are not saved to scene records or browser storage.

Saved scenes are stored in the browser's local storage on this device only; they are not uploaded or synchronized. When you request an image, the witness statement and structured analysis are sent to OpenAI for generation. Avoid sensitive case data and review OpenAI's current data-use terms. Generated images remain in the current page state and are not saved with the scene.

## Optional backend integration

The bundled analyzer is rule-based demo logic, not a live AI model. The backend accepts `TRACE_CORS_ORIGINS` as a comma-separated environment variable for direct browser clients; local Vite development uses a same-origin proxy. For a separately hosted frontend, set `VITE_RECONSTRUCTION_URL` and `VITE_BACKEND_HEALTH_URL` to public endpoint URLs in `.env.local`, then restart Vite. Never put secret keys in frontend environment variables.

The analysis endpoint is `POST /api/analyze-scene` with `{ "witness_description": "..." }` (the legacy `{ "description": "..." }` key is also accepted). It returns `scene_summary`, `location`, `lighting`, `objects`, `people_descriptions`, `explicit_observations`, `uncertain_details`, `missing_information`, and `analysis_mode`. The frontend adapter in `src/services/sceneApi.js` maps this response into the existing scene UI. Relational positions may include a text label but intentionally have null coordinates; the scene canvas does not draw unlocated objects at guessed coordinates.

The image endpoint is `POST /api/generate-scene-image`. It accepts the existing witness statement and structured analysis, verifies that every `STATED` detail quotes that statement exactly, and builds a constrained neutral-illustration prompt on the backend. It calls OpenAI's Images API and returns a PNG data URL plus warnings. `POST /api/analyze-person-description` uses Structured Outputs to extract appearance traits with exact source quotes; unsupported quotes are downgraded to `UNKNOWN`. `POST /api/generate-suspect-portrait` accepts only reviewed `STATED` traits with exact quotes or explicitly `USER_CONFIRMED` edits, then saves one generated PNG under `backend/generated` and returns a backend-served image path. Its default is a neutral photorealistic composite portrait, with illustration and sketch variants available. Portrait images are illustrative composites, not verified evidence or identification. Provider calls are time-limited, and automated tests mock all provider calls. Missing keys, timeouts, rate limits, rejected keys, and invalid provider responses return explicit errors. Set `VITE_API_BASE_URL` in the frontend `.env.local` only when the backend is hosted at a non-default URL; it is an endpoint base URL, never a secret.

Generated images are illustrative only and never become evidence or alter TRACE TrustLayer classifications. The preview always displays: “AI-generated illustrative scene based on the supplied witness description. This image is not verified evidence or an exact reconstruction.” AI image models may misrepresent details or spatial relationships.

Objects, people, settings, and observations may additionally provide `source_text`, `status` (`STATED`, `INFERRED`, or `UNKNOWN`), and `reason`. A source value can be a quote or sentence fragment; the frontend resolves it to the containing sentence only if that text occurs in the submitted statement. `approximate_position` is display-only and does not establish that a position was stated. Explicit `INFERRED` and `UNKNOWN` classifications are preserved.

`GET /health` reports backend status and `analysis_mode: "demo"`, plus whether image generation and portrait analysis are configured, and the selected text and image models. A healthy backend is not the same as live AI scene analysis; the existing analyzer is still rule-based demo logic. The API key is never included in the health response.

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Backend tests: from `backend`, run `.venv\Scripts\python.exe -m pytest -q`.

Use **Load Sample** to preview the frontend's fictional sample. **Generate Scene Analysis** calls the FastAPI rule-based demo analyzer when the backend is running; scene images are generated only when the separate OpenAI image provider is configured.
