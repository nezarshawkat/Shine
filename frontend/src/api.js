import axios from "axios";

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

// If no explicit backend URL is provided, keep requests relative so Vite proxy can route
// both API and media (/uploads) during local development.
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

export default API;
