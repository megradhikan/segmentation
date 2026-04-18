import { useState } from "react";
import LoadingState from "./LoadingState";

/**
 * Canvas area — renders one of four states based on props:
 *   1. empty    — no image selected yet
 *   2. preview  — image selected, inference not yet run
 *   3. loading  — inference in progress
 *   4. result   — segmented output with meta bar and original/segmented toggle
 *
 * @param {object}      props
 * @param {string|null} props.imagePreviewUrl - Object URL for the uploaded image.
 * @param {object|null} props.result          - Segmentation response from the API.
 * @param {boolean}     props.isLoading       - True while waiting for inference.
 */
export default function ResultView({ imagePreviewUrl, result, isLoading }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const handleToggle = () => {
    setTransitioning(true);
    setTimeout(() => {
      setShowOriginal((v) => !v);
      setTransitioning(false);
    }, 150);
  };

  /* 1. Empty state */
  if (!imagePreviewUrl) {
    return (
      <div className="canvas-empty">
        <svg
          className="canvas-empty-icon"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="13" width="18" height="8" rx="1" />
          <polyline points="12 3 12 13" />
          <polyline points="8 7 12 3 16 7" />
        </svg>
        <p className="canvas-empty-text">upload an image to begin</p>
      </div>
    );
  }

  /* 2. Loading state */
  if (isLoading) {
    return (
      <div className="canvas-loading">
        <img
          src={imagePreviewUrl}
          alt=""
          className="canvas-loading-img"
          aria-hidden="true"
        />
        <LoadingState />
      </div>
    );
  }

  /* 3. Preview state */
  if (!result) {
    return (
      <div className="canvas-preview">
        <img
          src={imagePreviewUrl}
          alt="Uploaded image"
          className="canvas-preview-img"
        />
        <div className="canvas-preview-hint" aria-hidden="true">
          <span className="canvas-preview-hint-text">
            enter a query and click segment
          </span>
        </div>
      </div>
    );
  }

  /* 4. Result state */
  const displaySrc = showOriginal
    ? imagePreviewUrl
    : `data:image/png;base64,${result.masked_image_b64}`;

  return (
    <div className="canvas-result">
      <div className="result-image-wrap">
        <img
          src={displaySrc}
          alt={showOriginal ? "Original image" : "Segmented image with masks overlaid"}
          className={`result-img${transitioning ? " result-img--fading" : ""}`}
        />
      </div>

      <div className="result-meta">
        <div className="meta-item meta-item--query">
          <span className="meta-label">QUERY</span>
          <span className="meta-query-text" title={result.query}>
            {result.query}
          </span>
        </div>

        <div className="meta-item meta-item--objects" aria-label={`${result.count} objects found`}>
          <span className="meta-label">OBJECTS</span>
          <span className="meta-count">{result.count}</span>
        </div>

        <div className="meta-item meta-item--toggle">
          <span className="meta-label" aria-hidden="true">&nbsp;</span>
          <button
            className="toggle-btn"
            onClick={handleToggle}
            aria-label={showOriginal ? "Switch to segmented view" : "Switch to original view"}
          >
            {showOriginal ? "VIEW SEGMENTED" : "VIEW ORIGINAL"}
          </button>
        </div>
      </div>
    </div>
  );
}
