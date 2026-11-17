import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, 
});



export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}


export async function predictImage(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const response = await api.post("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}


export async function getHistory() {
  const response = await api.get("/history");
  return response.data;
}

export async function clearHistory() {
  const response = await api.delete("/history");
  return response.data;
}

// ============================================================
// Statistics
// ============================================================

export async function getStats() {
  const response = await api.get("/stats");
  return response.data;
}

// ============================================================
// Model Info & Performance
// ============================================================

export async function getModelInfo() {
  const response = await api.get("/model-info");
  return response.data;
}
