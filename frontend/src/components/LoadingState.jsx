/**
 * Spinner overlay rendered on top of the dimmed image during inference.
 * Positioned absolutely — parent must be position: relative.
 */
export default function LoadingState() {
  return (
    <div className="loading-overlay" role="status" aria-label="Segmenting image…">
      <div className="loading-spinner" aria-hidden="true" />
      <span className="loading-text">segmenting…</span>
    </div>
  );
}
