import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 60000,
});

export async function segmentImage(imageFile, query) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("query", query);
  const response = await api.post("/segment", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}
