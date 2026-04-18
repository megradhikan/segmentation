import { useState } from "react";
import { segmentImage } from "../api";

export function useSegment() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const segment = async (imageFile, query) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await segmentImage(imageFile, query);
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Segmentation failed. Is the backend running?"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { segment, result, isLoading, error, reset };
}
