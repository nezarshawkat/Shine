import React, { useState, useContext, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import "../styles/ProfilePage.css";
import API from "/workspaces/Shine/frontend/src/api.js";
import { API_BASE_URL, BACKEND_URL } from "../api";

import OpinionPost from "./posts/opinionPost.jsx";
import AnalysisPost from "./posts/analysisPost.jsx";
import CritiquePost from "./posts/critiquePost.jsx";
import PollPost from "./posts/pollPost.jsx";

import CommunityCard from "./communities/CommunityCard.jsx";
import Post from "/workspaces/Shine/frontend/src/components/articles/Post.jsx";
import UserPlusIcon from "../assets/User Plus.svg";
import profileDefault from "../assets/profileDefault.svg";

import { AuthContext } from "./AuthProvider.jsx";
import SharePopup from "/workspaces/Shine/frontend/src/components/posts/SharePopup.jsx";
import ProfileSettings from "/workspaces/Shine/frontend/src/components/ProfileSettings.jsx";

/**
 * Inline ReportModal Component
 */
const ReportModal = ({ open, onClose, onSelect, title }) => {
  const [reason, setReason] = useState("");
  if (!open) return null;

  const reasons = [
    "Harassment",
    "Inappropriate Content",
    "Spam",
    "Impersonation",
    "Other",
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>Why are you reporting this profile?</p>
        <div className="report-reasons">
          {reasons.map((r) => (
            <button 
              key={r} 
              className={`reason-btn ${reason === r ? 'selected' : ''}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="submit-btn" 
            disabled={!reason} 
            onClick={() => onSelect(reason)}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage({
  user: initialUser,
  posts = [],
  likedPosts = [],
  savedPosts = [],
  communities: initialCommunities = [],
}) {
  const { user: loggedInUser, logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("Posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [fetchedCommunities, setFetchedCommunities] = useState(initialCommunities);
  const [fetchedArticles, setFetchedArticles] = useState([]);

  const getImageUrl = (img) => {
    if (!img) return profileDefault;
    if (img.startsWith("blob:") || img.startsWith("http")) return img;
    return `${BACKEND_URL}${img}`;
  };

  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedUsername, setEditedUsername] = useState(user?.username || "");
  const [editedDescription, setEditedDescription] = useState(user?.description || "");
  const [imagePreview, setImagePreview] = useState(getImageUrl(user?.image));
  const [imageFile, setImageFile] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(user?.followers?.length || 0);

  const menuRef = useRef(null);

  const normalizeId = (u) => u?.id || u?._id || null;
  const userId = normalizeId(user);
  const loggedInUserId = normalizeId(loggedInUser);
  const isCurrentUser = userId === loggedInUserId;

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setImagePreview(getImageUrl(user?.image));
    setEditedName(user?.name || "");
    setEditedUsername(user?.username || "");
    setEditedDescription(user?.description || "");
    setFollowerCount(user?.followers?.length || 0);

    if (user?.followers && loggedInUserId) {
      const following = user.followers.some(
        (f) => normalizeId(f) === loggedInUserId || f.followerId === loggedInUserId
      );
      setIsFollowing(following);
    }
  }, [user, loggedInUserId]);

  useEffect(() => {
    const handleScroll = () => {
      if (!isMobile) setShowSearch(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  useEffect(() => {
    if (activeTab === "Communities" && userId) {
      API.get(`/communities`)
        .then((res) => {
          const allComms = Array.isArray(res.data) ? res.data : [];
          const userComms = allComms.filter(c => 
            c.creatorId === userId || 
            (c.communityMembers && c.communityMembers.some(m => m.userId === userId))
          );
          setFetchedCommunities(userComms);
        })
        .catch((err) => console.error("Error loading communities", err));
    }
    if (activeTab === "Articles" && userId) {
      API.get(`/articles/user/${userId}`)
        .then((res) => setFetchedArticles(Array.isArray(res.data) ? res.data : []))
        .catch((err) => console.error("Error loading articles", err));
    }
  }, [activeTab, userId]);

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append("name", editedName);
      formData.append("username", editedUsername);
      formData.append("description", editedDescription);
      if (imageFile) formData.append("image", imageFile);

      const res = await API.put(`/users/${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const returnedUser = res.data.user;
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...storedUser, ...returnedUser }));

      setUser(returnedUser);
      setEditMode(false);
      if (user.username !== returnedUser.username) {
        window.location.href = `/profile/${returnedUser.username}`;
      } else {
        setImagePreview(getImageUrl(returnedUser.image));
      }
    } catch (err) {
      alert("Error updating profile.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFollowToggle = async () => {
    if (!loggedInUserId) return alert("Please log in to follow users");
    const endpoint = isFollowing ? "unfollow" : "follow";
    try {
      await API.post(`/follow/${userId}/${endpoint}`, { followerId: loggedInUserId });
      setIsFollowing(!isFollowing);
      setFollowerCount((prev) => (isFollowing ? prev - 1 : prev + 1));
    } catch (err) {
      if (err.response?.data?.error === "Already following") setIsFollowing(true);
    }
  };

  const submitUserReport = async (reason) => {
    try {
      // Assuming API handles reports or you have a dedicated route
      await API.post("/reports", { 
        type: "PROFILE", 
        targetId: userId, 
        reason 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Report submitted.");
    } catch (err) {
      alert("Failed to submit report");
    } finally {
      setShowReportModal(false);
      setMenuOpen(false);
    }
  };

  const renderPostByType = (post, index) => {
    const componentMap = { opinion: OpinionPost, analysis: AnalysisPost, critique: CritiquePost, poll: PollPost };
    const Component = componentMap[post.type] || OpinionPost;
    return (
      <div key={post.id || index} className="profile-post-wrapper">
        <Component postId={post.id} initialData={post} />
      </div>
    );
  };

  const ActionButtons = () => (
    <div className="profile-action-group">
      {isCurrentUser ? (
        <button className="follow-btn" onClick={editMode ? handleSaveProfile : () => setEditMode(true)}>
          {editMode ? "Save" : "Edit Profile"}
        </button>
      ) : (
        <button className={`follow-btn ${isFollowing ? "following" : ""}`} onClick={handleFollowToggle}>
          {!isFollowing && <img src={UserPlusIcon} alt="" width={20} />}
          {isFollowing ? "Following" : "Follow"}
        </button>
      )}

      <div className="menu-container-relative">
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="icon">⋮</span>
        </button>
        {menuOpen && (
          <div className="profile-menu-popup">
            <div onClick={() => { setShareOpen(true); setMenuOpen(false); }}>Share Profile</div>
            {isCurrentUser ? (
              <>
                <div onClick={() => { setShowSettings(true); setMenuOpen(false); }}>Settings</div>
                <div className="logout-item" onClick={() => { logout(); navigate("/"); }}>Logout</div>
              </>
            ) : (
              <div className="report-item" onClick={() => { setShowReportModal(true); setMenuOpen(false); }} style={{ color: "#FF4D4D" }}>Report Profile</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const tabs = ["Posts", "Communities", "Articles", "Liked Posts"];
  if (isCurrentUser) tabs.push("Saved");

  const getFilteredData = (data, searchKey = "content") => {
    if (!searchQuery) return data;
    return data.filter((item) => {
      const val = item[searchKey] || item.title || item.name || item.communityName || "";
      return val.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  return (
    <>
      <Header />
      
      {showSettings && (
        <ProfileSettings 
          user={user} 
          onClose={() => setShowSettings(false)} 
          logout={logout}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}

      {shareOpen && <SharePopup postId={user.id} onClose={() => setShareOpen(false)} />}
      
      <ReportModal
        title="Report User"
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSelect={submitUserReport}
      />

      <div className="profile-page">
        <div className="profile-top">
          <div className="profile-left">
            <div style={{ position: "relative" }}>
              <img src={imagePreview} alt="Profile" className="profile-image" onError={(e) => { e.target.src = profileDefault; }} />
              {editMode && (
                <label className="edit-image-label">
                  Change
                  <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <div className="profile-info">
              <h2 className="profile-name">
                {editMode ? <input value={editedName} onChange={(e) => setEditedName(e.target.value)} /> : editedName}
              </h2>
              <div className="profile-username">
                @{editMode ? <input value={editedUsername} onChange={(e) => setEditedUsername(e.target.value)} /> : editedUsername}
              </div>

              <div className="profile-follow">
                <button style={{ all: "unset", cursor: "pointer" }} onClick={() => navigate(`/${user.username}/followers`)}>
                  {followerCount} followers
                </button>
                <button style={{ all: "unset", cursor: "pointer" }} onClick={() => navigate(`/${user.username}/following`)}>
                  {user.following?.length || 0} following
                </button>
              </div>
            </div>

            <div className="profile-badge">
              <span>{user.roleLevel || "Starter"}</span>
              <span className="icon">ⓘ</span>
            </div>
          </div>

          <p className="profile-description">
            {editMode ? <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} /> : (editedDescription || "Hello everyone, I am a new member at Shine!")}
          </p>

          {isMobile && (
            <div className="mobile-action-container">
              <ActionButtons />
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="profile-sticky-container">
          <div className="profile-tabs">
            <div className="tabs-left">
              {tabs.map((tab) => (
                <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="tabs-right" ref={menuRef}>
              {!isMobile && (
                showSearch ? (
                  <div className="profile-search-container">
                    <input 
                      type="text" 
                      placeholder={`Search ${activeTab}...`} 
                      autoFocus 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                  </div>
                ) : (
                  <ActionButtons />
                )
              )}
            </div>
          </div>
          <div className="divider second" />
        </div>

        <div className="tab-content" style={{ minHeight: "100vh", padding: "20px 0" }}>
          {isMobile && (
             <div className="mobile-search-bar">
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
             </div>
          )}

          {activeTab === "Posts" && getFilteredData(posts).map((p, i) => renderPostByType(p, i))}
          
          {activeTab === "Communities" && getFilteredData(fetchedCommunities, "name").map((c) => (
            <CommunityCard 
              key={c.id || c._id} 
              community={{ 
                id: c.id || c._id, 
                communityIcon: getImageUrl(c.icon), 
                communityName: c.name, 
                bannerTitle: c.slogan || "", 
                descriptionText: c.discription || c.description || "No description provided.", 
                membersCountText: `${c._count?.communityMembers || c.memberCount || 0} members`, 
                imageUrl: getImageUrl(c.banner), 
                keywords: c.interests || [] 
              }} 
              feedWidth={isMobile ? window.innerWidth - 20 : 765} 
            />
          ))}

          {activeTab === "Articles" && (
            <div className="articles-feed-container">
              {getFilteredData(fetchedArticles, "title").map((art) => <Post key={art.id} article={art} profileUser={user} />)}
            </div>
          )}

          {activeTab === "Liked Posts" && getFilteredData(likedPosts).map((p, i) => renderPostByType(p, i))}
          
          {activeTab === "Saved" && isCurrentUser && getFilteredData(savedPosts).map((p, i) => (
            <div key={p.id || i} className="saved-post-container">
              {renderPostByType(p, i)}
            </div>
          ))}

          {getFilteredData(activeTab === "Posts" ? posts : (activeTab === "Communities" ? fetchedCommunities : (activeTab === "Articles" ? fetchedArticles : likedPosts))).length === 0 && (
            <div className="empty-state">No {activeTab.toLowerCase()} found</div>
          )}
        </div>
      </div>
    </>
  );
}