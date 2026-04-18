import { useState, useEffect } from "react";
import UploadZone from "./components/UploadZone";
import QueryInput from "./components/QueryInput";
import ResultView from "./components/ResultView";
import DetectionChips from "./components/DetectionChips";
import { useSegment } from "./hooks/useSegment";
import { checkHealth } from "./api";
import "./App.css";

export default function App() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const { segment, result, isLoading, error, reset } = useSegment();

  // Poll /health every 5 s until models report ready.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await checkHealth();
        if (!cancelled && data.models_loaded) {
          setModelsReady(true);
          return;
        }
      } catch { /* backend unreachable — retry */ }
      if (!cancelled) setTimeout(poll, 5000);
    };
    poll();
    return () => { cancelled = true; };
  }, []);

  const handleImageSelected = (file, previewUrl) => {
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setSelectedIdx(null);
    reset();
  };

  const handleSubmit = (query) => {
    if (!imageFile) return;
    setSelectedIdx(null);
    segment(imageFile, query);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo-area">
          <div className="logo-mark" aria-hidden="true" />
          <span className="logo-text">SAM·VISION</span>
        </div>
        <div className="status-area" aria-live="polite" aria-atomic="true">
          <div
            className={`status-dot ${modelsReady ? "status-dot--ready" : "status-dot--loading"}`}
            aria-hidden="true"
          />
          <span className="status-text">
            {modelsReady ? "models ready" : "loading models…"}
          </span>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Controls">
          <div className="sidebar-section">
            <UploadZone
              onImageSelected={handleImageSelected}
              currentImage={imageFile}
            />
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <QueryInput
              onSubmit={handleSubmit}
              isLoading={isLoading}
              disabled={!imageFile}
            />
            {error && (
              <div className="error-block" role="alert" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <DetectionChips
              detections={result?.detections ?? null}
              hasResult={!!result}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
            />
          </div>
        </aside>

        <main className="canvas" aria-label="Image viewer">
          <ResultView
            imagePreviewUrl={imagePreviewUrl}
            result={result}
            isLoading={isLoading}
            selectedIdx={selectedIdx}
            onSelectDetection={setSelectedIdx}
          />
        </main>
      </div>
    </div>
  );
}
