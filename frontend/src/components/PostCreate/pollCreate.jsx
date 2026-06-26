import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../../assets/shine-logo.png";
import { AuthContext } from "../AuthProvider.jsx";
import profileDefault from "../../assets/profileDefault.svg";
import { API_BASE_URL, BACKEND_URL } from "../../api";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const BG = "#F7F9FC";
const BORDER = "#D8DDE6";
const LIGHT = "#ECF2F6";

// Toast component
function Toast({ message, type = "error", duration = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  const textColor = type === "error" ? "#FFF" : "#FFC847";

  return (
    <div style={{
      position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
      background: bgColor, color: textColor, padding: "12px 20px", borderRadius: 8,
      fontWeight: 600, fontSize: 14, zIndex: 1100, animation: "slideUp 0.3s ease",
    }}>
      {message}
      <style>{`@keyframes slideUp { 0% { transform: translate(-50%, 100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
}

export default function PollCreate() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [text, setText] = useState("");
  const [choices, setChoices] = useState([{ text: "" }, { text: "" }]);
  const [audience, setAudience] = useState({ name: "Personally", id: null });
  const [showAudience, setShowAudience] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Profile Image Resolution ---
  const profileImg = user?.image 
    ? (user.image.startsWith('http') ? user.image : `${BACKEND_URL}${user.image}`) 
    : profileDefault;

  // Community logic
  const myCommunities = user?.memberships?.map(m => m.community).filter(Boolean) || [];

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("poll_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setText(draft.text || "");
        setChoices(draft.choices || [{ text: "" }, { text: "" }]);
        setAudience(draft.audience || { name: "Personally", id: null });
      } catch (e) { console.error("Failed to parse draft", e); }
    }
  }, []);

  // Handle pre-selection logic
  useEffect(() => {
    if (location.state?.preSelectCommunity) {
      const found = myCommunities.find(c => c.name === location.state.preSelectCommunity);
      if (found) setAudience({ name: found.name, id: found.id });
    }
  }, [location.state, user, myCommunities]);

  const showToast = (message, type = "error") => setToast({ message, type });

  const addChoice = () => {
    if (choices.length >= 5) {
      return showToast("Maximum 5 choices allowed");
    }
    setChoices([...choices, { text: "" }]);
  };

  const deleteChoice = (i) => {
    if (choices.length > 2) setChoices(choices.filter((_, index) => index !== i));
  };

  const updateChoice = (i, value) => {
    const updated = [...choices];
    updated[i].text = value;
    setChoices(updated);
  };

  const handlePost = async () => {
    if (!user) return showToast("You must be logged in to post");
    if (!text.trim()) return showToast("Poll question cannot be empty");
    if (choices.some((c) => !c.text.trim())) return showToast("All choices must have text");

    setLoading(true);

    const pollPayload = {
      authorId: user.id || user._id,
      author: {
        name: user.name,
        image: user.image || profileDefault,
        username: user.username
      },
      type: "poll",
      text: text.trim(),
      communityId: audience.id || null,
      pollOptions: choices.map((c, idx) => ({
        id: `opt_${idx}_${Date.now()}`,
        text: c.text.trim(),
        votes: 0,
        votedUsers: []
      })),
      keywords: [], 
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pollPayload),
      });

      if (response.ok) {
        showToast("Poll published successfully!", "success");
        localStorage.removeItem("poll_draft");
        setTimeout(() => navigate("/forum"), 1500);
      } else {
        const errData = await response.json();
        showToast(errData.message || "Failed to publish poll");
      }
    } catch (error) {
      showToast("Server error. Please try again.");
      console.error("Post Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    const draft = { text, choices, audience };
    localStorage.setItem("poll_draft", JSON.stringify(draft));
    showToast("Draft saved locally", "success");
  };

  return (
    <div className="force-light-page" style={{ background: BG, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .header-container {
            padding: 20px 20px !important;
          }
          .header-inner {
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            gap: 10px !important;
          }
          .logo-img {
            width: 200px !important;
            margin: 0 auto !important;
          }
          .header-divider {
            display: none !important;
          }
          .header-title {
            font-size: 26px !important;
            width: 100% !important;
            margin: 0 auto !important;
          }
          .main-layout {
            flex-direction: column !important;
          }
          .editor-column {
            width: 100% !important;
            padding: 0 20px !important;
            height: auto !important;
            overflow: visible !important;
          }
          .action-sidebar {
            position: relative !important;
            bottom: 0 !important;
            right: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            box-sizing: border-box;
          }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Section */}
      <div className="header-container" style={{ display: "flex", alignItems: "center", padding: "24px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%", flexWrap: "wrap" }} className="header-inner">
          <img src={Logo} className="logo-img" width={264} alt="Logo" style={{ transition: 'width 0.3s' }} />
          <div className="header-divider" style={{ width: 1, height: 48, background: BORDER }}></div>
          <h1 className="header-title" style={{ fontSize: 38, fontWeight: 700, color: PRIMARY, margin: 0 }}>Post - Poll</h1>
        </div>
      </div>

      {/* User Info & Audience */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 40px", gap: 12, marginBottom: 10 }}>
        <img 
          src={profileImg} 
          width={40} 
          height={40} 
          style={{ borderRadius: "50%", objectFit: "cover" }} 
          alt="Profile"
        />
        <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.name || "Guest"}</div>

        <div style={{ position: "relative" }}>
          <div 
            onClick={() => setShowAudience(!showAudience)} 
            style={{ border: `1px solid ${BORDER}`, padding: "8px 14px", borderRadius: 999, fontSize: 14, cursor: "pointer", background: "#fff" }}
          >
            {audience.name} ▾
          </div>
          {showAudience && (
            <div style={{ position: "absolute", top: "110%", left: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 6, zIndex: 1000, minWidth: 160, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
              <div 
                style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${BG}` }} 
                onMouseOver={(e) => e.target.style.background = LIGHT}
                onMouseOut={(e) => e.target.style.background = "transparent"}
                onClick={() => { setAudience({ name: "Personally", id: null }); setShowAudience(false); }}
              >
                Personally
              </div>
              {myCommunities.map((c) => (
                <div 
                  key={c.id} 
                  style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer" }} 
                  onMouseOver={(e) => e.target.style.background = LIGHT}
                  onMouseOut={(e) => e.target.style.background = "transparent"}
                  onClick={() => { setAudience({ name: c.name, id: c.id }); setShowAudience(false); }}
                >
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="main-layout" style={{ display: "flex" }}>
        <div 
          className="hide-scrollbar editor-column" 
          style={{ 
            padding: "0 40px", 
            width: 708, 
            height: "calc(100vh - 160px)", 
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <textarea
            placeholder="What's your question?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%", minHeight: 140, padding: 15, borderRadius: 12, border: `1px solid ${BORDER}`, resize: "none", fontSize: 16 }}
          />

          <div style={{ marginTop: 24, paddingBottom: 120 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ color: PRIMARY }}>Poll Choices</strong>
              {choices.length < 5 && (
                <span onClick={addChoice} style={{ color: "#4A90E2", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  + Add choice
                </span>
              )}
            </div>

            {choices.map((c, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#666" }}>Choice {i + 1}</span>
                  {choices.length > 2 && <span onClick={() => deleteChoice(i)} style={{ fontSize: 12, color: "#FF4C4C", cursor: "pointer" }}>Remove</span>}
                </div>
                <input
                  placeholder={`Option ${i + 1}`}
                  value={c.text}
                  onChange={(e) => updateChoice(i, e.target.value)}
                  style={{ width: "100%", height: 48, padding: "0 15px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 15 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="action-sidebar" style={{ width: 300, position: "fixed", bottom: 40, right: 40, display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            disabled={loading}
            onClick={handlePost}
            style={{ 
              height: 56, fontSize: 18, 
              background: loading ? "#CCC" : ACCENT, 
              borderRadius: 14, border: "none", 
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", 
              color: PRIMARY, transition: "transform 0.1s" 
            }}
            onMouseDown={e => !loading && (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={e => !loading && (e.currentTarget.style.transform = "scale(1)")}
          >
            {loading ? "Publishing..." : "Publish Poll"}
          </button>

          <button
            onClick={saveDraft}
            style={{ 
              height: 56, fontSize: 18, 
              background: "#fff", 
              borderRadius: 14, border: `1px solid ${BORDER}`, 
              fontWeight: 600, cursor: "pointer", color: PRIMARY 
            }}
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}
