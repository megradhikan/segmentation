# Frontend — Segmentation UI

React 19 + Vite 8 single-page application. Provides drag-and-drop image upload, a natural-language query bar, and a side-by-side result view with per-detection confidence chips.

---

## How to run

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000` so the backend and frontend run on separate ports without CORS issues during development.

---

## Available scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `vite build` | Production bundle to `dist/` |
| `preview` | `vite preview` | Preview the production build locally |
| `lint` | `eslint .` | Run ESLint across all source files |

---

## Environment variables

Create a `frontend/.env` file to override defaults:

```bash
# Override the backend URL for production builds (optional)
VITE_API_URL=https://your-api.example.com
```

Without `VITE_API_URL`, the Vite proxy handles requests in development and the bundled build expects the API at the same origin.

---

## Key files

| File | Purpose |
|---|---|
| `src/App.jsx` | Root component, top-level state (image file, preview URL) |
| `src/hooks/useSegment.js` | `segment()` / `reset()`, exposes `result`, `isLoading`, `error` |
| `src/api.js` | Axios instance (60 s timeout), `segmentImage()`, `checkHealth()` |
| `src/components/UploadZone.jsx` | react-dropzone wrapper, accepts JPG/PNG/WEBP |
| `src/components/QueryInput.jsx` | Controlled text input + Segment button |
| `src/components/ResultView.jsx` | Side-by-side panels, export PNG button |
| `src/components/DetectionChips.jsx` | Coloured confidence-bar cards per detection |
| `src/components/LoadingState.jsx` | Shimmer skeleton placeholder |
| `vite.config.js` | Port 5173, `/api` proxy to backend |
