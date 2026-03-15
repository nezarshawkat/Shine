import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ADMIN_TOKEN_KEY } from "../adminApi";
import "../admin.css";

const tabs = [
  ["dashboard", "Dashboard"],
  ["users", "Users"],
  ["posts", "Posts"],
  ["events", "Events"],
  ["communities", "Communities"],
  ["reports", "Reports"],
  ["analytics", "Analytics"],
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login");
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Shine Admin</h1>
        <nav>
          {tabs.map(([path, label]) => (
            <NavLink key={path} to={`/admin/${path}`} className={({ isActive }) => `admin-tab ${isActive ? "active" : ""}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="admin-btn secondary">Logout</button>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
