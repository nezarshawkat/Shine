import axios from "axios";
import { API_BASE_URL } from "../api";

export const ADMIN_TOKEN_KEY = "shine_admin_token";

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default adminApi;
