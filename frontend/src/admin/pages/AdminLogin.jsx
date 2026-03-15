import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminRequest, setAdminToken } from "../adminApi";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const { data } = await adminRequest("post", "/login", form);
      setAdminToken(data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Scoped Admin CSS */}
      <style>{`
        .admin-login { 
          min-height: 100vh; 
          display: grid; 
          place-items: center; 
          background: linear-gradient(135deg,#0f172a,#1d4ed8); 
        }

        .admin-login .admin-card { 
          width: min(420px, 92vw); 
          display: flex; 
          flex-direction: column; 
          gap: 10px; 
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          padding: 16px;
        }

        input, select, button { 
          padding: 10px; 
          border-radius: 8px; 
          border: 1px solid #d1d5db; 
        }

        button { 
          cursor: pointer; 
          background: #2563eb; 
          color: white; 
          border: none; 
        }

        button.danger { background: #dc2626; }

        .error-text { color: #dc2626; }

        h2 { margin-bottom: 12px; text-align: center; }
      `}</style>

      <div className="admin-login">
        <form className="admin-card" onSubmit={onSubmit}>
          <h2>Admin Login</h2>
          <input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            placeholder="OTP (optional)"
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value })}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </>
  );
}