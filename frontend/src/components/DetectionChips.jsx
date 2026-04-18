const bgrToRgb = ([b, g, r]) => `rgb(${r}, ${g}, ${b})`;

/**
 * Sidebar list of per-detection result cards.
 *
 * @param {object}      props
 * @param {Array|null}  props.detections - Detection objects from API, or null before first run.
 * @param {boolean}     props.hasResult  - True once any API response has arrived.
 */
export default function DetectionChips({ detections, hasResult }) {
  return (
    <div>
      <span className="section-label">DETECTIONS</span>

      {!hasResult ? (
        <span className="detections-empty">—</span>
      ) : !detections || detections.length === 0 ? (
        <span className="detections-none">no match</span>
      ) : (
        <div className="detections-list" role="list" aria-label="Detected objects">
          {detections.map((det, i) => (
            <div
              key={i}
              className="detection-chip"
              role="listitem"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="chip-left">
                <div
                  className="chip-color"
                  style={{ background: bgrToRgb(det.color) }}
                  aria-hidden="true"
                />
                <span className="chip-label">{det.label}</span>
              </div>
              <span className="chip-score">{det.confidence.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
