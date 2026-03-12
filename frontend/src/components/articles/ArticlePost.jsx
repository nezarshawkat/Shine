import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import SharePopup from "/workspaces/Shine/frontend/src/components/posts/SharePopup.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";

// Icons
import heartIcon from "/workspaces/Shine/frontend/src/assets/Heart.svg";
import heartClickedIcon from "/workspaces/Shine/frontend/src/assets/HeartC.svg";
import shareIcon from "/workspaces/Shine/frontend/src/assets/Share.svg";
import saveIcon from "/workspaces/Shine/frontend/src/assets/Tag.svg";
import saveClickedIcon from "/workspaces/Shine/frontend/src/assets/TagClicked.svg";
import MenuIcon from "/workspaces/Shine/frontend/src/assets/Menu.svg";
import profileDefault from "../../assets/profileDefault.svg";


// --- Helper Components ---

function Toast({ message, type = "success", duration = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  const textColor = type === "error" ? "#FFF" : "#FFC847";

  return (
    <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        background: bgColor, color: textColor, padding: "12px 20px",
        borderRadius: 8, fontWeight: 600, fontSize: 14, zIndex: 3100,
      }}>
      {message}
    </div>
  );
}

function ImageMaximizer({ media, currentIndex, onClose, onPrev, onNext }) {
  if (currentIndex === null || !media || media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const isVideo = typeof currentMedia === 'string' && currentMedia.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.9)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4000
    }} onClick={onClose}>
      
      <button onClick={onClose} style={{
        position: "absolute", top: 30, right: 30, background: "none", border: "none",
        color: "white", fontSize: 40, cursor: "pointer", zIndex: 4001
      }}>&times;</button>

      {media.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} style={arrowStyle({ left: 30 })}>&#10094;</button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} style={arrowStyle({ right: 30 })}>&#10095;</button>
        </>
      )}

      {isVideo ? (
        <video 
          src={currentMedia} 
          controls 
          autoPlay 
          style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8 }} 
          onClick={(e) => e.stopPropagation()} 
        />
      ) : (
        <img 
          src={currentMedia} 
          alt="" 
          style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8, objectFit: "contain" }}
          onClick={(e) => e.stopPropagation()} 
        />
      )}
    </div>
  );
}

const arrowStyle = (pos) => ({
  position: "absolute", ...pos, background: "rgba(255,255,255,0.1)", border: "none",
  color: "white", fontSize: 24, width: 50, height: 50, borderRadius: "50%", 
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 4001
});

// --- Main Component ---

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: loggedInUser } = useContext(AuthContext);
  const menuRef = useRef(null);

  const [article, setArticle] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [maximizedIndex, setMaximizedIndex] = useState(null);
  const [toast, setToast] = useState(null);

  const currentUserId = loggedInUser?.id || loggedInUser?._id;
  const showToast = (message, type = "success") => setToast({ message, type });

  const getFullUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  useEffect(() => {
    async function fetchArticleData() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/articles/${id}?userId=${currentUserId || ""}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
          
          if (currentUserId) {
            const [likeRes, saveRes] = await Promise.all([
              fetch(`${BACKEND_URL}/api/articles/${id}/like-status?userId=${currentUserId}`),
              fetch(`${BACKEND_URL}/api/articles/${id}/save-status?userId=${currentUserId}`)
            ]);
            if (likeRes.ok) setIsLiked((await likeRes.json()).liked);
            if (saveRes.ok) setIsSaved((await saveRes.json()).saved);
          }
        }
      } catch (err) {
        console.error("Failed to fetch article:", err);
      }
    }
    fetchArticleData();
  }, [id, currentUserId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!article) return <div style={{ padding: "100px", textAlign: "center", color: "#666" }}>Loading...</div>;

  const isAuthor = currentUserId && (String(currentUserId) === String(article.authorId) || String(currentUserId) === String(article.author?.id));
  const mediaList = article.media?.map(m => getFullUrl(m.url)) || [];
  const mainImage = mediaList.length > 0 ? mediaList[0] : null;

  const handleInteraction = async (endpoint, setter, successMsg) => {
    if (!loggedInUser) return showToast("Please login first", "error");
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${article.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        setter(data.status);
        setArticle(prev => ({
          ...prev,
          _count: { 
            ...prev._count, 
            likes: data.likesCount !== undefined ? data.likesCount : prev._count.likes,
            saves: data.savesCount !== undefined ? data.savesCount : prev._count.saves 
          }
        }));
        showToast(data.status ? successMsg : "Action removed");
      }
    } catch (err) { showToast("Action failed", "error"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Article deleted");
        navigate("/articles");
      }
    } catch (err) { showToast("Delete failed", "error"); }
  };

  return (
    <div style={{ position: "relative", backgroundColor: "#f4f7f6", minHeight: "100vh", paddingBottom: "50px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <ImageMaximizer 
        media={mediaList} 
        currentIndex={maximizedIndex} 
        onClose={() => setMaximizedIndex(null)}
        onNext={() => setMaximizedIndex((maximizedIndex + 1) % mediaList.length)}
        onPrev={() => setMaximizedIndex((maximizedIndex - 1 + mediaList.length) % mediaList.length)}
      />

      <div style={{
          display: "flex", flexDirection: "column", width: "100%", maxWidth: "900px",
          margin: "40px auto", backgroundColor: "#fff", borderRadius: "16px",
          overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
          <div style={{ flex: 1, padding: "40px", minWidth: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link to={`/profile/${article.author?.username}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
                <img
                  src={getFullUrl(article.author?.image) || profileDefault}
                  style={{ width: "50px", height: "50px", borderRadius: "50%", marginRight: "12px", objectFit: "cover", border: "2px solid #eee" }}
                />
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#1C274C" }}>{article.author?.name}</div>
                  <div style={{ color: "#777", fontSize: "14px" }}>@{article.author?.username}</div>
                </div>
              </Link>
              <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#555" }}>{article._count?.views || 0} Views</span>
                
                {isAuthor && (
                  <div style={{ position: "relative" }} ref={menuRef}>
                    <img 
                      src={MenuIcon} 
                      width="24" 
                      style={{ cursor: "pointer" }} 
                      onClick={() => setShowMenu(!showMenu)} 
                    />
                    {showMenu && (
                      <div className="popup-menu post-action-menu">
                        <button className="side-menu-item" onClick={() => navigate(`/article-edit/${article.id}`)}>Edit Article</button>
                        <button className="side-menu-item delete" onClick={handleDelete}>Delete Article</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <h1 style={{ fontSize: "2.8rem", marginTop: "30px", lineHeight: "1.2", fontWeight: "900", color: "#1C274C", letterSpacing: "-1px" }}>
              {article.title}
            </h1>
          </div>

          {mainImage && (
            <div 
              style={{ width: "40%", minWidth: "300px", height: "auto", minHeight: "350px", cursor: "zoom-in", backgroundColor: "#f9f9f9" }}
              onClick={() => setMaximizedIndex(0)}
            >
              {mainImage.match(/\.(mp4|webm|ogg)$/i) ? (
                 <video src={mainImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={mainImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
          )}
        </div>

        {/* BODY CONTENT */}
        <div style={{ padding: "40px", lineHeight: "1.9", fontSize: "1.15rem", color: "#333" }}>
          <div style={{ whiteSpace: "pre-wrap", marginBottom: "40px" }}>{article.content}</div>

          {mediaList.length > 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px", marginTop: "30px" }}>
              {mediaList.slice(1).map((url, idx) => (
                <div key={idx} style={{ borderRadius: "12px", overflow: "hidden", height: "220px", cursor: "zoom-in", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} onClick={() => setMaximizedIndex(idx + 1)}>
                   {url.match(/\.(mp4|webm|ogg)$/i) ? (
                     <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                   ) : (
                     <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                   )}
                </div>
              ))}
            </div>
          )}

          {article.sources?.length > 0 && (
            <div style={{ marginTop: "60px", padding: "25px", backgroundColor: "#f9fbfd", borderRadius: "12px", border: "1px solid #eef2f7" }}>
              <h4 style={{ marginTop: 0, color: "#1C274C", fontSize: "1.2rem", borderBottom: "1px solid #dee2e6", paddingBottom: "10px", marginBottom: "15px" }}>Sources & References</h4>
              {article.sources.map((s) => (
                <a key={s.id} href={s.link.startsWith('http') ? s.link : `https://${s.link}`} target="_blank" rel="noreferrer" style={{ display: "block", color: "#007bff", marginBottom: "8px", textDecoration: "none", fontSize: "0.95rem" }}>
                  🔗 {s.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{
            padding: "20px 40px", borderTop: "1px solid #f0f0f0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "#fff", position: "sticky", bottom: 0, zIndex: 100
          }}>
          <div style={{ display: "flex", gap: "35px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img 
                src={isLiked ? heartClickedIcon : heartIcon} 
                width="26" 
                style={{ cursor: "pointer" }} 
                onClick={() => handleInteraction('like', setIsLiked, "Liked")}
              />
              <span style={{ fontWeight: "700", color: "#1C274C", fontSize: "16px" }}>{article._count?.likes || 0}</span>
            </div>
            
            <img src={shareIcon} width="24" style={{ cursor: "pointer" }} onClick={() => setShowShare(true)} />
            <img 
              src={isSaved ? saveClickedIcon : saveIcon} 
              width="24" 
              style={{ cursor: "pointer" }} 
              onClick={() => handleInteraction('save', setIsSaved, "Saved")} 
            />
          </div>

          <span style={{ color: "#999", fontSize: "14px" }}>
            {new Date(article.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {showShare && <SharePopup id={article.id} type="article" onClose={() => setShowShare(false)} />}

      <style>{`
        .post-action-menu {
          position: absolute;
          top: 35px;
          right: 0;
          width: 150px;
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(28, 39, 76, 0.15);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 1000;
          overflow: hidden;
        }
        .side-menu-item {
          width: 100%;
          padding: 12px 15px;
          text-align: left;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #1c274c;
          cursor: pointer;
          transition: background 0.2s;
        }
        .side-menu-item:hover { background: #f8f9fa; }
        .side-menu-item.delete { color: #ff4d4f; }
      `}</style>
    </div>
  );
};

export default ArticleDetail;