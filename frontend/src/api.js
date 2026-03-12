import axios from "axios";

export const BACKEND_URL = "https://ideal-space-meme-97w74wr5vqgxh7x94-5173.app.github.dev".replace(/\/$/, "");
export const API_BASE_URL = `${BACKEND_URL}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default API;
