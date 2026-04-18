const bgrToRgb = ([b, g, r]) => `rgb(${r}, ${g}, ${b})`;

/**
 * Sidebar list of per-detection result cards with selection highlighting.
 *
 * @param {object}      props
 * @param {Array|null}  props.detections  - Detection objects from API, or null before first run.
 * @param {boolean}     props.hasResult   - True once any API response has arrived.
 * @param {number|null} props.selectedIdx - Index of the currently selected detection.
 * @param {Function}    props.onSelect    - Called with index (or null to deselect).
 */
export default function DetectionChips({ detections, hasResult, selectedIdx, onSelect }) {
  return (
    <div>
      <span className="section-label">DETECTIONS</span>

      {!hasResult ? (
        <span className="detections-empty">—</span>
      ) : !detections || detections.length === 0 ? (
        <span className="detections-none">no match</span>
      ) : (
        <div className="detections-list" role="list" aria-label="Detected objects">
          {detections.map((det, i) => {
            const isSelected = selectedIdx === i;
            const isDimmed   = selectedIdx !== null && !isSelected;
            return (
              <div
                key={i}
                className={[
                  "detection-chip",
                  isSelected ? "detection-chip--selected" : "",
                  isDimmed   ? "detection-chip--dimmed"   : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${det.label}, confidence ${det.confidence.toFixed(2)}`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => onSelect(isSelected ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(isSelected ? null : i);
                  }
                }}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
