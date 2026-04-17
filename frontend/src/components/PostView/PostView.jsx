import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PostBody from "./PostBody";
import LeftSidebar from "../forum/LeftSidebar.jsx";
import RightSidebar from "../forum/RightSidebar.jsx";
import "../../styles/PostView.css";

export default function PostView() {
  const location = useLocation();
  const navigate = useNavigate();

  // We keep the history check, but you can also default to true if it's still not showing
  const hasHistory = window.history.length > 1;
  const showBackButton = hasHistory || location.state?.fromName; 
  const fromName = location.state?.fromName || "Previous Page";

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="forum-page">
      {/* Mobile-specific styles */}
      <style>{`
        @media (max-width: 768px) {
          .forum-container {
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            margin-top: 10px;
          }
          .left-column, .right-column {
            display: none !important; 
          }
          .center-column {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            display: block !important;
          }
          .mobile-padding-wrapper {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .back-button-mobile {
            display: flex !important; /* Force display on mobile */
            margin-left: 10px !important;
            margin-bottom: 15px !important;
            position: relative;
            z-index: 10;
          }
        }
      `}</style>

      <div className="forum-container">
        {/* LEFT COLUMN */}
        <div className="left-column">
          <LeftSidebar />
        </div>

        {/* CENTER COLUMN */}
        <div className="center-column">
          {showBackButton && (
            <button
              className="back-button-mobile"
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 20,
                background: "transparent",
                border: "none",
                color: "#FFC847",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                padding: "8px 0",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ fontSize: 20, lineHeight: 0 }}>←</span> 
              Back to {fromName}
            </button>
          )}
          
          {/* Wrapper to apply the 6px padding on mobile only */}
          <div className="mobile-padding-wrapper">
            <PostBody />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
