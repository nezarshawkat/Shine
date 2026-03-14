import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "./AuthProvider.jsx";
import GoogleLogin from "/workspaces/Shine/frontend/src/components/GoogleAuth.jsx";
import "../styles/LogIn.css";
import logo from "../assets/shine-logo.png";
import googleIcon from "/workspaces/Shine/frontend/src/assets/google.svg";
import { BACKEND_URL } from "../api";

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

    try {
      const res = await axios.post(url, { emailOrUsername, password });
      login(res.data.user, res.data.token);
      navigate("/forum");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="login-page-container">
      {/* LEFT SIDE */}
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
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </label>

          {error && <p className="error-text" style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>{error}</p>}
          
          <button type="submit" className="login-btn">Log In</button>

          <div className="divider">
            <span>or</span>
          </div>

          {/* Google Button Section */}
          <div className="google-btn-wrapper">
            <GoogleLogin icon={googleIcon} />
          </div>
        </form>

        <p className="signin-text">
          Don’t have an account? <span onClick={() => navigate("/signup")}>Sign up</span>
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right-side"></div>
    </div>
  );
};

export default LogIn;