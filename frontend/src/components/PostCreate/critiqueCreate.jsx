import React, { useState, useEffect, useContext } from "react";
import Logo from "/workspaces/Shine/frontend/src/assets/shine-logo.png";
import ArrowIcon from "/workspaces/Shine/frontend/src/assets/arrow.svg";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import profileDefault from "/workspaces/Shine/frontend/src/assets/profileDefault.svg";
import axios from "axios";
import { API_BASE_URL, BACKEND_URL } from "../../api";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const LIGHT = "#ECF2F6";
const BORDER = "#D8DDE6";
const BG = "#F7F9FC";
const LINK_BLUE = "#4A90E2"; 

/* ---------- Toast Component ---------- */
function Toast({ message, type = "success", duration = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  const textColor = type === "error" ? "#FFF" : "#FFC847";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        background: bgColor,
        color: textColor,
        padding: "12px 20px",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        zIndex: 1100,
        animation: "slideUp 0.3s ease",
      }}
    >
      {message}
      <style>
        {`
          @keyframes slideUp {
            0% { transform: translate(-50%, 100%); opacity: 0; }
            100% { transform: translate(-50%, 0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

export default function CritiqueCreate() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedPost, setSelectedPost] = useState(null);
  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [sources, setSources] = useState([{ name: "", link: "", error: false }]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [audience, setAudience] = useState({ name: "Personally", id: null });
  const [showAudience, setShowAudience] = useState(false);
  const [toast, setToast] = useState(null);

  const myCommunities = user?.memberships?.map(m => m.community).filter(Boolean) || [];

  const profileImg = user?.image 
    ? (user.image.startsWith('http') ? user.image : `${BACKEND_URL}${user.image}`) 
    : profileDefault;

  useEffect(() => {
    const isReturning = location.state?.replyToId;
    const tempSaved = localStorage.getItem("critique_temp_draft");
    const permanentSaved = localStorage.getItem("critique_draft");

    if (isReturning && tempSaved) {
      try {
        const draft = JSON.parse(tempSaved);
        setText(draft.text || "");
        setKeywords(draft.keywords || []);
        setSources(draft.sources?.length ? draft.sources : [{ name: "", link: "", error: false }]);
        setAudience(draft.audience || { name: "Personally", id: null });
        localStorage.removeItem("critique_temp_draft");
      } catch (e) { console.error("Failed to parse temp draft", e); }
    } 
    else if (permanentSaved && !text) {
      try {
        const draft = JSON.parse(permanentSaved);
        setText(draft.text || "");
        setKeywords(draft.keywords || []);
        setSources(draft.sources?.length ? draft.sources : [{ name: "", link: "", error: false }]);
        setAudience(draft.audience || { name: "Personally", id: null });
        setSelectedPost(draft.selectedPost || null);
      } catch (e) { console.error("Failed to parse draft", e); }
    }
  }, [location.state, text]);

  useEffect(() => {
    if (location.state?.replyToId && location.state?.replyToContent) {
      setSelectedPost({
        id: location.state.replyToId,
        content: location.state.replyToContent,
      });
    }
  }, [location.state]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      setKeywords([...keywords, tagInput.trim()]);
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && keywords.length) {
      setKeywords(keywords.slice(0, -1));
    }
  };

  const addSource = () => setSources([...sources, { name: "", link: "", error: false }]);
  const deleteSource = (i) => setSources(sources.filter((_, index) => index !== i));
  const updateSource = (i, field, value) => {
    const updated = [...sources];
    updated[i][field] = value;
    if (field === "link") updated[i].error = false;
    setSources(updated);
  };

  const handleFiles = (e) => setFiles([...files, ...Array.from(e.target.files)]);

  const isValidURL = (string) => {
    if (!string) return false;
    const pattern = new RegExp("^(https?:\\/\\/)?(www\\.)?([a-zA-Z0-9\\-]+\\.)+[a-zA-Z]{2,}(/.*)?$", "i");
    return pattern.test(string.trim());
  };

  const handlePost = async () => {
    if (!text.trim()) return showToast("Post cannot be empty", "error");
    if (!selectedPost) return showToast("Choose a post to critique", "error");
    if (keywords.length < 3) return showToast("Add at least 3 keywords", "error");
    
    const validSourcesList = sources.filter((s) => s.name.trim() && s.link.trim());
    if (validSourcesList.length === 0) return showToast("Add at least 1 complete source", "error");

    let hasLinkError = false;
    const validatedSources = sources.map((s) => {
      if (s.link.trim() && !isValidURL(s.link)) {
        hasLinkError = true;
        return { ...s, error: true };
      }
      return { ...s, error: false };
    });

    if (hasLinkError) {
      setSources(validatedSources);
      return showToast("Enter a valid link address", "error");
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("type", "critique");
    formData.append("text", text);
    formData.append("keywords", JSON.stringify(keywords));
    formData.append("communityId", audience.id || "");
    formData.append("authorId", user?.id || "");
    formData.append("parentId", selectedPost.id);
    formData.append("sources", JSON.stringify(validSourcesList.map(s => ({
      name: s.name.trim(),
      link: s.link.trim()
    }))));

    files.forEach((file) => formData.append("files", file));

    try {
      const res = await axios.post(`${BACKEND_URL}/api/posts`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 201 || res.status === 200) {
        showToast("Critique published", "success");
        localStorage.removeItem("critique_draft");
        localStorage.removeItem("critique_temp_draft");
        setTimeout(() => navigate("/forum"), 1500);
      }
    } catch (err) {
      showToast("Failed to publish critique", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    localStorage.setItem("critique_draft", JSON.stringify({ 
      text, keywords, sources, audience, selectedPost 
    }));
    showToast("Draft saved", "success");
  };

  const handleChooseSaved = () => {
    const tempDraft = { text, keywords, sources, audience };
    localStorage.setItem("critique_temp_draft", JSON.stringify(tempDraft));
    navigate("/profile", { state: { activeTab: "Saved", from: "critique" } });
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media (max-width: 768px) {
          .header-container { flex-direction: column !important; padding: 20px !important; text-align: center !important; gap: 10px !important; }
          .logo-img { width: 180px !important; margin: 0 auto !important; }
          .header-divider { display: none !important; }
          .header-title { font-size: 24px !important; margin: 0 auto !important; }
          .main-layout { flex-direction: column !important; }
          .editor-column { width: 100% !important; padding: 0 20px !important; height: auto !important; overflow: visible !important; }
          .action-sidebar { position: relative !important; bottom: 0 !important; right: 0 !important; width: 100% !important; padding: 20px !important; box-sizing: border-box; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Section */}
      <div className="header-container" style={{ display: "flex", alignItems: "center", padding: "24px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%", flexWrap: "wrap", justifyContent: "inherit" }} className="header-inner">
          <img src={Logo} className="logo-img" width={264} alt="Logo" style={{ transition: 'width 0.3s' }} />
          <div className="header-divider" style={{ width: 1, height: 48, background: BORDER }}></div>
          <h1 className="header-title" style={{ fontSize: 38, fontWeight: 700, color: PRIMARY, margin: 0 }}>Post - Critique</h1>
        </div>
      </div>

      {/* User Info & Audience */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 40px", gap: 12, marginBottom: 10 }}>
        <img src={profileImg} width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover" }} alt="Profile" />
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
              <div style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${BG}` }} onMouseOver={(e) => (e.target.style.background = LIGHT)} onMouseOut={(e) => (e.target.style.background = "transparent")} onClick={() => { setAudience({ name: "Personally", id: null }); setShowAudience(false); }}>Personally</div>
              {myCommunities.map((c) => (
                <div key={c.id} style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer" }} onMouseOver={(e) => (e.target.style.background = LIGHT)} onMouseOut={(e) => (e.target.style.background = "transparent")} onClick={() => { setAudience({ name: c.name, id: c.id }); setShowAudience(false); }}>{c.name}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="main-layout" style={{ display: "flex" }}>
        <div className="hide-scrollbar editor-column" style={{ padding: "0 40px", width: 708, height: "calc(100vh - 160px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          
          <textarea
            placeholder="Type your critique here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%", minHeight: 140, padding: 15, borderRadius: 12, border: `1px solid ${BORDER}`, resize: "none", fontSize: 16 }}
          />

          <div 
            style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, background: "#fff", cursor: "text" }}
            onClick={() => document.getElementById("tag-input")?.focus()}
          >
            {keywords.map((tag, i) => (
              <div key={i} style={{ background: LIGHT, border: `1px solid ${PRIMARY}`, borderRadius: 8, padding: "4px 8px", fontSize: 13, whiteSpace: "nowrap" }}>{tag}</div>
            ))}
            <input
              id="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag and press Enter"
              style={{ border: "none", outline: "none", fontSize: 14, minWidth: 120, flexGrow: 1 }}
              inputMode="text"
              enterKeyHint="done"
            />
          </div>

          {/* CRITIQUE TARGET (REPLY BOX) */}
          <div style={{ width: "100%", minHeight: 70, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff", boxSizing: "border-box", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 17, overflow: "hidden" }}>
              <img src={ArrowIcon} width={25} height={25} alt="arrow" />
              <span style={{ fontSize: 18, color: PRIMARY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedPost ? (selectedPost.content?.length > 40 ? selectedPost.content.slice(0, 39) + "..." : selectedPost.content || "Post Selected") : "Reply on a post"}
              </span>
            </div>
            <button
              style={{ fontSize: 18, color: ACCENT, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
              onClick={handleChooseSaved}
            >
              {selectedPost ? "Change" : "Choose from saved"}
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ color: PRIMARY }}>Your sources</strong>
              <span onClick={addSource} style={{ color: LINK_BLUE, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+ Add source</span>
            </div>
            {sources.map((s, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#666" }}>Source {i + 1}</span>
                  {sources.length > 1 && <span onClick={() => deleteSource(i)} style={{ fontSize: 12, color: "#FF4C4C", cursor: "pointer" }}>Remove</span>}
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <input placeholder="Source name" value={s.name} onChange={(e) => updateSource(i, "name", e.target.value)} style={{ flex: 1, height: 44, padding: "0 12px", borderRadius: 10, border: `1px solid ${BORDER}` }} />
                  <input placeholder="Source link" value={s.link} onChange={(e) => updateSource(i, "link", e.target.value)} style={{ flex: 1, height: 44, padding: "0 12px", borderRadius: 10, border: s.error ? "1px solid red" : `1px solid ${BORDER}` }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, paddingBottom: 120 }}>
            <strong style={{ color: PRIMARY }}>Uploads</strong>
            <div style={{ marginTop: 10, width: "100%", height: 120, border: `1px dashed ${BORDER}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
              <label style={{ cursor: "pointer", fontSize: 14, textAlign: "center", width: "100%" }}>
                {files.length > 0 ? `${files.length} files selected` : "Upload images, videos, or gifs"}
                <input type="file" hidden multiple onChange={handleFiles} />
              </label>
            </div>
          </div>
        </div>

        {/* Buttons Sidebar/Bottom bar */}
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
            {loading ? "Publishing..." : "Publish Critique"}
          </button>

          <button 
            onClick={saveDraft} 
            style={{ height: 56, fontSize: 18, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, fontWeight: 600, cursor: "pointer", color: PRIMARY }}
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}