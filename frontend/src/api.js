import axios from "axios";

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

// If no explicit backend URL is provided, keep API requests relative so the Vite proxy can route them locally.
export const BACKEND_URL = envBackendUrl;
export const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export const buildMediaUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("blob:")) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return `${BACKEND_URL}${pathOrUrl}`;
  return `${BACKEND_URL}/${pathOrUrl}`;
};

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const method = String(config?.method || "get").toLowerCase();
    const canRetry = method === "get" || method === "head";
    const retryableFailure = !error.response || RETRYABLE_STATUS_CODES.has(error.response.status);

    if (!config || !canRetry || !retryableFailure || (config.__retryCount || 0) >= 4) {
      return Promise.reject(error);
    }

    config.__retryCount = (config.__retryCount || 0) + 1;
    const delayMs = Math.min(1000 * (2 ** (config.__retryCount - 1)), 8000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return API.request(config);
  }
);

export default API;
