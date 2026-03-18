import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "/workspaces/Shine/frontend/src/assets/shine-logo.png";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import API from "../api";
import profileDefault from "/workspaces/Shine/frontend/src/assets/profileDefault.svg";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const BORDER = "#D8DDE6";
const BG = "#FFFFFF"; 
const TEXT_SECONDARY = "#4A4A4A";

function Toast({ message, type = "success", duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: bgColor, color: "#FFF", padding: "12px 24px", borderRadius: 12,
      fontWeight: 600, zIndex: 2000,
    }}>
      {message}
    </div>
  );
}

export default function ArticleApply() {
  const { user, token, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [introduction, setIntroduction] = useState("");
  const [workSample, setWorkSample] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleApply = async () => {
    if (!introduction.trim() || !workSample.trim() || !socialLink.trim()) {
      return showToast("Please fill in all fields before applying", "error");
    }

    if (!token) {
      return showToast("Please log in first", "error");
    }

    try {
      setSubmitting(true);
      await API.post(
        "/articles/apply",
        {
          introduction: introduction.trim(),
          workSample: workSample.trim(),
          socialLink: socialLink.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser?.({ isAuthorized: false });
      showToast("Application submitted successfully!");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      const message = error?.response?.data?.error || "Failed to submit application";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const sectionHeaderStyle = { fontSize: 22, fontWeight: 700, color: PRIMARY, marginBottom: 8 };
  const subTextStyle = { fontSize: 16, color: TEXT_SECONDARY, marginBottom: 20, lineHeight: "1.5" };
  const listStyle = { listStyleType: "none", paddingLeft: 5, color: TEXT_SECONDARY, marginBottom: 20 };
  const listItemStyle = { marginBottom: 8, display: "flex", alignItems: "flex-start", gap: "8px" };
  
  const textareaStyle = {
    width: "100%", height: 160, padding: "16px", borderRadius: 12, border: `1px solid ${BORDER}`,
    background: "#F9F9F9", fontSize: 16, outline: "none", resize: "none", boxSizing: "border-box"
  };

  const inputStyle = {
    ...textareaStyle,
    height: "54px", // Standard input height
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 120 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={Logo} width={220} alt="Logo" />
          <div style={{ width: 1, height: 40, background: BORDER }}></div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: PRIMARY }}>Apply for article posting</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={user?.image || profileDefault} width={40} height={40} style={{ borderRadius: "50%" }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>{user?.name || "User"}</span>
        </div>
      </div>

      {/* GUIDELINES CONTENT */}
      <div style={{ padding: "0 40px", maxWidth: 900 }}>
        <h2 style={sectionHeaderStyle}>Article Submission Guidelines</h2>
        <p style={subTextStyle}>Thank you for your interest in contributing to SHINE!<br />
          Before submitting articles, please read the following carefully to ensure your works aligns with our mission and values.</p>

        <h3 style={{ ...sectionHeaderStyle, fontSize: 18 }}>We welcome submissions that:</h3>
        <ul style={listStyle}>
          <li style={listItemStyle}><span>•</span> Promote political awareness, youth engagement, and civic responsibility.</li>
          <li style={listItemStyle}><span>•</span> Offer original opinions, analysis, critiques, or research-based insights.</li>
          <li style={listItemStyle}><span>•</span> Are respectful, well-written, and factually accurate.</li>
          <li style={listItemStyle}><span>•</span> Reflect thoughtful, diverse perspectives without promoting hate or misinformation.</li>
        </ul>

        <p style={subTextStyle}>Whether you're a student, activist, researcher, or simply passionate about political topics — your voice matters. However, all submissions will be reviewed before publishing.</p>

        <h2 style={sectionHeaderStyle}>Prohibited Content</h2>
        <p style={subTextStyle}>To maintain the quality and integrity of our platform, we do not accept content that:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><span>•</span> Contains hate speech, personal attacks, or discriminatory language.</li>
          <li style={listItemStyle}><span>•</span> Spreads misinformation, conspiracy theories, or unverified claims.</li>
          <li style={listItemStyle}><span>•</span> Is plagiarized or copied from other sources without proper citation.</li>
          <li style={listItemStyle}><span>•</span> Includes spam, self-promotion, or irrelevant links.</li>
          <li style={listItemStyle}><span>•</span> Promotes extremism, political violence, or illegal activity.</li>
        </ul>

        <h2 style={sectionHeaderStyle}>Editorial Rights</h2>
        <p style={subTextStyle}>By submitting an article:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><span>•</span> You agree that your content may be edited for clarity, grammar, or structure.</li>
          <li style={listItemStyle}><span>•</span> SHINE reserves the right to reject or remove articles that do not meet our standards.</li>
          <li style={listItemStyle}><span>•</span> Repeated violations may result in loss of publishing privileges.</li>
        </ul>

        <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "40px 0" }} />

        {/* INPUT SECTIONS */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={sectionHeaderStyle}>Write an introduction</h2>
          <p style={subTextStyle}>Write an introduction about yourself to make us understand your background, motivations, and interests.</p>
          <textarea 
            style={textareaStyle} 
            placeholder="Write no more than 600 words." 
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={sectionHeaderStyle}>Show us your work</h2>
            <a href="#" style={{ color: PRIMARY, fontSize: 14, fontWeight: 600 }}>See what do we need</a>
          </div>
          <p style={subTextStyle}>We need to see a sample of your work to consider whether you are qualified to post article or not.</p>
          <textarea 
            style={textareaStyle} 
            placeholder="Write a sample of your work here." 
            value={workSample}
            onChange={(e) => setWorkSample(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 40 }}>
          <h2 style={sectionHeaderStyle}>Social Media Link</h2>
          <p style={subTextStyle}>Provide a link to your professional or social media profile (e.g., LinkedIn, X, or Portfolio) to help us verify your identity and credibility.</p>
          <input 
            type="text"
            style={inputStyle} 
            placeholder="Paste your link here (e.g., https://linkedin.com/in/username)" 
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
          />
        </div>
      </div>

      {/* APPLY BUTTON */}
      <button 
        onClick={handleApply} 
        disabled={!introduction || !workSample || !socialLink || submitting}
        style={{ 
          position: "fixed",
          bottom: 50,
          right: 50,
          padding: "12px 64px", 
          background: (introduction && workSample && socialLink && !submitting) ? PRIMARY : "#D9D9D9", 
          color: (introduction && workSample && socialLink && !submitting) ? ACCENT : "#888",
          borderRadius: "12px", 
          border: "none", 
          fontSize: 18, 
          fontWeight: 800, 
          cursor: (introduction && workSample && socialLink && !submitting) ? "pointer" : "not-allowed",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 100
        }}
      >
        {submitting ? "Submitting..." : "Apply"}
      </button>
    </div>
  );
}