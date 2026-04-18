import { useState } from "react";

/**
 * Labelled query input with a full-width submit button below.
 *
 * @param {object}   props
 * @param {Function} props.onSubmit   - Called with the trimmed query string.
 * @param {boolean}  props.isLoading  - Shows CSS spinner, disables controls.
 * @param {boolean}  props.disabled   - Disables input when no image is selected.
 */
export default function QueryInput({ onSubmit, isLoading, disabled }) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (!query.trim() || isLoading || disabled) return;
    onSubmit(query.trim());
  };

  return (
    <div>
      <label className="query-label" htmlFor="query-input">
        QUERY
      </label>
      <input
        id="query-input"
        className="query-input-field"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="e.g. the red backpack"
        disabled={disabled || isLoading}
        aria-label="Segmentation query"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        className="segment-btn"
        onClick={handleSubmit}
        disabled={disabled || isLoading || !query.trim()}
        aria-label={isLoading ? "Segmenting…" : "Run segmentation"}
      >
        {isLoading ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : (
          "SEGMENT IMAGE"
        )}
      </button>
    </div>
  );
}
