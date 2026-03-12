import { io } from "socket.io-client";

let socket = null;

if (import.meta.env.VITE_ENABLE_SOCKET === "true") {
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
  socket = io(SOCKET_URL, { withCredentials: true });
}

export { socket };
