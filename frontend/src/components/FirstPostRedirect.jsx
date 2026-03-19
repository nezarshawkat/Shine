import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../assets/shine-logo.png";
import { AuthContext } from "./AuthProvider.jsx";
import OpinionPost from "./posts/opinionPost.jsx";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const BORDER = "#D8DDE6";
const BG = "#F7F9FC";

export default function FirstPostRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // Retrieve community data passed from the creation step
  const communityName = location.state?.communityName || "Your Community";
  const communityId = location.state?.communityId || "1";

  // Mock Post Data to show in the center
  const mockPostData = {
    _id: "preview-123",
    type: "Opinion",
    text: "This is a preview of your first post! Use this space to share your community's goals, mission, or your very first insight with your new members.",
    keywords: ["Welcome", "New Beginnings", communityName],
    views: 0,
    profile: {
      userId: user?.id || "1",
      name: user?.name || "User Name",
      image: user?.image || ""
    },
    communityId: communityId, // Link it to the newly created community
    date: new Date().toLocaleDateString("en-GB"),
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    images: [],
    sources: []
  };

  const handleCreateClick = () => {
    // Navigate to opinion create and pre-select the community
    navigate("/opinion-create", { 
      state: { 
        preSelectCommunity: communityName,
        isFirstPost: true 
      } 
    });
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", padding: "24px 40px", gap: 20 }}>
        <img src={Logo} width={220} alt="Logo" />
        <div style={{ width: 1, height: 40, background: BORDER }}></div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: PRIMARY, margin: 0 }}>Create your first post</h1>
      </div>

      {/* CENTERED PREVIEW */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: PRIMARY, marginBottom: 30 }}>
            Create your first post in your community
        </h2>
        
        {/* THE REAL POST COMPONENT */}
        <div style={{ width: "100%", maxWidth: "800px", pointerEvents: "none", opacity: 0.9 }}>
            <OpinionPost post={mockPostData} />
        </div>
      </div>

      {/* FOOTER BUTTONS */}
      <div style={{ position: "fixed", bottom: 50, right: 50, display: "flex", alignItems: "center", gap: 32 }}>
        <button 
          onClick={() => navigate(`/community/${communityId}`)} 
          style={{ background: "none", border: "none", fontSize: 18, fontWeight: 600, color: PRIMARY, cursor: "pointer" }}
        >
          Skip
        </button>
        <button 
          onClick={handleCreateClick} 
          style={{ 
            padding: "12px 48px", background: PRIMARY, color: ACCENT, borderRadius: "12px",
            border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(28, 39, 76, 0.15)"
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}