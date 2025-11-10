## Purpose

Short, actionable guidance for AI coding agents working on this repo — a single-file static web app that syncs links to a Google Sheet via a Google Apps Script web app.

## Quick project overview
- Single HTML file: `Link Organizer.html` is the entire app (UI, styles, and JS). There is no build step; run by opening the file in a browser.
- External integration: the app calls a deployed Google Apps Script Web App using the `SHEET_API_URL` constant near the top of the script.

## Key files and symbols to inspect first
- `Link Organizer.html` — entire codebase. Focus on these identifiers:
  - SHEET_API_URL (string constant) — set this to the deployed Apps Script URL to enable cloud sync.
  - Functions: `loadLinksFromSheet()`, `addLinkToSheet(newLink)`, `removeLinkFromSheet(row)` — these implement the Sheets interface.
  - DOM IDs used by UI logic: `link-input`, `tags-input`, `description-input`, `add-link`, `link-list`, `export-btn`, `import-btn`, `dark-mode-toggle`.

## Data contracts (important)
- In-memory link shape (JS):
  - { row, id, url, description, tags: [], timestamp }
- On the Google Sheet (round-tripped):
  - `tags` are stored as a comma-separated string in the sheet; agents should convert to/from arrays when reading/writing.
  - `row` is required by the Apps Script to delete a specific sheet row — keep this field when removing items.
  - `id` is generated with `Date.now().toString()`; `timestamp` is numeric.

## Integration and network caveats (must-read)
- The app uses fetch POST calls with `mode: 'no-cors'` for the sheet writes. That makes POST responses opaque.
  - Do NOT rely on response bodies from POST requests — code already assumes opaque responses and refreshes via `loadLinksFromSheet()`.
  - If you change POST to a CORS request, you must also update the Apps Script deployment and web app permissions to allow CORS and return JSON.

## Common maintenance tasks & how to test locally
- To enable cloud sync: set `SHEET_API_URL` to your deployed Apps Script URL (a web app URL that accepts `?action=get` for reads and POST for writes).
- To test without a live Apps Script: temporarily stub `loadLinksFromSheet()` to load a local JSON object (or change `SHEET_API_URL` to point to a local test server).
- Since this is a static file, open `Link Organizer.html` in a browser to validate UI/DOM changes. Use DevTools console to inspect errors and console.log outputs.

## Editing patterns & examples (concrete)
- Adding a new field to a link:
  1. Update the JS data shape in the mapping inside `loadLinksFromSheet()`.
  2. Update `renderLinks()` to include the field in the DOM template.
  3. If persisted, update the Apps Script to read/write the new column and preserve `row` and `id` behavior.

- Example: Tags handling — current pattern is comma-separated in sheet, normalized with `.split(',').map(t => t.trim())` in `loadLinksFromSheet()` and joined before POST using `.join(',')`.

## What to avoid / watch-outs
- Don't remove the `row` property — it's used by `removeLinkFromSheet(row)` to delete the correct sheet row.
- Avoid changing POST fetch options without coordinating Apps Script changes (CORS, response format).
- The app assumes a flat array of links returned from the Apps Script (`Array.isArray(data)` check). Preserve that shape on the server-side.

## Agent behavior guidance
- Be conservative: make minimal, incremental changes to the single-file app. Prefer adding small helper functions rather than large reorganizations.
- When changing remote integration, add a clear TODO in the file and a short comment explaining required Apps Script changes and permissions.
- Prefer editing only `Link Organizer.html` unless the user instructs otherwise; no package manifests or build infra are present.

## Example edits to reference in PR descriptions
- "Update `SHEET_API_URL` and add a local fetch stub for offline testing; adjust `loadLinksFromSheet()` to accept local JSON when `SHEET_API_URL` is falsy."
- "Normalize tag casing during load: map tags to lower-case in `loadLinksFromSheet()` and preserve CSV format for storage."

---
If anything is unclear or you'd like more detail for a specific change (e.g., examples for a mock server or a small refactor to separate UI vs API logic), tell me which part to expand and I will iterate.
