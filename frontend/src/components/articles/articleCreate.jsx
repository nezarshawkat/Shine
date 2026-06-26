import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthProvider.jsx";
import { API_BASE_URL, BACKEND_URL, buildMediaUrl } from "../../api";
import { useTheme } from "../ThemeProvider.jsx";


const ArticleForm = () => {
  const { user } = useContext(AuthContext);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const navigate = useNavigate();
  const { id } = useParams(); 
  const isEditMode = !!id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newImages, setNewImages] = useState([]); 
  const [previewUrls, setPreviewUrls] = useState([]); // For viewing local files
  const [existingMedia, setExistingMedia] = useState([]);
  const [removeMediaIds, setRemoveMediaIds] = useState([]);
  const [sources, setSources] = useState([{ name: "", link: "" }]);
  const [loading, setLoading] = useState(false);

  // Fetch data if in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchArticle = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/articles/${id}`);
          if (res.ok) {
            const data = await res.json();
            setTitle(data.title);
            setContent(data.content);
            setExistingMedia(data.media || []);
            setSources(data.sources?.length > 0 ? data.sources : [{ name: "", link: "" }]);
          }
        } catch (err) {
          console.error("Fetch error:", err);
        }
      };
      fetchArticle();
    }
  }, [id, isEditMode]);

  // Handle File Selection & Preview
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(files);

    // Create temporary URLs for browser preview
    const objectUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(objectUrls);
  };

  const addSource = () => setSources([...sources, { name: "", link: "" }]);

  const handleSourceChange = (index, field, value) => {
    const updated = [...sources];
    updated[index][field] = value;
    setSources(updated);
  };

  const handleRemoveExistingMedia = (mediaId) => {
    setRemoveMediaIds([...removeMediaIds, mediaId]);
    setExistingMedia(existingMedia.filter(m => m.id !== mediaId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please login first.");
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("authorId", user.id);
    
    // Append files - matches upload.array("media") on backend
    newImages.forEach((file) => {
      formData.append("media", file);
    });

    const filteredSources = sources.filter(s => s.name.trim() && s.link.trim());
    formData.append("sources", JSON.stringify(filteredSources));

    if (isEditMode) {
      formData.append("removeMediaIds", JSON.stringify(removeMediaIds));
    }

    try {
      const url = isEditMode ? `${BACKEND_URL}/api/articles/${id}` : `${BACKEND_URL}/api/articles`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        body: formData, 
      });

      if (res.ok) {
        const data = await res.json();
        // Clean up preview URLs to save memory
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        navigate(`/articles/${data.id || id}`);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || "Action failed"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", backgroundColor: isDark ? "#000" : "#fff", borderRadius: "12px", border: isDark ? "1px solid rgba(255,255,255,0.3)" : "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", fontFamily: "sans-serif", color: isDark ? "#fff" : "#111" }}>
      <h2 style={{ fontSize: "1.8rem", marginBottom: "24px", fontWeight: "800", textAlign: "center" }}>
        {isEditMode ? "Edit Your Article" : "Write a New Article"}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", color: isDark ? "#fff" : "#111" }}>Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.45)" : "1px solid #ddd", color: isDark ? "#fff" : "#111", backgroundColor: isDark ? "#1d1d1d" : "#fff", boxSizing: "border-box" }}
            placeholder="Give your article a catchy title..."
            required 
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", color: isDark ? "#fff" : "#111" }}>Body Content</label>
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            style={{ width: "100%", height: "350px", padding: "12px", borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.45)" : "1px solid #ddd", whiteSpace: "pre-wrap", color: isDark ? "#fff" : "#111", backgroundColor: isDark ? "#1d1d1d" : "#fff", boxSizing: "border-box", fontSize: "1rem", lineHeight: "1.5" }}
            placeholder="Tell your story..."
            required 
          />
        </div>

        {/* --- MEDIA SECTION --- */}
        <div style={{ marginBottom: "20px", border: "1px dashed #ccc", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "12px" }}>Images & Media</label>
          
          {/* Existing Media (Edit Mode) */}
          {isEditMode && existingMedia.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>Currently Uploaded:</p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {existingMedia.map((m) => (
                  <div key={m.id} style={{ position: "relative" }}>
                    <img src={buildMediaUrl(m.url)} alt="preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px" }} />
                    <button type="button" onClick={() => handleRemoveExistingMedia(m.id)} style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", width: "22px", height: "22px", fontWeight: "bold" }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Previews for New Files */}
          {previewUrls.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>Newly Selected:</p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {previewUrls.map((url, i) => (
                  <img key={i} src={url} alt="new-preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px", border: "2px solid #007bff" }} />
                ))}
              </div>
            </div>
          )}

          <input 
            type="file" 
            multiple 
            accept="image/*,video/*" 
            onChange={handleFileChange} 
            style={{ fontSize: "0.9rem" }}
          />
        </div>

        {/* --- SOURCES SECTION --- */}
        <div style={{ marginBottom: "24px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "12px" }}>Citations & Sources</label>
          {sources.map((source, index) => (
            <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input 
                placeholder="Source Name (e.g. Wikipedia)" 
                value={source.name} 
                onChange={(e) => handleSourceChange(index, "name", e.target.value)}
                style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
              <input 
                placeholder="URL (https://...)" 
                value={source.link} 
                onChange={(e) => handleSourceChange(index, "link", e.target.value)}
                style={{ flex: 2, padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
            </div>
          ))}
          <button type="button" onClick={addSource} style={{ color: "#007bff", border: "none", background: "none", cursor: "pointer", fontWeight: "600", padding: "0" }}>
            + Add Another Source
          </button>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: "100%", 
            padding: "16px", 
            backgroundColor: loading ? "#666" : (isDark ? "#fff" : "#000"), 
            color: isDark ? "#000" : "#fff", 
            border: "none",
            borderRadius: "8px", 
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "1.1rem",
            fontWeight: "bold",
            transition: "background 0.2s"
          }}
        >
          {loading ? "Uploading Media..." : isEditMode ? "Save Changes" : "Publish Article"}
        </button>
      </form>
    </div>
  );
};

export default ArticleForm;
