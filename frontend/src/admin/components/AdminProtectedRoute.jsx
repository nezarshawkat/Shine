import React from "react";
import { Navigate } from "react-router-dom";
import { getAdminToken } from "../adminApi";

export default function AdminProtectedRoute({ children }) {
  const token = getAdminToken();
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}
