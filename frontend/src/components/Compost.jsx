import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "/workspaces/Shine/frontend/src/assets/shine-logo.png";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import PostCard from "/workspaces/Shine/frontend/src/components/posts/PostCard.jsx";

// Icons for the preview footer
import ShareIcon from "/workspaces/Shine/frontend/src/assets/Share.svg";
import TagIcon from "/workspaces/Shine/frontend/src/assets/Tag.svg";
import FlagIcon from "/workspaces/Shine/frontend/src/assets/Flag.svg";
import ArrowIcon from "/workspaces/Shine/frontend/src/assets/arrow.svg";
import CommentIcon from "/workspaces/Shine/frontend/src/assets/comment.svg";
import HeartIcon from "/workspaces/Shine/frontend/src/assets/Heart.svg";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const BORDER = "#D8DDE6";
const BG = "#F7F9FC";
const LIGHT = "#ECF2F6";

export default function Compost() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Protection & State Recovery
  const communityName = location.state?.communityName;

  useEffect(() => {
    if (!communityName) {
      // If no community name in state, they shouldn't be here
      navigate("/create-community", { replace: true });
    }
  }, [communityName, navigate]);

  // Mock data for the "First Post" preview
  const previewData = {
    views: "23.4k",
    type: "Analysis",
    keywords: ["Palestine", "US tariffs on China", "International Trade"],
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " UTC",
    text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing... "
  };

  // Prevent render if redirecting
  if (!communityName) return null;

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", padding: "24px 40px", gap: 20 }}>
        <img src={Logo} width={220} alt="Logo" />
        <div style={{ width: 1, height: 40, background: BORDER }}></div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: PRIMARY }}>Create your first post</h1>
      </div>

      {/* CENTERED CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", paddingBottom: 100 }}>
        
        {/* POST PREVIEW CARD */}
        <div style={{ width: "850px", transform: "scale(0.95)" }}>
          <PostCard>
            {/* Top Row: User & Stats */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img 
                  src={user?.image || "/src/assets/profileDefault.svg"} 
                  style={{ width: 45, height: 45, borderRadius: "50%", border: `1px solid ${BORDER}` }} 
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: PRIMARY }}>{user?.name || "You"}</div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {/* UPDATED: Dynamically show community name */}
                    From <span style={{ fontWeight: 700, color: PRIMARY }}>{communityName}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{previewData.views} views</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>{previewData.type}</span>
              </div>
            </div>

            {/* Middle Row: Content & Image Placeholder */}
            <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {previewData.keywords.map((k, i) => (
                    <span key={i} style={{ background: LIGHT, border: `1px solid ${PRIMARY}`, padding: "4px 12px", borderRadius: 8, fontSize: 13 }}>{k}</span>
                  ))}
                </div>
                <p style={{ fontSize: 15, lineHeight: "1.6", color: "#333", margin: 0 }}>
                  {previewData.text} 
                  <span style={{ color: ACCENT, fontWeight: 600, cursor: "pointer" }}>read more</span>
                </p>
              </div>
              
              {/* Image Placeholder */}
              <div style={{ width: 280, height: 260, background: LIGHT, borderRadius: 15, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                 <div style={{ display: "flex", gap: 6, position: "absolute", bottom: 15 }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 1 ? PRIMARY : BORDER }}></div>)}
                 </div>
              </div>
            </div>

            {/* Bottom Row: Meta & Icons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
              <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Date: {previewData.date} &nbsp; Time: {previewData.time}</span>
                <span style={{ color: ACCENT, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>View sources</span>
              </div>
              <div style={{ display: "flex", gap: 18 }}>
                {[HeartIcon, CommentIcon, ShareIcon, TagIcon, ArrowIcon, FlagIcon].map((icon, i) => (
                  <img key={i} src={icon} width={20} style={{ cursor: "pointer", opacity: 0.8 }} />
                ))}
              </div>
            </div>
          </PostCard>
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 600, color: PRIMARY, marginTop: 30 }}>
          Create your first post in <span style={{ color: ACCENT }}>{communityName}</span>
        </h2>
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{ position: "fixed", bottom: 50, right: 50, display: "flex", alignItems: "center", gap: 32 }}>
        <button 
          onClick={() => navigate("/")} 
          style={{ background: "none", border: "none", fontSize: 18, fontWeight: 600, color: PRIMARY, cursor: "pointer" }}
        >
          Skip
        </button>
        <button 
          onClick={() => navigate("/opinion-create", { state: { preSelectCommunity: communityName } })} 
          style={{ 
            padding: "12px 48px", background: PRIMARY, color: ACCENT, borderRadius: "12px",
            border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(28, 39, 76, 0.15)"
          }}
        >
          Create post
        </button>
      </div>
    </div>
  );
}