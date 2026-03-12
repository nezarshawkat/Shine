import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import SharePopup from "/workspaces/Shine/frontend/src/components/posts/SharePopup.jsx";

// Icons
import heartIcon from "/workspaces/Shine/frontend/src/assets/Heart.svg";
import heartClickedIcon from "/workspaces/Shine/frontend/src/assets/HeartC.svg";
import shareIcon from "/workspaces/Shine/frontend/src/assets/Share.svg";
import saveIcon from "/workspaces/Shine/frontend/src/assets/Tag.svg";
import saveClickedIcon from "/workspaces/Shine/frontend/src/assets/TagClicked.svg";
import MenuIcon from "/workspaces/Shine/frontend/src/assets/Menu.svg";

const BACKEND_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev";

function Toast({ message, type = "success", duration = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  return (
    <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        background: bgColor, color: "#FFF", padding: "12px 20px",
        borderRadius: 8, fontWeight: 600, fontSize: 14, zIndex: 1100,
      }}>
      {message}
    </div>
  );
}

const Post = ({ article: initialArticle, profileUser }) => {
  const navigate = useNavigate();
  const { user: loggedInUser } = useContext(AuthContext);
  const postRef = useRef(null);
  const menuRef = useRef(null);

  const [article, setArticle] = useState(initialArticle);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasCountedView, setHasCountedView] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  const currentUserId = loggedInUser?.id || loggedInUser?._id;
  const articleAuthorId = article?.authorId || article?.author?.id;
  const isAuthor = currentUserId && articleAuthorId && String(currentUserId) === String(articleAuthorId);

  useEffect(() => { setArticle(initialArticle); }, [initialArticle]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // View Tracking (Observer)
  useEffect(() => {
    if (!article?.id || hasCountedView || isDeleted) return;
    let timer;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasCountedView) {
          timer = setTimeout(() => recordView(article.id), 2000); 
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );
    if (postRef.current) observer.observe(postRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [article?.id, hasCountedView, isDeleted]);

  const recordView = async (articleId) => {
    try {
      const userId = currentUserId || "anonymous";
      const res = await fetch(`${BACKEND_URL}/api/articles/${articleId}/view?userId=${userId}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setHasCountedView(true);
        setArticle(prev => ({
          ...prev,
          _count: { ...prev._count, views: data.viewsCount ?? prev._count.views }
        }));
      }
    } catch (e) { console.error("View tracking error", e); }
  };

  useEffect(() => {
    if (!currentUserId || !article?.id || isDeleted) return;
    const checkStatus = async () => {
      try {
        const [lRes, sRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/articles/${article.id}/like-status?userId=${currentUserId}`),
          fetch(`${BACKEND_URL}/api/articles/${article.id}/save-status?userId=${currentUserId}`)
        ]);
        if (lRes.ok) setIsLiked((await lRes.json()).liked);
        if (sRes.ok) setIsSaved((await sRes.json()).saved);
      } catch (err) { console.error("Status check failed", err); }
    };
    checkStatus();
  }, [article?.id, currentUserId, isDeleted]);

  const handleInteraction = async (e, endpoint, setter, successMsg) => {
    e.stopPropagation();
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
            likes: data.likesCount ?? prev._count.likes,
            saves: data.savesCount ?? prev._count.saves 
          }
        }));
        showToast(data.status ? successMsg : "Action removed");
      }
    } catch (err) { showToast("Action failed", "error"); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this article? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${article.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleted(true); // Immediate UI removal
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to delete", "error");
      }
    } catch (err) {
      showToast("Error deleting article", "error");
    }
  };

  if (isDeleted) return null;

  const handlePostClick = () => navigate(`/article/${article.id}`);
  
  const handleProfileClick = (e) => {
    e.stopPropagation(); 
    const username = article.author?.username || article.authorUsername || profileUser?.username;
    if (username) navigate(`/profile/${username}`);
  };

  const getFullUrl = (url) => {
      if (!url) return "https://via.placeholder.com/400x300";
      return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  const authorName = article.author?.name || article.authorName || profileUser?.name || "User";
  const authorImg = article.author?.image || article.authorImage || profileUser?.image || "";
  const displayMedia = article.media?.[0];
  const mediaUrl = getFullUrl(displayMedia?.url);
  const isVideo = displayMedia?.type === 'video' || mediaUrl.match(/\.(mp4|webm|ogg)$/i);

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div
        ref={postRef}
        onClick={handlePostClick}
        className="article-post-card"
        style={{
          display: "flex", width: "100%", minHeight: "380px",
          backgroundColor: "#fff", borderRadius: "20px", overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)", cursor: "pointer",
          marginBottom: "24px", border: "1px solid #f0f0f0", position: "relative"
        }}
      >
        <div style={{ flex: 1, padding: "35px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            
            <div onClick={handleProfileClick} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={getFullUrl(authorImg)}
                style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }}
                alt=""
              />
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#1C274C" }}>{authorName}</span>
            </div>

            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#9ca3af" }}>{article._count?.views || 0} views</span>
                
                {isAuthor && (
                  <div style={{ position: "relative" }} ref={menuRef}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "5px" }}
                    >
                      <img src={MenuIcon} alt="menu" style={{ width: "20px" }} />
                    </button>

                    {showMenu && (
                      <div className="popup-menu post-action-menu">
                        {/* Modified: Takes you to the Article page to edit */}
                        <button 
                          className="side-menu-item" 
                          onClick={(e) => { e.stopPropagation(); handlePostClick(); }}
                        >
                          Edit Article
                        </button>
                        <button className="side-menu-item delete" onClick={handleDelete}>
                          Delete Article
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1C274C", marginBottom: "12px", lineHeight: 1.2 }}>
            {article.title}
          </h2>

          <p style={{
              fontSize: "1.05rem", color: "#555", flex: 1, lineHeight: 1.7,
              display: "-webkit-box", WebkitLineClamp: "4", WebkitBoxOrient: "vertical",
              overflow: "hidden", margin: 0
            }}>
            {article.content}
          </p>

          {/* Interaction Bar - Removed Comment Icon */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "25px", paddingTop: "20px", borderTop: "1px solid #f5f5f5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img 
                    src={isLiked ? heartClickedIcon : heartIcon} 
                    style={{ width: 22, cursor: "pointer" }} 
                    onClick={(e) => handleInteraction(e, 'like', setIsLiked, "Liked")} 
                />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#1C274C" }}>{article._count?.likes || 0}</span>
              </div>
              <img src={shareIcon} style={{ width: 22, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setShowShare(true); }} />
              <img 
                src={isSaved ? saveClickedIcon : saveIcon} 
                style={{ width: 22, cursor: "pointer" }} 
                onClick={(e) => handleInteraction(e, 'save', setIsSaved, "Saved")} 
              />
            </div>
            <span style={{ fontSize: "13px", color: "#BBB", fontWeight: 500 }}>
              {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : ""}
            </span>
          </div>
        </div>

        {/* Media Section */}
        <div style={{ flex: "0 0 38%", backgroundColor: "#fafafa" }}>
          {isVideo ? (
              <video src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
              <img src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          )}
        </div>
      </div>

      {showShare && (
        <SharePopup id={article.id} type="article" onClose={() => setShowShare(false)} />
      )}

      <style>{`
        .post-action-menu {
          position: absolute; top: 35px; right: 0; width: 160px; background: white; 
          border-radius: 12px; border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden;
        }
        .side-menu-item {
          width: 100%; padding: 12px 16px; text-align: left; background: none; border: none; 
          font-size: 14px; font-weight: 600; color: #1C274C; cursor: pointer;
        }
        .side-menu-item:hover { background: #f8f9fa; }
        .side-menu-item.delete { color: #FF4D4F; border-top: 1px solid #f0f0f0; }
        .article-post-card:hover { transform: translateY(-2px); transition: transform 0.2s ease; }
      `}</style>
    </>
  );
};

export default Post;