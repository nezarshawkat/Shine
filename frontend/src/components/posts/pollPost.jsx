import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCommunityById } from "../../utlis/getCommunity.js";
import { AuthContext } from "../AuthProvider.jsx";
import FlagIcon from "../../assets/Flag.svg";
import ShareIcon from "../../assets/Share.svg";
import TagIcon from "../../assets/Tag.svg";
import TagClickedIcon from "../../assets/TagClicked.svg";
import MenuIcon from "../../assets/Menu.svg";
import profileDefault from "../../assets/profileDefault.svg";
import SharePopup from "./SharePopup.jsx";
import PostCard from "./PostCard.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";
import { submitReport } from "../reporting/reportUtils";

const HASHTAG_SPLIT_REGEX = /(#[\p{L}\p{N}_]+)/gu;
const renderTextWithHashtags = (text) => {
  if (!text) return "";
  return String(text).split(HASHTAG_SPLIT_REGEX).map((part, idx) =>
    part.startsWith("#") ? <span key={`hash-${idx}`} className="post-hashtag">{part}</span> : part
  );
};

// --- Sub-Components ---
function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(28, 39, 76, 0.2)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "white", padding: 30, borderRadius: 20, width: 350, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <h3 style={{ color: "#1C274C", marginBottom: 20 }}>Do you want to delete this post?</h3>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #1C274C", background: "none", color: "#1C274C", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#FF4C4C", color: "white", cursor: "pointer", fontWeight: 600 }}>Delete</button>
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
    <div style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", background: bgColor, color: textColor, padding: "12px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, zIndex: 3000, animation: "slideUp 0.3s ease" }}>
      {message}
      <style>{`@keyframes slideUp { 0% { transform: translate(-50%, 100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
}

// --- Main Component ---
export default function PollPost({ postId, initialData }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const postRef = useRef(null);
  const hasRecordedView = useRef(false);

  const [post, setPost] = useState(initialData || null);
  const [pollData, setPollData] = useState(initialData?.pollOptions || []);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showFlagPopup, setShowFlagPopup] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [toast, setToast] = useState(null);

  const currentPostId = post?.id || post?._id || postId;
  const loggedUserId = user?.id || user?._id;
  const isAuthor = user && (String(user.id || user._id) === String(post?.authorId));

  const authorImg = post?.author?.image 
    ? (post.author.image.startsWith('http') ? post.author.image : `${BACKEND_URL}${post.author.image}`) 
    : profileDefault;

  const showToastFn = (message, type = "success") => setToast({ message, type });

  const handleSubmitPostReport = async (reason) => {
    try {
      const authToken = localStorage.getItem("token");
      await submitReport(authToken, { type: "POST", targetId: currentPostId, reason });
      showToastFn(`Reported for ${reason}`);
    } catch (error) {
      showToastFn("Failed to submit report", "error");
    } finally {
      setShowFlagPopup(false);
    }
  };

  const fetchPostData = async () => {
    if (!currentPostId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
        if (data.pollOptions) setPollData(data.pollOptions);
      }
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleDelete = async () => {
    const cid = post.id || post._id;
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${cid}`, { method: "DELETE" });
      if (res.ok) {
        showToastFn("Post deleted");
        setShowDeleteModal(false);
        setPost(null); 
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) { 
        showToastFn("Delete failed", "error"); 
    }
  };

  // Vote Checking
  useEffect(() => {
    if (pollData && loggedUserId) {
      const votedOption = pollData.find(opt => 
        opt.votedUsers?.some(v => {
          const vId = (typeof v === 'object' && v !== null) ? (v.id || v._id) : v;
          return String(vId) === String(loggedUserId);
        })
      );
      if (votedOption) {
        setSelectedOption(votedOption.id);
        setShowResults(true);
      }
    }
  }, [pollData, loggedUserId]);

  useEffect(() => {
    fetchPostData();
    const interval = setInterval(fetchPostData, 15000);
    return () => clearInterval(interval);
  }, [currentPostId]);

  // View recording logic
  useEffect(() => {
    if (!currentPostId || hasRecordedView.current) return;
    const sessionKey = `viewed_poll_${currentPostId}`;
    if (sessionStorage.getItem(sessionKey)) {
      hasRecordedView.current = true;
      return;
    }
    let timer;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          timer = setTimeout(() => {
            if (!hasRecordedView.current) recordView(sessionKey);
          }, 2000);
        } else { clearTimeout(timer); }
      }, { threshold: 0.6 });
    if (postRef.current) observer.observe(postRef.current);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [currentPostId]);

  const recordView = async (sessionKey) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedUserId || "anonymous" })
      });
      if (res.ok) {
        const data = await res.json();
        hasRecordedView.current = true;
        sessionStorage.setItem(sessionKey, "true");
        setPost(prev => prev ? ({ ...prev, viewsCount: data.viewsCount }) : null);
      }
    } catch (e) { console.error(e); }
  };

  const handleVote = async (e, optionId) => {
    e.stopPropagation(); 
    if (!loggedUserId) return showToastFn("Please login to vote", "error");
    if (selectedOption) return; 
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedUserId, optionId }),
      });
      if (res.ok) {
        await fetchPostData();
        showToastFn("Vote recorded!");
      }
    } catch (err) { showToastFn("Error voting", "error"); }
  };

  const toggleSave = async (e) => {
    e.stopPropagation();
    if (!loggedUserId) return showToastFn("Please login first", "error");
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentPostId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.status);
        showToastFn(data.status ? "Saved" : "Removed from saves");
      }
    } catch (err) { console.error(err); }
  };

  if (!post) return null;

  const totalVotes = pollData.reduce((sum, o) => sum + (o._count?.votedUsers || 0), 0);
  const community = post.community || getCommunityById(post.communityId);
  const sources =
    Array.isArray(post.sources) && post.sources.length > 0
      ? post.sources
      : post.sourceLink
        ? [{ name: post.sourceName || "Source", link: post.sourceLink }]
        : [];

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showDeleteModal && <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} />}

      <PostCard
        ref={postRef}
        onClick={() => navigate(`/post/${currentPostId}`)}
        style={{ cursor: "pointer", position: "relative" }}
      >
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={authorImg} onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); }}
              style={{ width: 41, height: 41, borderRadius: 999, objectFit: "cover", cursor: "pointer" }} alt="" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 400, color: "#1C274C" }}>{post.author?.name || "User"}</div>
              {community?.name && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  from <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/community/${community.id || community._id}`);
                    }}
                    style={{ color: "#1C274C", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {community.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1C274C" }}>{post.viewsCount || 0} views</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1C274C" }}>{totalVotes} voted</div>
            <div className="post-type-label" style={{ fontSize: 16, fontWeight: 800, color: "#FFC847" }}>poll</div>
          </div>
        </div>

        <div style={{ fontSize: 16, color: "#000", fontWeight: 500 }}>{renderTextWithHashtags(post.text)}</div>
        {!!post.keywords?.length && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {post.keywords.map((k, i) => (
              <span
                key={i}
                className="post-keyword-chip"
                style={{ background: "#ECF2F6", border: "0.5px solid #1C274C", padding: "4px 8px", borderRadius: 6, fontSize: 12, color: "#1C274C" }}
              >
                {k}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pollData.map((option) => {
            const currentOptionVotes = option._count?.votedUsers || 0;
            const percentage = totalVotes ? Math.round((currentOptionVotes / totalVotes) * 100) : 0;
            const isSelected = selectedOption === option.id;
            return (
              <div key={option.id} onClick={(e) => handleVote(e, option.id)}
                style={{
                  background: "#F6F6F6", borderRadius: 10, padding: "14px",
                  cursor: selectedOption ? "default" : "pointer",
                  border: isSelected ? "2px solid #FFC847" : "1px solid #D8DDE6",
                  position: "relative", overflow: "hidden"
                }}>
                {showResults && (
                  <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${percentage}%`, 
                    background: isSelected ? "rgba(255,200,71,0.3)" : "rgba(28, 39, 76, 0.08)", zIndex: 0 }} />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                  <span style={{ fontSize: 15, color: "#1C274C", fontWeight: isSelected ? 700 : 500 }}>{option.text} {isSelected && " ✓"}</span>
                  {showResults && <span style={{ fontSize: 14, fontWeight: 700 }}>{percentage}%</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(post.createdAt).toLocaleDateString()}</div>
            {sources.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSources(!showSources);
                }}
                className="sources-toggle-btn"
                style={{ background: "transparent", border: "none", color: "#FFC847", fontSize: 16, fontWeight: 500, cursor: "pointer" }}
              >
                <span className="sources-btn-text">{showSources ? "Hide Sources" : "View Sources"}</span>
              </button>
            )}
          </div>
          <div className="post-action-row" style={{ display: "flex", gap: 15, alignItems: "center" }}>
              <img className="post-action-icon" src={ShareIcon} onClick={(e) => { e.stopPropagation(); setShowShare(true); }} style={{ width: 18, cursor: "pointer" }} alt="" />
              <img className="post-action-icon" src={isSaved ? TagClickedIcon : TagIcon} onClick={toggleSave} style={{ width: 18, cursor: "pointer" }} alt="" />
              <div style={{ position: "relative" }}>
                <img className="post-action-icon" src={isAuthor ? MenuIcon : FlagIcon} onClick={(e) => { e.stopPropagation(); isAuthor ? setShowMenuPopup(!showMenuPopup) : setShowFlagPopup(!showFlagPopup); }} style={{ width: 18, cursor: "pointer" }} alt="" />
                {showFlagPopup && !isAuthor && (
                  <div style={{ position: "absolute", bottom: "100%", right: 0, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: 8, padding: 6, width: 180, zIndex: 10 }}>
                    {["Invalid resources", "Inappropriate language", "Spam"].map((opt) => (
                      <div key={opt} onClick={(e) => { e.stopPropagation(); handleSubmitPostReport(opt); }} style={{ padding: "8px", cursor: "pointer", fontSize: 13 }}>{opt}</div>
                    ))}
                  </div>
                )}
                {showMenuPopup && isAuthor && (
                  <div className="post-owner-menu-popup" style={{ position: "absolute", bottom: "100%", right: 0, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: 8, padding: 6, width: 120, zIndex: 10 }}>
                    <div onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); setShowMenuPopup(false); }} className="post-owner-menu-delete" style={{ padding: "8px", cursor: "pointer", fontSize: 13, color: "#FF4C4C", fontWeight: 600 }}>Delete Post</div>
                  </div>
                )}
              </div>
          </div>
        </div>

      {showSources && (
        <div style={{ marginTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.2)", paddingTop: 12 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <a
                href={s.link.startsWith("http") ? s.link : `https://${s.link}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "#1C274C", textDecoration: "none", fontSize: 14 }}
              >
                • {s.name}
              </a>
            </div>
          ))}
        </div>
      )}
      </PostCard>
      {showShare && <SharePopup id={currentPostId} type="post" onClose={() => setShowShare(false)} />}
    </>
  );
}
