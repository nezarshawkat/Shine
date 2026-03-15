import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import AdminLogin from "../pages/AdminLogin";
import Dashboard from "../pages/Dashboard";
import Users from "../pages/Users";
import Posts from "../pages/Posts";
import Events from "../pages/Events";
import Communities from "../pages/Communities";
import Reports from "../pages/Reports";
import Analytics from "../pages/Analytics";
import Support from "../pages/Support";
import SystemMessages from "../pages/SystemMessages";

export default function AdminApp() {
  return (
    <>
      {/* Scoped Admin Styles */}
      <style>{`
        .admin-shell { min-height: 100vh; background: #f5f7fb; color: #1f2937; }

        .admin-header {
          position: sticky;
          top:0;
          z-index:10;
          display:flex;
          align-items:center;
          gap:16px;
          justify-content:space-between;
          padding:12px 20px;
          background:#111827;
          color:white;
        }

        .admin-header nav { display:flex; gap:8px; flex-wrap:wrap; }

        .admin-header a {
          color:#d1d5db;
          text-decoration:none;
          padding:6px 10px;
          border-radius:8px;
        }

        .admin-header a.active {
          background:#2563eb;
          color:white;
        }

        .admin-main {
          padding:20px;
          max-width:1200px;
          margin:0 auto;
        }

        .admin-card, .metric-card {
          background:white;
          border-radius:12px;
          box-shadow:0 4px 12px rgba(0,0,0,0.08);
          padding:16px;
        }

        .admin-login {
          min-height:100vh;
          display:grid;
          place-items:center;
          background:linear-gradient(135deg,#0f172a,#1d4ed8);
        }

        .admin-login .admin-card {
          width:min(420px,92vw);
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        /* Scoped form styles */
        .admin-shell input,
        .admin-shell select,
        .admin-shell button {
          padding:10px;
          border-radius:8px;
          border:1px solid #d1d5db;
        }

        .admin-shell button {
          cursor:pointer;
          background:#2563eb;
          color:white;
          border:none;
        }

        .admin-shell button.danger { background:#dc2626; }

        .cards-grid {
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
          gap:12px;
          margin:12px 0 20px;
        }

        .metric-card span {
          text-transform:capitalize;
          color:#6b7280;
          font-size:0.9rem;
        }

        .metric-card strong {
          font-size:1.4rem;
          display:block;
          margin-top:6px;
        }

        .admin-table {
          width:100%;
          border-collapse:collapse;
          background:white;
          border-radius:12px;
          overflow:hidden;
          margin-bottom:20px;
        }

        .admin-table th,
        .admin-table td {
          padding:10px;
          border-bottom:1px solid #e5e7eb;
          text-align:left;
        }

        .actions { display:flex; gap:6px; flex-wrap:wrap; }

        .toolbar { display:flex; gap:10px; margin:12px 0; }

        .chart-grid {
          display:grid;
          grid-template-columns: repeat(auto-fit,minmax(280px,1fr));
          gap:12px;
          margin-bottom:14px;
        }

        .error-text { color:#dc2626; }
      `}</style>

      <Routes>
        <Route path="login" element={<AdminLogin />} />

        <Route
          path="*"
          element={
            <AdminProtectedRoute>
              <div className="admin-shell">
                <AdminLayout />
              </div>
            </AdminProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="posts" element={<Posts />} />
          <Route path="events" element={<Events />} />
          <Route path="communities" element={<Communities />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="support" element={<Support />} />
          <Route path="system-messages" element={<SystemMessages />} />

          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}