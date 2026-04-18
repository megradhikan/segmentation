import { useState, useEffect, useRef, useCallback } from "react";
import LoadingState from "./LoadingState";

const bgrToRgb  = ([b, g, r]) => `rgb(${r}, ${g}, ${b})`;
const bgrToRgba = ([b, g, r], a) => `rgba(${r}, ${g}, ${b}, ${a})`;

/**
 * Canvas area — four display states:
 *   1. empty    — no image selected
 *   2. preview  — image selected, not yet segmented
 *   3. loading  — inference in progress
 *   4. result   — segmented output + meta bar + interactive overlay
 *
 * @param {object}      props
 * @param {string|null} props.imagePreviewUrl    - Object URL for the uploaded image.
 * @param {object|null} props.result             - Segmentation response from the API.
 * @param {boolean}     props.isLoading          - True while waiting for inference.
 * @param {number|null} props.selectedIdx        - Index of the currently selected detection.
 * @param {Function}    props.onSelectDetection  - Called with index (or null to deselect).
 */
export default function ResultView({
  imagePreviewUrl,
  result,
  isLoading,
  selectedIdx,
  onSelectDetection,
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Tracks the rendered position/size of the image within its CSS box so the
  // SVG overlay can be positioned to pixel-perfectly cover it.
  const imgRef = useRef(null);
  const [overlay, setOverlay] = useState(null);

  const recompute = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const cw = img.clientWidth;
    const ch = img.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    // object-fit: contain uses the smallest scale that fits both dimensions.
    const scale = Math.min(cw / nw, ch / nh);
    const rw = nw * scale;
    const rh = nh * scale;
    setOverlay({ rw, rh, ox: (cw - rw) / 2, oy: (ch - rh) / 2, nw, nh, scale });
  }, []);

  const displaySrc = result
    ? (showOriginal
        ? imagePreviewUrl
        : `data:image/png;base64,${result.masked_image_b64}`)
    : null;

  // Reattach ResizeObserver whenever the displayed image changes.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(img);
    return () => ro.disconnect();
  }, [recompute, displaySrc]);

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
          width="48" height="48"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
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
        <img src={imagePreviewUrl} alt="" className="canvas-loading-img" aria-hidden="true" />
        <LoadingState />
      </div>
    );
  }

  /* 3. Preview state */
  if (!result) {
    return (
      <div className="canvas-preview">
        <img src={imagePreviewUrl} alt="Uploaded image" className="canvas-preview-img" />
        <div className="canvas-preview-hint" aria-hidden="true">
          <span className="canvas-preview-hint-text">enter a query and click segment</span>
        </div>
      </div>
    );
  }

  /* 4. Result state */
  const detections = result.detections ?? [];
  const hasOverlay = overlay && !showOriginal && detections.length > 0;

  return (
    <div className="canvas-result">
      <div className="result-image-wrap">
        <img
          ref={imgRef}
          src={displaySrc}
          alt={showOriginal ? "Original image" : "Segmented image with masks overlaid"}
          className={`result-img${transitioning ? " result-img--fading" : ""}`}
          onLoad={recompute}
        />

        {/* SVG overlay: one transparent clickable rect per detection bounding box.
            Only rendered on the segmented view — boxes are in segmented-image pixel space. */}
        {hasOverlay && (
          <svg
            className="result-overlay"
            style={{
              position: "absolute",
              top:    overlay.oy,
              left:   overlay.ox,
              width:  overlay.rw,
              height: overlay.rh,
            }}
            viewBox={`0 0 ${overlay.nw} ${overlay.nh}`}
            aria-hidden="true"
          >
            {detections.map((det, i) => {
              const [x1, y1, x2, y2] = det.box;
              const color     = bgrToRgb(det.color);
              const colorFill = bgrToRgba(det.color, 0.15);
              const isSelected = selectedIdx === i;
              // Keep stroke width visually ~2.5px regardless of image scale.
              const sw = 2.5 / overlay.scale;
              return (
                <rect
                  key={i}
                  className={`det-box${isSelected ? " det-box--selected" : ""}`}
                  x={x1} y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  strokeWidth={sw}
                  style={isSelected ? { fill: colorFill, stroke: color } : {}}
                  onClick={() => onSelectDetection(isSelected ? null : i)}
                />
              );
            })}
          </svg>
        )}
      </div>

      <div className="result-meta">
        <div className="meta-item meta-item--query">
          <span className="meta-label">QUERY</span>
          <span className="meta-query-text" title={result.query}>{result.query}</span>
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
