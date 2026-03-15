import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi, { ADMIN_TOKEN_KEY } from "../adminApi";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await adminApi.post("/login", form);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={submit}>
        <h2>Admin Login</h2>
        <p>Restricted area. Admin credentials required.</p>
        <input placeholder="Admin email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="One-time passcode (optional)" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} />
        {error ? <div className="admin-error">{error}</div> : null}
        <button className="admin-btn" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}
