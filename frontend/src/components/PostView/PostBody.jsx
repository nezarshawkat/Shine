import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx"; 
import SharePopup from "/workspaces/Shine/frontend/src/components/posts/SharePopup.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";

// Icons
import ShareIcon from "/workspaces/Shine/frontend/src/assets/Share.svg";
import TagIcon from "/workspaces/Shine/frontend/src/assets/Tag.svg";
import TagClickedIcon from "/workspaces/Shine/frontend/src/assets/TagClicked.svg";
import FlagIcon from "/workspaces/Shine/frontend/src/assets/Flag.svg";
import ArrowIcon from "/workspaces/Shine/frontend/src/assets/arrow.svg";
import CommentIcon from "/workspaces/Shine/frontend/src/assets/comment.svg";
import HeartIcon from "/workspaces/Shine/frontend/src/assets/Heart.svg";
import HeartClickedIcon from "/workspaces/Shine/frontend/src/assets/HeartC.svg"; 
import profileDefault from "/workspaces/Shine/frontend/src/assets/profileDefault.svg";

const BASE_URL = BACKEND_URL;

// --- HELPERS ---
const getImageUrl = (path) => {
  if (!path) return profileDefault;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
};

// --- SUB-COMPONENTS ---

function ImageMaximizer({ media, currentIndex, onClose, onPrev, onNext }) {
  if (currentIndex === null || !media || media.length === 0) return null;

  const currentUrl = media[currentIndex];
  const isVideo = currentUrl.match(/\.(mp4|webm|ogg)$/i);

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

      {isVideo ? (
        <video src={currentUrl} controls autoPlay style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
      ) : (
        <img src={currentUrl} alt="" style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: 8, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
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
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3001
});

function Toast({ message, type = "success", duration = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  const textColor = type === "error" ? "#FFF" : "#FFC847";

  return (
    <div style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", background: bgColor, color: textColor, padding: "12px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, zIndex: 1100 }}>
      {message}
    </div>
  );
}

function CommentItem({ comment, user, onLike, onDelete, onEdit, onReport }) {
  const [showOptions, setShowOptions] = useState(false);
  const currentUserId = user?.id;
  const isOwner = currentUserId === comment.authorId;
  const likesCount = comment._count?.likes ?? 0;

  const commentAuthorImg = getImageUrl(comment.author?.image);

  return (
    <div style={{ display: "flex", gap: 12, marginTop: 15, position: "relative" }}>
      <Link to={`/profile/${comment.author?.username}`}>
        <img src={commentAuthorImg} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} alt="" />
      </Link>
      <div style={{ flex: 1 }}>
        <div style={{ background: "#F6F6F6", padding: "10px 14px", borderRadius: 15, display: "inline-block", minWidth: 120 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1C274C", marginBottom: 2 }}>
            {comment.author?.name} 
            {comment.updatedAt !== comment.createdAt && <span style={{ color: "#888", marginLeft: 5, fontSize: 10, fontWeight: 400 }}>(edited)</span>}
          </div>
          <div style={{ fontSize: 14, color: "#1C274C" }}>{comment.text}</div>
        </div>
        
        <div style={{ display: "flex", gap: 15, marginTop: 5, marginLeft: 5, fontSize: 12, color: "#666", fontWeight: 600 }}>
          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
          <span 
            style={{ cursor: "pointer", color: comment.isLiked ? "#FFC847" : "#666", transition: "color 0.2s" }} 
            onClick={() => onLike(comment.id)}
          >
            {comment.isLiked ? "Liked" : "Like"} {likesCount > 0 && `(${likesCount})`}
          </span>
        </div>
      </div>

      <div style={{ cursor: "pointer", padding: "0 5px" }} onClick={() => setShowOptions(!showOptions)}>
        <div style={{ color: "#1C274C", fontWeight: "bold" }}>...</div>
        {showOptions && (
          <div style={{ position: "absolute", right: 0, top: 20, background: "#FFF", border: "0.5px solid #1C274C", borderRadius: 8, zIndex: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.1)", minWidth: 100 }}>
            {isOwner ? (
              <>
                <div style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }} onClick={() => { onEdit(comment); setShowOptions(false); }}>Edit</div>
                <div style={{ padding: "8px 12px", fontSize: 13, color: "red", cursor: "pointer" }} onClick={() => { onDelete(comment.id); setShowOptions(false); }}>Delete</div>
              </>
            ) : (
              <div style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }} onClick={() => { onReport(comment.id); setShowOptions(false); }}>Report</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function PostBody() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [expanded, setExpanded] = useState(false);
  
  // Media States
  const [imageIndex, setImageIndex] = useState(0);
  const [maximizedIndex, setMaximizedIndex] = useState(null);

  const [showShare, setShowShare] = useState(false);
  const [showFlagPopup, setShowFlagPopup] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState(null);

  const [votedOptionId, setVotedOptionId] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const formatExternalLink = (url) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchPostData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: token ? `Bearer ${token}` : "" };
        
        const [postRes, commentRes] = await Promise.all([
          fetch(`${BASE_URL}/api/posts/${postId}`, { headers }),
          fetch(`${BASE_URL}/api/posts/${postId}/comments`, { headers })
        ]);

        if (!postRes.ok) throw new Error("Post not found");
        
        const postData = await postRes.json();
        const commentData = await commentRes.json();
        
        setPost(postData);
        setComments(commentData);
        setIsLiked(postData.isLiked);
        setIsSaved(postData.isSaved);

        if (postData.type?.toLowerCase() === "poll" && postData.pollOptions) {
          const userVote = postData.pollOptions.find(opt => 
            opt.votedUsers?.some(v => v.id === user?.id)
          );
          if (userVote) setVotedOptionId(userVote.id);
        }

      } catch (err) { 
        console.error("Fetch Error:", err); 
      }
    };

    fetchPostData();
  }, [postId, user, authLoading]);

  // Preview Slideshow Logic
  useEffect(() => {
    const media = post?.media || [];
    if (media.length > 1 && maximizedIndex === null) {
      const interval = setInterval(() => setImageIndex((i) => (i + 1) % media.length), 3000);
      return () => clearInterval(interval);
    }
  }, [post?.media, maximizedIndex]);

  const handleInteraction = async (endpoint, setter, successMsg) => {
    if (!user) return showToast("Please login first", "error");
    try {
      const res = await fetch(`${BASE_URL}/api/posts/${postId}/${endpoint}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setter(data.status);
      setPost(prev => ({
        ...prev,
        likesCount: data.likesCount !== undefined ? data.likesCount : prev.likesCount,
        sharesCount: data.sharesCount !== undefined ? data.sharesCount : prev.sharesCount,
        commentsCount: data.commentsCount !== undefined ? data.commentsCount : prev.commentsCount
      }));
      showToast(data.status ? successMsg : "Action removed");
    } catch (err) { showToast("Action failed", "error"); }
  };

  const handlePollVote = async (optionId) => {
    if (!user) return showToast("Login to vote", "error");
    if (votedOptionId) return;

    try {
      const res = await fetch(`${BASE_URL}/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ optionId }),
      });
      if (!res.ok) throw new Error();
      setVotedOptionId(optionId);
      showToast("Vote registered!");
      const token = localStorage.getItem("token");
      const updated = await fetch(`${BASE_URL}/api/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPost(await updated.json());
    } catch (err) { showToast("Voting failed", "error"); }
  };

  const handlePostComment = async () => {
    if (!user) return showToast("Login to comment", "error");
    if (!commentText.trim()) return;
    const token = localStorage.getItem("token");

    try {
      if (editingComment) {
        const res = await fetch(`${BASE_URL}/api/comments/${editingComment.id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ text: commentText }),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await res.json();
        setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
        setEditingComment(null);
        showToast("Comment updated");
      } else {
        const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ text: commentText }),
        });
        if (!res.ok) throw new Error("Failed to post");
        const newC = await res.json();
        setComments(prev => [newC, ...prev]);
        setPost(prev => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));
        showToast("Comment posted");
      }
      setCommentText("");
    } catch (err) { showToast("Operation failed", "error"); }
  };

  const deleteComment = async (id) => {
    if (!user) return;
    try {
      const res = await fetch(`${BASE_URL}/api/comments/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error();
      setComments(prev => prev.filter(c => c.id !== id));
      setPost(prev => ({ ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - 1) }));
      showToast("Comment deleted");
    } catch (err) { showToast("Could not delete", "error"); }
  };

  const handleLikeComment = async (id) => {
    if (!user) return showToast("Login to like", "error");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/comments/${id}/like`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(prev => prev.map(c => c.id === id ? { ...c, isLiked: data.liked, _count: { ...c._count, likes: data.likeCount } } : c ));
    } catch (err) { showToast("Error liking comment", "error"); }
  };

  if (authLoading || !post) return <div style={{ textAlign: "center", marginTop: 50 }}>Loading post content...</div>;

  const isPoll = post.type?.toLowerCase() === "poll";
  const postDate = new Date(post.createdAt);
  const postAuthorImg = getImageUrl(post.author?.image);
  const mediaUrls = post.media?.map(m => m.url.startsWith('http') ? m.url : `${BASE_URL}${m.url}`) || [];

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <ImageMaximizer 
        media={mediaUrls} 
        currentIndex={maximizedIndex} 
        onClose={() => setMaximizedIndex(null)}
        onNext={() => setMaximizedIndex((maximizedIndex + 1) % mediaUrls.length)}
        onPrev={() => setMaximizedIndex((maximizedIndex - 1 + mediaUrls.length) % mediaUrls.length)}
      />

      <div style={{ width: "100%", maxWidth: 900, margin: "20px auto", background: "#fff", border: "0.5px solid #1C274C", borderRadius: 23, padding: 20, boxSizing: "border-box" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to={`/profile/${post.author?.username}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <img src={postAuthorImg} alt="" style={{ width: 41, height: 41, borderRadius: 999, objectFit: "cover" }} />
              <div style={{ fontSize: 16, color: "#1C274C" }}>{post.author?.name || "Unknown User"}</div>
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 16, color: "#1C274C" }}>{post.viewsCount || 0} views</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#FFC847" }}>{post.type?.toLowerCase()}</div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(post.keywords || []).map((k, i) => (
                <div key={i} style={{ background: "#ECF2F6", border: "0.5px solid #1C274C", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>{k}</div>
              ))}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{!expanded && post.text?.length > 900 ? post.text.slice(0, 900) + "..." : post.text}</div>
            {post.text?.length > 900 && (
              <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#FFC847", cursor: "pointer", fontWeight: 600, width: "fit-content", padding: 0 }}>
                {expanded ? "Show less" : "Read more"}
              </button>
            )}

            {isPoll && post.pollOptions && (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {post.pollOptions.map((opt) => {
                  const totalVotes = post.pollOptions.reduce((acc, curr) => acc + (curr._count?.votedUsers || 0), 0);
                  const percentage = totalVotes > 0 ? Math.round(((opt._count?.votedUsers || 0) / totalVotes) * 100) : 0;
                  const isThisVoted = votedOptionId === opt.id;

                  return (
                    <div 
                      key={opt.id} 
                      onClick={() => handlePollVote(opt.id)}
                      style={{ 
                        position: "relative", padding: "12px 16px", borderRadius: "12px", border: "1px solid #1C274C", 
                        cursor: votedOptionId ? "default" : "pointer", overflow: "hidden", background: isThisVoted ? "#F0F7FF" : "#FFF"
                      }}
                    >
                      {votedOptionId && (
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${percentage}%`, background: "rgba(255, 200, 71, 0.2)", zIndex: 0, transition: "width 0.5s ease" }} />
                      )}
                      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: isThisVoted ? 700 : 400 }}>
                        <span>{opt.text}</span>
                        {votedOptionId && <span style={{ fontSize: 12 }}>{percentage}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {mediaUrls.length > 0 && (
            <div 
              onClick={() => setMaximizedIndex(imageIndex)}
              style={{ width: 277, height: 275, borderRadius: 12, overflow: "hidden", border: "0.5px solid #ddd", cursor: "zoom-in", position: "relative" }}
            >
              {mediaUrls[imageIndex].match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={mediaUrls[imageIndex]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={mediaUrls[imageIndex]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              {mediaUrls.length > 1 && (
                <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
                  {mediaUrls.map((_, idx) => (
                    <div key={idx} style={{ width: 6, height: 6, borderRadius: 999, border: "1px solid #1C274C", background: idx === imageIndex ? "#FFC847" : "transparent" }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 15 }}>
          <div style={{ fontSize: 14, color: "#1C274C", display: "flex", gap: 15 }}>
            <span>Date: {postDate.toLocaleDateString()}</span>
            <span>Time: {postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div style={{ display: "flex", gap: 17, alignItems: "center" }}>
            {!isPoll && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img src={isLiked ? HeartClickedIcon : HeartIcon} onClick={() => handleInteraction('like', setIsLiked, "Liked")} style={{ width: 20, cursor: "pointer" }} />
                <span style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}>{post.likesCount || 0}</span>
              </div>
            )}

            {!isPoll && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img src={CommentIcon} style={{ width: 20 }} />
                <span style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}>{post.commentsCount || 0}</span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <img src={ShareIcon} onClick={() => { handleInteraction('share', () => {}, "Shared"); setShowShare(true); }} style={{ width: 20, cursor: "pointer" }} />
              <span style={{ fontSize: 14, color: "#1C274C", fontWeight: 510 }}>{post.sharesCount || 0}</span>
            </div>

            {!isPoll && (
              <img src={ArrowIcon} onClick={() => navigate("/critique-create", { state: { replyToId: post.id, replyToContent: post.text } })} style={{ width: 20, cursor: "pointer" }} />
            )}
            
            <div style={{ position: "relative" }}>
              <img src={FlagIcon} onClick={() => setShowFlagPopup(!showFlagPopup)} style={{ width: 20, cursor: "pointer" }} />
              {showFlagPopup && (
                <div style={{ position: "absolute", bottom: "100%", right: 0, background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderRadius: 8, padding: 8, width: 200, zIndex: 10 }}>
                  {["Spam", "False Info", "Inappropriate"].map(opt => (
                    <div key={opt} onClick={() => { showToast(`Reported for ${opt}`); setShowFlagPopup(false); }} style={{ padding: "8px", cursor: "pointer", fontSize: 13 }}>{opt}</div>
                  ))}
                </div>
              )}
            </div>

            <img src={isSaved ? TagClickedIcon : TagIcon} onClick={() => handleInteraction('save', setIsSaved, "Saved")} style={{ width: 20, cursor: "pointer" }} />
          </div>
        </div>

        {!isPoll && (
          <>
            <div style={{ borderTop: "0.5px solid rgba(148, 148, 148, 0.25)", margin: "20px 0" }} />
            
            {post.sources?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1C274C", marginBottom: 15 }}>Sources</div>
                {post.sources.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 15, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFC847", marginTop: 7 }} />
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                        <a href={formatExternalLink(s.link)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#0066cc", textDecoration: "underline" }}>{s.link}</a>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "0.5px solid rgba(148, 148, 148, 0.25)", margin: "20px 0" }} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {editingComment && (
                <div style={{ fontSize: 12, color: "#666", display: "flex", justifyContent: "space-between", padding: "0 5px" }}>
                  <span>Editing your comment...</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline", color: "#1C274C" }} onClick={() => { setEditingComment(null); setCommentText(""); }}>Cancel Edit</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <input 
                  type="text" 
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #1C274C", outline: "none" }}
                />
                <button onClick={handlePostComment} style={{ background: "#1C274C", color: "#FFC847", border: "none", padding: "0 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                  {editingComment ? "Update" : "Post"}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 16, fontWeight: 600, color: "#1C274C", marginBottom: 10 }}>Comments ({post.commentsCount || comments.length})</div>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {comments.length > 0 ? (
                comments.map((c) => (
                  <CommentItem 
                    key={c.id} 
                    comment={c} 
                    user={user} 
                    onLike={handleLikeComment}
                    onDelete={deleteComment}
                    onEdit={(c) => { setEditingComment(c); setCommentText(c.text); window.scrollTo({ top: document.querySelector('input').offsetTop - 100, behavior: 'smooth' }); }}
                    onReport={() => showToast("Reported", "error")}
                  />
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#888", padding: "20px 0" }}>No comments yet. Be the first to share your thoughts!</div>
              )}
            </div>
          </>
        )}
      </div>
      {showShare && <SharePopup id={post.id} type="post" onClose={() => setShowShare(false)} />}
    </>
  );
}