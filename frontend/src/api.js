import axios from "axios";

const API = axios.create({
  baseURL: "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api", // correct Codespaces URL
  withCredentials: true,
});

export default API;
