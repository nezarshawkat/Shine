import React, { useState, useEffect, useContext, useRef } from "react";
import PostCard from "./PostCard.jsx";
import { useNavigate, Link } from "react-router-dom";
import { getCommunityById } from "../../utlis/getCommunity.js";
import { AuthContext } from "../AuthProvider.jsx";
import SharePopup from "./SharePopup.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";
import { submitReport } from "../reporting/reportUtils";
import ReportModal from "../reporting/ReportModal";

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

  const currentUrl = media[currentIndex];
  const isVideo = currentUrl.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 30,
          right: 30,
          background: "none",
          border: "none",
          color: "white",
          fontSize: 40,
          cursor: "pointer",
          zIndex: 3001,
        }}
      >
        &times;
      </button>

      {media.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            style={arrowStyle({ left: 30 })}
          >
            &#10094;
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            style={arrowStyle({ right: 30 })}
          >
            &#10095;
          </button>
        </>
      )}

      {isVideo ? (
        <video
          src={currentUrl}
          controls
          autoPlay
          style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8 }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={currentUrl}
          alt=""
          style={{
            maxWidth: "90%",
            maxHeight: "85%",
            borderRadius: 8,
            objectFit: "contain",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div
        style={{
          position: "absolute",
          bottom: 40,
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "5px 15px",
          borderRadius: 20,
          fontSize: 14,
        }}
      >
        {currentIndex + 1} / {media.length}
      </div>
    </div>
  );
}

const arrowStyle = (pos) => ({
  position: "absolute",
  ...pos,
  background: "rgba(255,255,255,0.1)",
  border: "none",
  color: "white",
  fontSize: 24,
  width: 50,
  height: 50,
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3001,
});

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(28, 39, 76, 0.2)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 20,
          width: 350,
          textAlign: "center",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ color: "#1C274C", marginBottom: 20 }}>
          Do you want to delete this critique?
        </h3>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #1C274C",
              background: "none",
              color: "#1C274C",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#FF4C4C",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Delete
          </button>
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
      <style>{`@keyframes slideUp { 0% { transform: translate(-50%, 100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
}

// --- Main Component ---

export default function CritiquePost({ postId, initialData }) {
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
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 600 : false,
  );

  const [imageIndex, setImageIndex] = useState(0);
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

  const isAuthor =
    user && (user.id === post?.authorId || user._id === post?.authorId);

  const isPostUpdated = () => {
    if (!post?.updatedAt || !post?.createdAt) return false;
    return (
      new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() >
      2000
    );
  };

  const recordView = async (currentId, sessionKey) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${currentId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id || user?._id || "anonymous" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) => ({ ...prev, viewsCount: data.viewsCount }));
        setHasViewed(true);
        sessionStorage.setItem(sessionKey, "true");
      }
    } catch (e) {
      console.error("View tracking error", e);
    }
  };

  useEffect(() => {
    const currentId = initialData?.id || initialData?._id || postId;
    if (!currentId || hasViewed) return;

    const sessionKey = `viewed_critique_${currentId}`;
    if (sessionStorage.getItem(sessionKey)) {
      setHasViewed(true);
      return;
    }

    let timer;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timer = setTimeout(() => recordView(currentId, sessionKey), 2000);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );

    if (postRef.current) observer.observe(postRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [postId, post, hasViewed]);

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
      } catch (err) {
        console.error("Fetch error", err);
      }

      if (user) {
        try {
          const userId = user.id || user._id;
          const [likeRes, saveRes] = await Promise.all([
            fetch(
              `${BACKEND_URL}/api/posts/${currentId}/like-status?userId=${userId}`,
            ),
            fetch(
              `${BACKEND_URL}/api/posts/${currentId}/save-status?userId=${userId}`,
            ),
          ]);
          if (likeRes.ok) setIsLiked((await likeRes.json()).liked);
          if (saveRes.ok) setIsSaved((await saveRes.json()).saved);
        } catch (err) {
          console.error("Status check failed", err);
        }
      }
    }
    fetchDetails();
  }, [postId, user, initialData]);

  useEffect(() => {
    const media = post?.media || [];
    if (media.length > 1 && maximizedIndex === null) {
      const interval = setInterval(
        () => setImageIndex((i) => (i + 1) % media.length),
        3000,
      );
      return () => clearInterval(interval);
    }
  }, [post?.media, maximizedIndex]);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleInteraction = async (endpoint, setter, successMsg) => {
    if (!user) return showToast("Please login first", "error");
    const currentPostId = post.id || post._id;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/posts/${currentPostId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id || user._id }),
        },
      );
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      if (typeof data.status === "boolean") setter(data.status);

      setPost((prev) => ({
        ...prev,
        likesCount:
          data.likesCount !== undefined ? data.likesCount : prev.likesCount,
        sharesCount:
          data.sharesCount !== undefined ? data.sharesCount : prev.sharesCount,
        commentsCount:
          data.commentsCount !== undefined
            ? data.commentsCount
            : prev.commentsCount,
      }));

      showToast(data.status !== false ? successMsg : "Action removed");
    } catch (err) {
      showToast("Action failed", "error");
    }
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/posts/${post.id || post._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editText }),
        },
      );
      if (res.ok) {
        const updatedPost = await res.json();
        setPost((prev) => ({
          ...prev,
          text: updatedPost.text,
          updatedAt: updatedPost.updatedAt,
        }));
        setIsEditing(false);
        showToast("Critique updated successfully");
      }
    } catch (err) {
      showToast("Update failed", "error");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/posts/${post.id || post._id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        showToast("Critique deleted");
        setShowDeleteModal(false);
        setPost(null);
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) {
      showToast("Delete failed", "error");
    }
  };

  if (!post) return null;

  const authorImage = post.author?.image
    ? post.author.image.startsWith("http")
      ? post.author.image
      : `${BACKEND_URL}${post.author.image}`
    : profileDefault;

  const mediaList =
    post.media?.map((m) =>
      m.url.startsWith("http") ? m.url : `${BACKEND_URL}${m.url}`,
    ) || [];
  const community = post.community || getCommunityById(post.communityId);
  const originalPost = post.parentPost;
  const sources =
    Array.isArray(post.sources) && post.sources.length > 0
      ? post.sources
      : post.sourceLink
        ? [{ name: post.sourceName || "Source", link: post.sourceLink }]
        : [];

  const MAX_CHARS = 900;
  const displayText =
    !expanded && post.text?.length > MAX_CHARS
      ? post.text.slice(0, MAX_CHARS) + "..."
      : post.text;

  const dateObj = new Date(post.createdAt);
  const formattedDate = dateObj.toLocaleDateString();
  const formattedTime = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <style>{`
        .critique-post-content-layout {
          align-items: flex-start;
        }
        @media (max-width: 768px) {
          .critique-post-main-layout {
            flex-direction: column !important;
            flex-wrap: nowrap !important;
          }
          .critique-post-media-block {
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 16 / 9;
            flex: unset !important;
          }
          .critique-post-desktop-keywords {
            display: none !important;
          }
          .critique-post-mobile-keywords {
            display: flex !important;
            gap: 7px;
            flex-wrap: wrap;
            margin-top: 10px;
            order: 2;
          }
          .critique-post-main-content {
            order: 3;
          }
          .critique-post-media-block {
            order: 4;
          }
        }
        @media (max-width: 600px) {
          .critique-post-timestamp {
            display: none !important;
          }
          .critique-post-content-layout {
            flex-direction: column;
          }
          .critique-post-text-pane {
            width: 100%;
          }
          .critique-post-media-block {
            width: 100% !important;
            max-width: 100% !important;
          }
          .critique-post-sources-btn-full {
            display: none !important;
          }
          .critique-post-sources-btn-mobile {
            display: inline !important;
          }
          .critique-post-action-row {
            gap: 10px !important;
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .critique-post-header-meta {
            gap: 10px !important;
          }
          .critique-post-view-text {
            font-size: 14px !important;
          }
        }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <ImageMaximizer
        media={mediaList}
        currentIndex={maximizedIndex}
        onClose={() => setMaximizedIndex(null)}
        onNext={() =>
          setMaximizedIndex((maximizedIndex + 1) % mediaList.length)
        }
        onPrev={() =>
          setMaximizedIndex(
            (maximizedIndex - 1 + mediaList.length) % mediaList.length,
          )
        }
      />

      <PostCard ref={postRef}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            <div style={{ position: "relative", width: 41, height: 41 }}>
              <Link
                to={`/profile/${post.author?.username}`}
                style={{ textDecoration: "none" }}
              >
                <img
                  src={authorImage}
                  alt=""
                  style={{
                    width: 41,
                    height: 41,
                    borderRadius: 999,
                    objectFit: "cover",
                  }}
                />
              </Link>

              {originalPost?.author && (
                <img
                  src={
                    originalPost.author.image
                      ? originalPost.author.image.startsWith("http")
                        ? originalPost.author.image
                        : `${BACKEND_URL}${originalPost.author.image}`
                      : profileDefault
                  }
                  alt=""
                  style={{
                    position: "absolute",
                    bottom: -3,
                    right: -5,
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    objectFit: "cover",
                    border: "2px solid white",
                  }}
                />
              )}
            </div>

            <div>
              <Link
                to={`/profile/${post.author?.username}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{ fontSize: 16, fontWeight: 400, color: "#1C274C" }}
                >
                  {post.author?.name || "User"}
                </div>
              </Link>

              {community?.name && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  from{" "}
                  <span style={{ fontWeight: "bold", color: "#1C274C" }}>
                    {community.name}
                  </span>
                </div>
              )}
            </div>

            {originalPost?.author && window.innerWidth > 768 && (
              <span
                style={{
                  fontSize: 14,
                  color: "#1C274C",
                  marginLeft: 6,
                }}
              >
                on {originalPost.author.name}'s post
              </span>
            )}
          </div>
          <div
            className="critique-post-header-meta"
            style={{ display: "flex", alignItems: "center", gap: 15 }}
          >
            <div
              className="critique-post-view-text"
              style={{ fontSize: 16, fontWeight: 500, color: "#1C274C" }}
            >
              {post.viewsCount || 0} views
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#FFC847",
                textTransform: "lowercase",
              }}
            >
              {post.type}
            </div>
          </div>
        </div>

        {originalPost && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/post/${originalPost.id || originalPost._id}`);
            }}
            style={{
              marginTop: 10,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#F6F6F6",
              border: "0.5px solid #1C274C",
              minHeight: 49,
              borderRadius: 13,
              fontSize: isMobileView ? 14 : 16,
              color: "#1C274C",
              cursor: "pointer",
              width: "100%",
              boxSizing: "border-box",
              gap: 8,
            }}
          >
            <div
              style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {originalPost.text}
            </div>
            <button
              style={{
                background: "transparent",
                border: "none",
                color: "#1C274C",
                fontSize: isMobileView ? 14 : 16,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isMobileView ? "View" : "View Post"}
            </button>
          </div>
        )}

        <div className="critique-post-main-layout" style={{ marginTop: 0, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div className="critique-post-main-content" style={{ flex: "1 1 320px", minWidth: 0 }}>
            <div className="critique-post-desktop-keywords"
              style={{
                display: "flex",
                gap: 7,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              {post.keywords?.map((k, i) => (
                <span
                  key={i}
                  style={{
                    background: "#ECF2F6",
                    border: "0.5px solid #1C274C",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  {k}
                </span>
              ))}
            </div>

          <div
            className="critique-post-mobile-keywords"
            style={{ display: "none", marginBottom: 12, }}
          >
            {post.keywords?.map((k, i) => (
              <span
                key={`mobile-${i}`}
                style={{
                  background: "#ECF2F6",
                  border: "0.5px solid #1C274C",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                {k}
              </span>
            ))}
          </div>

            {isEditing ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    width: "100%",
                    height: 120,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #1C274C",
                    resize: "none",
                    fontSize: 16,
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={handleEditSave}
                    style={{
                      background: "#1C274C",
                      color: "#FFC847",
                      border: "none",
                      padding: "6px 15px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{
                      background: "#ECF2F6",
                      color: "#1C274C",
                      border: "none",
                      padding: "6px 15px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate(`/post/${post.id || post._id}`)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ fontSize: 16, color: "#000", lineHeight: 1.5 }}>
                  {displayText}
                </div>
                {post.text?.length > MAX_CHARS && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#FFC847",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {expanded ? "Show less" : "... Read more"}
                  </button>
                )}
              </div>
            )}
          </div>
          {mediaList.length > 0 && !isEditing && (
            <div
              className="critique-post-media-block"
              style={{
                width: "min(277px, 100%)",
                height: "auto",
                aspectRatio: "16 / 10",
                flex: "1 1 260px",
                borderRadius: 12,
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
                cursor: "zoom-in",
              }}
              onClick={() => setMaximizedIndex(imageIndex)}
            >
              {mediaList[imageIndex].match(/\.(mp4|webm|ogg)$/i) ? (
                <video
                  src={mediaList[imageIndex]}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <img
                  src={mediaList[imageIndex]}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}

              {mediaList.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 4,
                  }}
                >
                  {mediaList.map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        border: "1px solid #1C274C",
                        background:
                          idx === imageIndex ? "#FFC847" : "transparent",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
                  </div>

        {!isEditing && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 15,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                className="critique-post-timestamp"
                style={{ fontSize: 12, color: "#6b7280" }}
              >
                {isPostUpdated() && "(Updated) "}
                {formattedDate} • {formattedTime}
              </div>
              {sources.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSources(!showSources);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#FFC847",
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <span className="critique-post-sources-btn-full">
                    {showSources ? "Hide Sources" : "View Sources"}
                  </span>
                  <span
                    className="critique-post-sources-btn-mobile"
                    style={{ display: "none" }}
                  >
                    Sources
                  </span>
                </button>
              )}
            </div>

            <div
              className="critique-post-action-row"
              style={{ display: "flex", gap: 17, alignItems: "center" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img
                  src={isLiked ? HeartClickedIcon : HeartIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInteraction("like", setIsLiked, "Liked");
                  }}
                  style={{ width: 20, cursor: "pointer" }}
                />
                <span
                  style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}
                >
                  {post.likesCount || 0}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img
                  src={CommentIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/post/${post.id || post._id}`);
                  }}
                  style={{ width: 20, cursor: "pointer" }}
                />
                <span
                  style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}
                >
                  {post.commentsCount || 0}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img
                  src={ShareIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInteraction("share", () => {}, "Shared");
                    setShowShare(true);
                  }}
                  style={{ width: 20, cursor: "pointer" }}
                />
                <span
                  style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}
                >
                  {post.sharesCount || 0}
                </span>
              </div>

              <img
                src={ArrowIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/critique-create", {
                    state: {
                      replyToId: post.id || post._id,
                      replyToContent: post.text,
                    },
                  });
                }}
                style={{ width: 20, cursor: "pointer" }}
              />

              {!isAuthor && (
                <div style={{ position: "relative" }}>
                  <img
                    src={FlagIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFlagPopup(!showFlagPopup);
                    }}
                    style={{ width: 20, cursor: "pointer" }}
                  />
                </div>
              )}

              <img
                src={isSaved ? TagClickedIcon : TagIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  handleInteraction("save", setIsSaved, "Saved");
                }}
                style={{ width: 20, cursor: "pointer" }}
              />

              {isAuthor && (
                <div style={{ position: "relative" }}>
                  <img
                    src={MenuIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenuPopup(!showMenuPopup);
                    }}
                    style={{ width: 20, cursor: "pointer" }}
                  />
                  {showMenuPopup && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        right: 0,
                        background: "white",
                        boxShadow: "0 0px 10px rgba(0,0,0,0.1)",
                        borderRadius: 8,
                        padding: 6,
                        width: 120,
                        zIndex: 10,
                      }}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditing(true);
                          setShowMenuPopup(false);
                        }}
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#1C274C",
                        }}
                      >
                        Edit
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(true);
                          setShowMenuPopup(false);
                        }}
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#FF4C4C",
                        }}
                      >
                        Delete
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showSources && (
          <div
            style={{
              marginTop: 12,
              borderTop: "0.5px solid rgba(0,0,0,0.2)",
              paddingTop: 12,
            }}
          >
            {sources.map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <a
                  href={
                    s.link.startsWith("http") ? s.link : `https://${s.link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: "#1C274C",
                    textDecoration: "none",
                    fontSize: 14,
                  }}
                >
                  • {s.name}
                </a>
              </div>
            ))}
          </div>
        )}
      </PostCard>
      {showShare && (
        <SharePopup
          id={post.id || post._id}
          type="post"
          onClose={() => setShowShare(false)}
        />
      )}
      <ReportModal
        open={showFlagPopup}
        title="Report post"
        prompt="Please describe why you are reporting this post."
        placeholder="Write report reason..."
        onClose={() => setShowFlagPopup(false)}
        onSelect={handleSubmitPostReport}
      />
    </>
  );
}
