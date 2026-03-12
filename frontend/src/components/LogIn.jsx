import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "./AuthProvider.jsx";
import "../styles/LogIn.css";
import logo from "../assets/shine-logo.png";

// Remove trailing slash if present
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev").replace(/\/$/, "");

const LogIn = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const url = `${BACKEND_URL}/api/users/login`;
    console.log("Logging in to:", url); // 🔍 debug

    try {
      const res = await axios.post(url, { emailOrUsername, password });
      console.log("Login response:", res.data); // 🔍 debug
      login(res.data.user, res.data.token);
      navigate("/forum");
    } catch (err) {
      console.error("Login error:", err); // 🔍 debug
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-left-side">
        <img src={logo} alt="SHINE Logo" className="logo" />
        <h1 className="title">Log In</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <label>
            Email or Username
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Email or Username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </label>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" className="login-btn">Log In</button>
        </form>
        <p className="signin-text">
          Don’t have an account? <span onClick={() => navigate("/signup")}>Sign up</span>
        </p>
      </div>
      <div className="login-right-side"></div>
    </div>
  );
};

export default LogIn;
