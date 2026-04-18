import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

/**
 * Minimal drag-and-drop upload zone.
 *
 * @param {object}    props
 * @param {Function}  props.onImageSelected - Called with (File, objectURL) on selection,
 *                                           or (null, null) when cleared.
 * @param {File|null} props.currentImage    - Currently selected file, or null.
 */
export default function UploadZone({ onImageSelected, currentImage }) {
  const [typeError, setTypeError] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setTypeError("Unsupported format.");
        return;
      }
      setTypeError(null);
      const file = acceptedFiles[0];
      if (!file) return;
      onImageSelected(file, URL.createObjectURL(file));
    },
    [onImageSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
  });

  const handleRemove = (e) => {
    e.stopPropagation();
    setTypeError(null);
    onImageSelected(null, null);
  };

  if (currentImage) {
    return (
      <div className="upload-preview-wrap">
        <img
          src={URL.createObjectURL(currentImage)}
          alt="Selected image preview"
          className="upload-thumb"
        />
        <div className="upload-file-meta">
          <span className="upload-filename" title={currentImage.name}>
            {currentImage.name}
          </span>
          <button
            className="upload-remove-btn"
            onClick={handleRemove}
            aria-label="Remove selected image"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        {...getRootProps()}
        className={[
          "upload-zone",
          isDragActive ? "upload-zone--drag-active" : "",
          typeError    ? "upload-zone--error"       : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Drop an image here, or click to browse"
      >
        <input {...getInputProps()} aria-label="Upload image file" />
        <div className="upload-placeholder">
          <svg
            className="upload-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="13" width="18" height="8" rx="1" />
            <polyline points="12 3 12 13" />
            <polyline points="8 7 12 3 16 7" />
          </svg>
          <span className="upload-hint">drop image</span>
          <span className="upload-formats">jpg · png · webp · max 10mb</span>
        </div>
      </div>
      {typeError && (
        <p className="upload-field-error" role="alert">
          {typeError}
        </p>
      )}
    </>
  );
}
