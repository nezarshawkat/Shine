import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../Header";
import PostBody from "./PostBody";
import LeftSidebar from "/workspaces/Shine/frontend/src/components/forum/LeftSidebar.jsx";
import RightSidebar from "/workspaces/Shine/frontend/src/components/forum/RightSidebar.jsx";
import "/workspaces/Shine/frontend/src/styles/PostView.css";

export default function PostView() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Check if there is actual history to go back to.
  // window.history.length > 1 means the user didn't just open this tab at this URL.
  const hasHistory = window.history.length > 1;

  // 2. Only show the button if there is a history to return to.
  // This prevents the button from appearing on a fresh direct-link visit.
  const showBackButton = hasHistory;

  // 3. Get the name of the previous page from state, or default to "Previous Page"
  const fromName = location.state?.fromName || "Previous Page";

  const handleBack = () => {
    // Standard browser back behavior
    navigate(-1);
  };

  return (
    <div className="forum-page">
      <Header />
      <div className="forum-container">
        {/* LEFT COLUMN */}
        <div className="left-column">
          <LeftSidebar />
        </div>

        {/* CENTER COLUMN */}
        <div className="center-column">
          {showBackButton && (
            <button
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
          <PostBody />
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}