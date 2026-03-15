import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import adminApi, { ADMIN_TOKEN_KEY } from "../adminApi";

export default function AdminRouteGuard({ children }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setStatus("unauthorized");
      return;
    }
    adminApi
      .get("/session")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("unauthorized"));
  }, []);

  if (status === "loading") return <div className="admin-card">Validating admin session…</div>;
  if (status === "unauthorized") return <Navigate to="/admin/login" replace />;
  return children;
}
