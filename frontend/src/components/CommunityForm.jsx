import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/shine-logo.png";
import EarthIcon from "../assets/Earth.svg";
import LockIcon from "../assets/Lock.svg";
import { AuthContext } from "./AuthProvider.jsx";
import profileDefault from "../assets/profileDefault.svg";
import { API_BASE_URL } from "../api";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const LIGHT = "#ECF2F6";
const BORDER = "#D8DDE6";
const BG = "#F7F9FC";

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
      fontWeight: 600, zIndex: 2000, animation: "slideUp 0.3s ease",
    }}>
      {message}
      <style>{`@keyframes slideUp { from { bottom: 0; opacity: 0; } to { bottom: 20; opacity: 1; } }`}</style>
    </div>
  );
}

export default function CommunityForm() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("Public");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [iconFile, setIconFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Interests State ---
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState([]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "icon") setIconFile(file);
    else setBannerFile(file);
  };

  // --- Interests Tag Handlers ---
  const handleInterestKeyDown = (e) => {
    if (e.key === "Enter" && interestInput.trim()) {
      e.preventDefault();
      // Prevent duplicate interests
      if (!interests.includes(interestInput.trim())) {
        setInterests([...interests, interestInput.trim()]);
      }
      setInterestInput("");
    }
    if (e.key === "Backspace" && !interestInput && interests.length) {
      setInterests(interests.slice(0, -1));
    }
  };

  const removeInterest = (indexToRemove) => {
    setInterests(interests.filter((_, index) => index !== indexToRemove));
  };

  const handleCreate = async () => {
    // 1. Validation
    if (!name.trim()) return showToast("Community name is required", "error");
    if (!slogan.trim()) return showToast("Community slogan is required", "error");
    if (!description.trim()) return showToast("Description is required", "error");
    if (interests.length < 1) return showToast("Add at least 1 interest", "error");
    if (!iconFile) return showToast("Please upload a group icon", "error");
    if (!bannerFile) return showToast("Please upload a banner image", "error");
    if (!user) return showToast("You must be logged in to create a community", "error");

    setIsSubmitting(true);

    try {
      const userId = user.id || user._id;

      // 2. Prepare Multipart Form Data
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slogan", slogan);
      formData.append("discription", description); 
      formData.append("privacy", privacy);
      formData.append("adminId", userId);
      formData.append("icon", iconFile);
      formData.append("banner", bannerFile);
      
      // Sending Interests as a stringified array for the backend to parse
      formData.append("interests", JSON.stringify(interests));

      // 3. API Call
      const response = await fetch(`${API_BASE_URL}/communities`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Community created successfully!");
        setTimeout(() => {
          navigate("/invite-people", { 
            state: { 
                communityName: name, 
                communityId: data.id 
            } 
          });
        }, 1500);
      } else {
        showToast(data.message || "Failed to create community", "error");
      }
    } catch (err) {
      console.error("Creation Error:", err);
      showToast("Server error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle = { display: "block", fontSize: 18, fontWeight: 600, marginBottom: 8, color: PRIMARY };
  const inputStyle = {
    width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`,
    background: "#FFF", fontSize: 16, outline: "none", marginBottom: 24
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 100 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={Logo} width={220} alt="Logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')} />
          <div style={{ width: 1, height: 40, background: BORDER }}></div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: PRIMARY, margin: 0 }}>Create a community</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={user?.image || profileDefault} width={40} height={40} style={{ borderRadius: "50%", objectFit: 'cover' }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>{user?.name || "User"}</span>
        </div>
      </div>

      {/* Form Fields */}
      <div style={{ padding: "0 40px", display: "flex", flexDirection: "column" }}>
        <div style={{ maxWidth: 700 }}>
          <label style={labelStyle}>Community name</label>
          <input style={inputStyle} placeholder="Enter name" value={name} onChange={(e) => setName(e.target.value)} />

          <label style={labelStyle}>Community slogan</label>
          <input style={inputStyle} placeholder="Enter slogan" value={slogan} onChange={(e) => setSlogan(e.target.value)} />

          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, height: 160, resize: "none" }}
            placeholder="Tell us about your community..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Interests Tag Box */}
          <label style={labelStyle}>Interests</label>
          <div 
            style={{ 
              border: `1px solid ${BORDER}`, 
              borderRadius: 12, 
              padding: "10px 14px", 
              display: "flex", 
              flexWrap: "wrap", 
              alignItems: "center", 
              gap: 8, 
              background: "#fff", 
              cursor: "text",
              marginBottom: 24,
              minHeight: "54px"
            }}
            onClick={() => document.getElementById("interest-input")?.focus()}
          >
            {interests.map((tag, i) => (
              <div 
                key={i} 
                style={{ 
                  background: LIGHT, 
                  border: `1px solid ${PRIMARY}`, 
                  borderRadius: 8, 
                  padding: "4px 10px", 
                  fontSize: 14, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6,
                  color: PRIMARY,
                  fontWeight: 500
                }}
              >
                {tag}
                <span 
                  onClick={(e) => { e.stopPropagation(); removeInterest(i); }} 
                  style={{ cursor: "pointer", fontWeight: 700, fontSize: 16, color: PRIMARY, lineHeight: 1 }}
                >
                  &times;
                </span>
              </div>
            ))}
            <input
              id="interest-input"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              placeholder={interests.length === 0 ? "Add interest and press Enter" : ""}
              style={{ border: "none", outline: "none", fontSize: 16, minWidth: 150, flexGrow: 1, padding: "4px 0" }}
            />
          </div>

          <label style={labelStyle}>Privacy</label>
          <div style={{ position: "relative", width: 180, marginBottom: 24 }}>
            <div onClick={() => setShowPrivacy(!showPrivacy)} style={{ padding: "12px 16px", background: "#FFF", border: `1px solid ${BORDER}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <img src={privacy === "Public" ? EarthIcon : LockIcon} width={18} alt="icon" />
              <span style={{ flex: 1 }}>{privacy}</span>
              <span>▼</span>
            </div>
            {showPrivacy && (
              <div style={{ position: "absolute", top: "110%", left: 0, width: "100%", background: "#FFF", border: `1px solid ${BORDER}`, borderRadius: 12, zIndex: 10, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                {[{ n: "Public", i: EarthIcon }, { n: "Private", i: LockIcon }].map((opt) => (
                  <div key={opt.n} onClick={() => { setPrivacy(opt.n); setShowPrivacy(false); }} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onMouseOver={(e) => e.currentTarget.style.background = LIGHT} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                    <img src={opt.i} width={16} alt="" /> {opt.n}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Icon Upload */}
          <label style={labelStyle}>Group icon</label>
          <input type="file" id="icon-up" hidden accept="image/*" onChange={(e) => handleFileChange(e, "icon")} />
          <button onClick={() => document.getElementById('icon-up').click()} style={{ padding: "12px 20px", border: `1px solid ${PRIMARY}`, borderRadius: 10, background: iconFile ? LIGHT : "transparent", cursor: "pointer", fontWeight: 600, marginBottom: 24, color: PRIMARY }}>
            {iconFile ? `✓ ${iconFile.name.substring(0, 15)}...` : "Upload icon"}
          </button>

          {/* Banner Upload */}
          <label style={labelStyle}>Banner</label>
          <input type="file" id="banner-up" hidden accept="image/*" onChange={(e) => handleFileChange(e, "banner")} />
          <button onClick={() => document.getElementById('banner-up').click()} style={{ padding: "12px 20px", border: `1px solid ${PRIMARY}`, borderRadius: 10, background: bannerFile ? LIGHT : "transparent", cursor: "pointer", fontWeight: 600, marginBottom: 40, color: PRIMARY }}>
            {bannerFile ? `✓ ${bannerFile.name.substring(0, 15)}...` : "Upload banner"}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleCreate}
        disabled={isSubmitting}
        style={{
          position: "fixed", bottom: 50, right: 50, padding: "12px 48px",
          background: isSubmitting ? "#ccc" : PRIMARY, color: ACCENT, borderRadius: "12px", border: "none",
          fontSize: 18, fontWeight: 800, cursor: isSubmitting ? "default" : "pointer",
          boxShadow: "0 4px 12px rgba(28, 39, 76, 0.15)", zIndex: 100
        }}
      >
        {isSubmitting ? "Creating..." : "Create Community"}
      </button>
    </div>
  );
}