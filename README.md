# TRACE AI

AI Crime Scene Generator from Witness Description. From witness words to visual context.

SVIT Hack Fest Season 1, 2026.

## Project

A responsive React and Vite frontend for organizing witness descriptions into structured observations and an interactive schematic. The sample case is fictional. No backend, AI analysis service, or image-generation provider is included or configured by default.

## TRACE TrustLayer

The reconstruction page includes **TRACE TrustLayer — Evidence & Confidence**. It resolves a supplied source fragment only when it can map it to an exact sentence in the original statement. Details are labeled `STATED`, `INFERRED`, or `UNKNOWN`; unsupported details do not receive invented quotes. Selecting a detail highlights its source sentence and linked SVG object when available. Selecting a linked sentence focuses the corresponding detail. Filters show each status separately. Object fact status and object-position provenance are separate: an object can be stated while its exact position remains illustrative or unknown.

## Run locally

Requires Node.js and npm.

```powershell
cd crime-scene-reconstruction
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Demo and local storage

Choose **Explore Sample Case** to load the fictional statement and review its source-linked observations. Object locations marked as reported come from that statement; other positions are labeled illustrative or manually placed. The image preview explicitly remains unavailable because there is no image provider.

Saved scenes are stored in the browser's local storage on this device only. They are not uploaded or synchronized. Clearing site data removes them.

## Optional backend integration

No backend endpoints or response schemas were present in the inspected project. To configure an existing service, copy `.env.example` to `.env.local`, set the public endpoint URLs, and restart Vite. Do not put secret keys in frontend environment variables.

The analysis endpoint is expected to accept `POST` JSON `{ "description": "..." }` and return a JSON object with a string `summary` and an `objects` array. Optional fields are `title`, `people`, `locationLighting`, `observations`, `uncertainties`, and `missingInformation`. Objects may include `id`, `name`, `description`, `sourceText`, and `position` (`x`, `y`, `label`, `status`). Missing positions are marked unknown rather than asserted as facts. Adapt `src/services/sceneApi.js` to match a different existing backend contract.

Objects, people, settings, and observations may additionally provide `source_text`, `status` (`STATED`, `INFERRED`, or `UNKNOWN`), and `reason`. A source value can be a quote or sentence fragment; the frontend resolves it to the containing sentence only if that text occurs in the submitted statement. `approximate_position` is display-only and does not establish that a position was stated. Explicit `INFERRED` and `UNKNOWN` classifications are preserved.

The optional health endpoint is checked with `GET`. AI Connected is shown only when that check succeeds.

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Use **Load Demo** to preview a fictional incident. **Generate Scene** is a UI placeholder; scene generation is not connected yet. No API key is required.
