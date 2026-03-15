import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import AdminRouteGuard from "./components/AdminRouteGuard";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Posts from "./pages/Posts";
import Events from "./pages/Events";
import Communities from "./pages/Communities";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route
        path="*"
        element={
          <AdminRouteGuard>
            <AdminLayout />
          </AdminRouteGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="posts" element={<Posts />} />
        <Route path="events" element={<Events />} />
        <Route path="communities" element={<Communities />} />
        <Route path="reports" element={<Reports />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}
