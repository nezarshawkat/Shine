import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "./AuthProvider.jsx";
import GoogleLogin from "./GoogleAuth.jsx";
import "../styles/SignUp.css";
import logo from "../assets/shine-logo.png";
import googleIcon from "../assets/google.svg";
import { API_BASE_URL } from "../api";

const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    username: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/users/signup`,
        formData
      );

      login(res.data.user, res.data.token);
      navigate("/forum");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page-container force-light-page">
      {/* LEFT SIDE */}
      <div className="signup-left-side">
        <img src={logo} alt="SHINE Logo" className="logo" />
        <h1 className="title">Sign Up</h1>

        <form className="signup-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              placeholder="mail@website.com"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Min. 8 characters"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </label>

          <label>
            Username
            <input
              type="text"
              placeholder="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </label>

          <div className="terms">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">I agree to the Terms & Conditions</label>
          </div>

          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          {/* Wrapper to ensure the Google component respects form width and styling */}
          <div className="google-btn-wrapper">
            <GoogleLogin icon={googleIcon} />
          </div>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="signin-text">
          Already have an Account?{" "}
          <span onClick={() => navigate("/login")}>Log in</span>
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="signup-right-side"></div>
    </div>
  );
};

export default SignUp;
