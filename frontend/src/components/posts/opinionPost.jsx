import React, { useState, useEffect, useContext, useRef } from "react";
import PostCard from "./PostCard";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getCommunityById } from "../../utlis/getCommunity.js";
import SharePopup from "./SharePopup"; 
import { AuthContext } from "../AuthProvider.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";
import { submitReport } from "../reporting/reportUtils";

// Icons
import ShareIcon from "../../assets/Share.svg";
import TagIcon from "../../assets/Tag.svg";
import TagClickedIcon from "../../assets/TagClicked.svg";
import FlagIcon from "../../assets/Flag.svg";
import ArrowIcon from "../../assets/arrow.svg";
import CommentIcon from "../../assets/comment.svg";
import HeartIcon from "../../assets/Heart.svg";
import HeartClickedIcon from "../../assets/HeartC.svg";
import MenuIcon from "../../assets/Menu.svg"; 
import profileDefault from "../../assets/profileDefault.svg";


// --- Sub-components ---

function ImageMaximizer({ media, currentIndex, onClose, onPrev, onNext }) {
  if (currentIndex === null) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.9)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000
    }} onClick={onClose}>
      
      <button onClick={onClose} style={{
        position: "absolute", top: 30, right: 30, background: "none", border: "none",
        color: "white", fontSize: 40, cursor: "pointer", zIndex: 3001
      }}>&times;</button>

      {media.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} style={arrowStyle({ left: 30 })}>&#10094;</button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} style={arrowStyle({ right: 30 })}>&#10095;</button>
        </>
      )}

      {media[currentIndex].match(/\.(mp4|webm|ogg)$/i) ? (
        <video
          src={media[currentIndex]}
          controls
          autoPlay
          style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8 }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img 
          src={media[currentIndex]} 
          alt="Maximized view" 
          style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8, objectFit: "contain" }}
          onClick={(e) => e.stopPropagation()} 
        />
      )}

      <div style={{ position: "absolute", bottom: 40, color: "white", background: "rgba(0,0,0,0.5)", padding: "5px 15px", borderRadius: 20, fontSize: 14 }}>
        {currentIndex + 1} / {media.length}
      </div>
    </div>
  );
}

const arrowStyle = (pos) => ({
  position: "absolute", ...pos, background: "rgba(255,255,255,0.1)", border: "none",
  color: "white", fontSize: 24, width: 50, height: 50, borderRadius: "50%", 
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background 0.2s"
});

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(28, 39, 76, 0.2)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000
    }}>
      <div style={{
        background: "white", padding: 30, borderRadius: 20, width: 350,
        textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ color: "#1C274C", marginBottom: 20 }}>Delete this analysis?</h3>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            padding: "10px 20px", borderRadius: 8, border: "1px solid #1C274C",
            background: "none", color: "#1C274C", cursor: "pointer", fontWeight: 600
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#FF4C4C", color: "white", cursor: "pointer", fontWeight: 600
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success", duration = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  const textColor = type === "error" ? "#FFF" : "#FFC847";

  return (
    <div style={{
        position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
        background: bgColor, color: textColor, padding: "12px 20px",
        borderRadius: 8, fontWeight: 600, fontSize: 14, zIndex: 1100,
        animation: "slideUp 0.3s ease",
      }}>
      {message}
      <style>{`@keyframes slideUp { 0% { transform: translate(-50%, 100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
}

// --- Main Component ---

export default function AnalysisPost({ postId, initialData }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const postRef = useRef(null);

  const [post, setPost] = useState(initialData || null);
  const [expanded, setExpanded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showFlagPopup, setShowFlagPopup] = useState(false); 
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [toast, setToast] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [maximizedIndex, setMaximizedIndex] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  const handleSubmitPostReport = async (reason) => {
    const targetId = post?.id || post?._id || postId;
    if (!targetId) return;
    try {
      const authToken = localStorage.getItem("token");
      await submitReport(authToken, { type: "POST", targetId, reason });
      showToast(`Reported for ${reason}`);
    } catch (error) {
      showToast("Failed to submit report", "error");
    } finally {
      setShowFlagPopup(false);
    }
  };

  const isAuthor = user && (user.id === post?.authorId || user._id === post?.authorId);

  const isPostUpdated = () => {
    if (!post?.updatedAt || !post?.createdAt) return false;
    const created = new Date(post.createdAt).getTime();
    const updated = new Date(post.updatedAt).getTime();
    return updated - created > 2000;
  };

  useEffect(() => {
    const currentId = initialData?.id || initialData?._id || postId;
    if (!currentId || hasViewed) return;

    const sessionKey = `viewed_analysis_${currentId}`;
    if (sessionStorage.getItem(sessionKey)) {
      setHasViewed(true);
      return;
    }

    let timer;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timer = setTimeout(() => {
            recordView(currentId, sessionKey);
          }, 2000); 
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
  }, [postId, post, hasViewed]);

  const recordView = async (currentId, sessionKey) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id || user?._id || "anonymous" })
      });
      if (res.ok) {
        const data = await res.json();
        setPost(prev => ({ ...prev, viewsCount: data.viewsCount }));
        setHasViewed(true);
        sessionStorage.setItem(sessionKey, "true");
      }
    } catch (e) { console.error("View tracking error", e); }
  };

  useEffect(() => {
    const currentId = initialData?.id || initialData?._id || postId;
    if (!currentId) return;

    async function fetchDetails() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/posts/${currentId}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
          setEditText(data.text);
        }
      } catch (err) { console.error("Fetch error", err); }

      if (user) {
        try {
          const userId = user.id || user._id;
          const [likeRes, saveRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/posts/${currentId}/like-status?userId=${userId}`),
            fetch(`${BACKEND_URL}/api/posts/${currentId}/save-status?userId=${userId}`)
          ]);
          if (likeRes.ok) setIsLiked((await likeRes.json()).liked);
          if (saveRes.ok) setIsSaved((await saveRes.json()).saved);
        } catch (err) { console.error("Status check failed", err); }
      }
    }
    fetchDetails();
  }, [postId, user, initialData]);

  const handleInteraction = async (endpoint, setter, successMsg) => {
    if (!user) return showToast("Please login first", "error");
    const currentPostId = post.id || post._id;
    const userId = user.id || user._id;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setter(data.status);
      
      setPost(prev => ({
        ...prev,
        likesCount: data.likesCount !== undefined ? data.likesCount : prev.likesCount,
        sharesCount: data.sharesCount !== undefined ? data.sharesCount : prev.sharesCount,
      }));

      showToast(data.status ? successMsg : "Action removed");
    } catch (err) { showToast("Action failed", "error"); }
  };

  const handleEditSave = async () => {
    const currentPostId = post.id || post._id;
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText })
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPost(prev => ({ ...prev, text: updatedPost.text, updatedAt: updatedPost.updatedAt }));
        setIsEditing(false);
        showToast("Analysis updated successfully");
      }
    } catch (err) { showToast("Update failed", "error"); }
  };

  const handleDelete = async () => {
    const currentPostId = post.id || post._id;
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Post deleted");
        setShowDeleteModal(false);
        setPost(null); 
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) { showToast("Delete failed", "error"); }
  };

  if (!post) return null;

  const authorImage = post.author?.image 
    ? (post.author.image.startsWith('http') ? post.author.image : `${BACKEND_URL}${post.author.image}`) 
    : profileDefault;

  const mediaList = post.media?.filter((m) => m.type === "image" || m.type === "video" || m.url.endsWith(".gif")).map((m) => (m.url.startsWith("http") ? m.url : `${BACKEND_URL}${m.url}`)) || [];
  const community = post.community || getCommunityById(post.communityId);
  const MAX_CHARS = 900;
  const displayText = !expanded && post.text?.length > MAX_CHARS ? post.text.slice(0, MAX_CHARS) + "..." : post.text;
  const sources = post.sources || (post.sourceLink ? [{ name: post.sourceName || "Source", link: post.sourceLink }] : []);

  const postDate = new Date(post.createdAt);
  const formattedDate = postDate.toLocaleDateString();
  const formattedTime = postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <style>{`
        .post-content-layout {
          align-items: flex-start;
        }
        @media (max-width: 600px) {
          .post-timestamp {
            display: none !important;
          }
          .sources-btn-text {
            display: none;
          }
          .sources-toggle-btn::after {
            content: "Sources";
          }
          .post-content-layout {
            flex-direction: column;
          }
          .post-text-pane {
            width: 100%;
          }
          .post-media-block {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showDeleteModal && <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} />}
      
      <ImageMaximizer 
        media={mediaList} 
        currentIndex={maximizedIndex} 
        onClose={() => setMaximizedIndex(null)}
        onNext={() => setMaximizedIndex((maximizedIndex + 1) % mediaList.length)}
        onPrev={() => setMaximizedIndex((maximizedIndex - 1 + mediaList.length) % mediaList.length)}
      />

      <PostCard ref={postRef}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img 
              src={authorImage} 
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); }}
              style={{ width: 41, height: 41, borderRadius: 999, objectFit: "cover", cursor: "pointer" }} 
              alt="" 
            />
            <div>
              <div 
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); }}
                style={{ fontSize: 16, fontWeight: 400, color: "#1C274C", cursor: "pointer" }}
              >
                {post.author?.name || "User"}
              </div>
              {community?.name && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  from <span 
                    onClick={(e) => { e.stopPropagation(); navigate(`/community/${post.communityId}`); }}
                    style={{ fontWeight: "bold", color: "#1C274C", cursor: "pointer" }}
                  >
                    {community.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#1C274C" }}>{post.viewsCount || 0} views</div>
            <div className="post-type-label" style={{ fontSize: 16, fontWeight: 800, color: "#FFC847" }}>{post.type}</div>
          </div>
        </div>

        <div className="post-content-layout" style={{ marginTop: 12, display: "flex", gap: 20 }}>
          <div className="post-text-pane" style={{ flex: 1 }}>
             <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                {post.keywords?.map((k, i) => (
                  <span className="post-keyword-chip" key={i} style={{ background: "#ECF2F6", border: "0.5px solid #1C274C", padding: "4px 8px", borderRadius: 6, fontSize: 12, color: "#1C274C" }}>{k}</span>
                ))}
             </div>
             
             {isEditing ? (
               <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                 <textarea 
                   value={editText} 
                   onChange={(e) => setEditText(e.target.value)}
                   style={{ width: "100%", height: 120, padding: 12, borderRadius: 10, border: "1px solid #1C274C", resize: "none", fontSize: 16, outline: "none" }}
                 />
                 <div style={{ display: "flex", gap: 10 }}>
                   <button onClick={handleEditSave} style={{ background: "#1C274C", color: "#FFC847", border: "none", padding: "6px 15px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Save</button>
                   <button onClick={() => setIsEditing(false)} style={{ background: "#ECF2F6", color: "#1C274C", border: "none", padding: "6px 15px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                 </div>
               </div>
             ) : (
               <div onClick={() => navigate(`/post/${post.id || post._id}`)} style={{ cursor: "pointer" }}>
                 <div style={{ fontSize: 16, color: "#000", lineHeight: 1.5 }}>{displayText}</div>
                 {post.text?.length > MAX_CHARS && (
                   <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ background: "none", border: "none", color: "#FFC847", cursor: "pointer", fontWeight: 600 }}>
                     {expanded ? "Show less" : "... Read more"}
                   </button>
                 )}
               </div>
             )}
          </div>
          {mediaList.length > 0 && !isEditing && (
            <div 
              className="post-media-block"
              style={{ width: 277, aspectRatio: "4 / 3", borderRadius: 12, overflow: "hidden", flexShrink: 0, cursor: "zoom-in" }}
              onClick={(e) => { e.stopPropagation(); setMaximizedIndex(0); }}
            >
              {mediaList[0].match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={mediaList[0]} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={mediaList[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 15 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="post-timestamp" style={{ fontSize: 12, color: "#6b7280" }}>
                {isPostUpdated() && "(Updated) "}
                {formattedDate} • {formattedTime}
              </div>
              {sources.length > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSources(!showSources); }} 
                  className="sources-toggle-btn"
                  style={{ background: "transparent", border: "none", color: "#FFC847", fontSize: 16, fontWeight: 500, cursor: "pointer" }}
                >
                  <span className="sources-btn-text">
                    {showSources ? "Hide Sources" : "View Sources"}
                  </span>
                </button>
              )}
            </div>
            
            <div className="post-action-row" style={{ display: "flex", gap: 17, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img className="post-action-icon" src={isLiked ? HeartClickedIcon : HeartIcon} onClick={(e) => { e.stopPropagation(); handleInteraction('like', setIsLiked, "Liked"); }} style={{ width: 20, cursor: "pointer" }} />
                <span style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}>{post.likesCount || 0}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img className="post-action-icon" src={CommentIcon} onClick={() => navigate(`/post/${post.id || post._id}`)} style={{ width: 20, cursor: "pointer" }} />
                <span style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}>{post.commentsCount || 0}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img className="post-action-icon" src={ShareIcon} onClick={(e) => { e.stopPropagation(); handleInteraction('share', () => {}, "Shared"); setShowShare(true); }} style={{ width: 20, cursor: "pointer" }} />
                <span style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}>{post.sharesCount || 0}</span>
              </div>

              <img className="post-action-icon post-reply-icon" src={ArrowIcon} onClick={(e) => { e.stopPropagation(); navigate("/critique-create", { state: { replyToId: post.id || post._id, replyToContent: post.text } }); }} style={{ width: 20, cursor: "pointer" }} />
              
              {!isAuthor && (
                <div style={{ position: "relative" }}>
                  <img className="post-action-icon" src={FlagIcon} onClick={(e) => { e.stopPropagation(); setShowFlagPopup(!showFlagPopup); }} style={{ width: 20, cursor: "pointer" }} />
                  {showFlagPopup && (
                    <div style={{ position: "absolute", bottom: "100%", right: 0, background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderRadius: 8, padding: 8, width: 200, zIndex: 10 }}>
                      {["Spam", "False Info", "Inappropriate"].map(opt => (
                        <div key={opt} onClick={() => handleSubmitPostReport(opt)} style={{ padding: "8px", cursor: "pointer", fontSize: 13 }}>{opt}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <img className="post-action-icon" src={isSaved ? TagClickedIcon : TagIcon} onClick={(e) => { e.stopPropagation(); handleInteraction('save', setIsSaved, "Saved"); }} style={{ width: 20, cursor: "pointer" }} />
              
              {isAuthor && (
                <div style={{ position: "relative" }}>
                  <img className="post-action-icon" src={MenuIcon} onClick={(e) => { e.stopPropagation(); setShowMenuPopup(!showMenuPopup); }} style={{ width: 20, cursor: "pointer" }} />
                  {showMenuPopup && (
                    <div className="post-owner-menu-popup" style={{ position: "absolute", bottom: "100%", right: 0, background: "white", boxShadow: "0 0px 10px rgba(0,0,0,0.1)", borderRadius: 8, padding: 6, width: 120, zIndex: 10 }}>
                      <div onClick={() => { setIsEditing(true); setShowMenuPopup(false); }} className="post-owner-menu-item" style={{ padding: "8px", cursor: "pointer", fontSize: 13, color: "#1C274C" }}>Edit</div>
                      <div onClick={() => { setShowDeleteModal(true); setShowMenuPopup(false); }} className="post-owner-menu-delete" style={{ padding: "8px", cursor: "pointer", fontSize: 13, color: "#FF4C4C" }}>Delete</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showSources && (
          <div style={{ marginTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.2)", paddingTop: 12 }}>
            {sources.map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <a href={s.link.startsWith('http') ? s.link : `https://${s.link}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#1C274C", textDecoration: "none", fontSize: 14 }}>
                  • {s.name}
                </a>
              </div>
            ))}
          </div>
        )}
      </PostCard>
      {showShare && <SharePopup id={post.id || post._id} type="post" onClose={() => setShowShare(false)} />}
    </>
  );
}
