import { API_BASE_URL, buildMediaUrl } from "../api";
// src/components/Header.jsx
import React, { useContext, useState, useEffect } from "react";
import "../styles/Header.css";
import logo from "../assets/shine-logo.png";
import heart from "../assets/heart.svg";
import profileDefault from "../assets/profileDefault.svg";
import MobileMenu from "./MobileMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthProvider.jsx";

// Update this to match your backend URL

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1216);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1216);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Helper function to handle the image path
  const getImageUrl = (img) => {
    return buildMediaUrl(img) || profileDefault;
  };

  return (
    <header className="header">
      {/* LEFT: Logo */}
      <div className="header-left">
        <button
          type="button"
          className="logo-button"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="SHINE Logo" className="logo" />
        </button>
      </div>

      {/* CENTER: Nav buttons */}
      {!isMobile && (
        <div className="header-center">
          <button
            className={`header-button ${
              location.pathname.startsWith("/forum") ? "active-yellow" : ""
            }`}
            onClick={() => navigate("/forum")}
          >
            Forum
          </button>

          <button
            className={`header-button ${
              location.pathname === "/communities" ? "active-yellow" : ""
            }`}
            onClick={() => navigate("/communities")}
          >
            Communities
          </button>

          <button
            className={`header-button ${
              location.pathname === "/articles" ? "active-yellow" : ""
            }`}
            onClick={() => navigate("/articles")}
          >
            Articles
          </button>

          <button
            className={`header-button ${
              location.pathname === "/events" ? "active-yellow" : ""
            }`}
            onClick={() => navigate("/events")}
          >
            Events
          </button>

          {/* UPDATED: Added navigate to /donate */}
          <button 
            type="button" 
            className="header-button donate-button"
            onClick={() => navigate("/donate")}
          >
            Donate <img src={heart} alt="Heart" />
          </button>
        </div>
      )}

      {/* RIGHT SIDE */}
      <div className="header-right">
        {!user && !isMobile && (
          <>
            <button
              className="login-button"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>

            <button
              className="be-member-button"
              onClick={() => navigate("/signup")}
            >
              <span>Be a member</span>
            </button>
          </>
        )}

        {user && !isMobile && (
          <div
            className="profile-right"
            onClick={() => navigate(`/profile/${user.username}`)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <img
              src={getImageUrl(user.image)}
              alt="Profile"
              onError={(e) => {
                e.target.src = profileDefault;
              }}
              style={{
                width: "35px",
                height: "35px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />

            <span
              style={{
                fontSize: "20px",
                color: "#1C274C",
              }}
            >
              {user.name}
            </span>
          </div>
        )}
      </div>

      {/* MOBILE CONTROLS */}
      {isMobile && (
        <div className="mobile-controls">
          {/* UPDATED: Added navigate to /donate for mobile icon */}
          <img 
            src={heart} 
            alt="Donate" 
            className="mobile-icon" 
            onClick={() => navigate("/donate")}
            style={{ cursor: "pointer" }}
          />

          {user ? (
            <img
              src={getImageUrl(user?.image)}
              alt="Profile"
              className="mobile-icon"
              onError={(e) => {
                e.target.src = profileDefault;
              }}
              onClick={() => navigate(`/profile/${user.username}`)}
              style={{
                cursor: "pointer",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <button className="mobile-login-btn" onClick={() => navigate("/login")}>
              Login
            </button>
          )}

          <button
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>
      )}

      {isMobile && isMenuOpen && (
        <MobileMenu onClose={() => setIsMenuOpen(false)} />
      )}
    </header>
  );
}

export default Header;
