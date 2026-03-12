import React, { useState, useContext, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import "../styles/ProfilePage.css";
import API from "/workspaces/Shine/frontend/src/api.js";

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

const BACKEND_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev";

// --- Sub-Component: Full Screen Settings Layer ---
function SettingsPage({ onClose, user, logout, onUserUpdate }) {
  const [activeSection, setActiveSection] = useState("Account");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const sections = [
    { id: "Account", icon: "👤" },
    { id: "Privacy", icon: "🔒" },
    { id: "Notifications", icon: "🔔" },
    { id: "Appearance", icon: "✨" },
    { id: "Blocked", icon: "🚫" },
  ];

  const handleEmailUpdate = async () => {
    if (!newEmail.includes("@")) return alert("Invalid email");
    setLoading(true);
    try {
      const res = await API.put(`/users/${user.id || user._id}`, { email: newEmail });
      onUserUpdate(res.data.user);
      setIsEditingEmail(false);
      alert("Email updated! Verification logic (Coming Soon).");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update email.");
    } finally { setLoading(false); }
  };

  const handlePasswordUpdate = async () => {
    if (passwords.next !== passwords.confirm) return alert("Passwords do not match");
    setLoading(true);
    try {
      await API.put(`/users/${user.id || user._id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.next
      });
      setIsEditingPassword(false);
      setPasswords({ current: "", next: "", confirm: "" });
      alert("Password updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Error updating password.");
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you absolutely sure? This action is permanent.")) {
      try {
        await API.delete(`/users/${user.id || user._id}`);
        logout();
      } catch (err) {
        alert("Error deleting account.");
      }
    }
  };

  // --- NEW: Handle Unblocking ---
  const handleUnblock = async (blockedUserId) => {
    try {
      await API.delete(`/follow/block/${blockedUserId}`);
      const updatedBlockedList = user.blockedUsers.filter(u => (u.id || u._id) !== blockedUserId);
      onUserUpdate({ ...user, blockedUsers: updatedBlockedList });
      alert("User unblocked.");
    } catch (err) {
      alert("Failed to unblock user.");
    }
  };

  return (
    <div className="full-settings-layer">
      <div className="settings-container">
        <aside className="settings-sidebar">
          <button className="settings-back-btn" onClick={onClose}>
            <span className="arrow">←</span> Back to Profile
          </button>
          <nav className="settings-nav">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`nav-item ${activeSection === s.id ? "active" : ""}`}
                onClick={() => {
                    setActiveSection(s.id);
                    setIsEditingEmail(false);
                    setIsEditingPassword(false);
                }}
              >
                <span className="nav-icon">{s.icon}</span> {s.id}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-button" onClick={logout}>Logout</button>
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-view-header">
            <h1>{activeSection} Settings</h1>
            <p>Manage your {activeSection.toLowerCase()} preferences and security.</p>
          </div>

          <div className="settings-scroll-area">
            {activeSection === "Account" && (
              <div className="settings-card-group">
                <div className="setting-row">
                  <div className="info">
                    <label>Email Address</label>
                    {isEditingEmail ? (
                      <div className="edit-input-wrapper">
                        <input className="shine-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" />
                      </div>
                    ) : (
                      <p>{user?.email || "user@shine.com"}</p>
                    )}
                  </div>
                  <div className="row-actions">
                    {isEditingEmail ? (
                      <>
                        <button className="save-btn" onClick={handleEmailUpdate} disabled={loading}>Save</button>
                        <button className="cancel-btn" onClick={() => setIsEditingEmail(false)}>Cancel</button>
                      </>
                    ) : (
                      <button className="action-btn" onClick={() => setIsEditingEmail(true)}>Change</button>
                    )}
                  </div>
                </div>

                <div className="setting-row" style={{ flexDirection: isEditingPassword ? 'column' : 'row', alignItems: isEditingPassword ? 'flex-start' : 'center' }}>
                  <div className="info">
                    <label>Password</label>
                    {isEditingPassword ? (
                      <div className="password-form">
                        <input type="password" className="shine-input" placeholder="Current Password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} />
                        <input type="password" className="shine-input" placeholder="New Password" value={passwords.next} onChange={(e) => setPasswords({...passwords, next: e.target.value})} />
                        <input type="password" className="shine-input" placeholder="Confirm New Password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} />
                      </div>
                    ) : (
                      <p>Keep your password strong for security.</p>
                    )}
                  </div>
                  <div className="row-actions" style={{ marginTop: isEditingPassword ? '15px' : '0' }}>
                    {isEditingPassword ? (
                      <>
                        <button className="save-btn" onClick={handlePasswordUpdate} disabled={loading}>Update Password</button>
                        <button className="cancel-btn" onClick={() => setIsEditingPassword(false)}>Cancel</button>
                      </>
                    ) : (
                      <button className="action-btn" onClick={() => setIsEditingPassword(true)}>Update</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(activeSection === "Privacy" || activeSection === "Notifications" || activeSection === "Appearance") && (
              <div className="empty-settings-state">
                <span className="big-icon">⏳</span>
                <h3>Coming Soon</h3>
                <p>We're working hard to bring {activeSection.toLowerCase()} controls to Shine.</p>
              </div>
            )}

            {activeSection === "Blocked" && (
              <div className="settings-card-group">
                {user?.blockedUsers?.length > 0 ? (
                    user.blockedUsers.map(u => (
                        <div key={u.id || u._id} className="setting-row">
                             <p>@{u.username}</p>
                             <button className="action-btn" onClick={() => handleUnblock(u.id || u._id)}>Unblock</button>
                        </div>
                    ))
                ) : (
                    <div className="empty-settings-state">
                        <span className="big-icon">🚫</span>
                        <p>You haven't blocked anyone yet.</p>
                    </div>
                )}
              </div>
            )}

            {activeSection === "Account" && (
              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <div className="setting-row no-border">
                  <div className="info">
                    <label style={{color: '#ff4d4d'}}>Delete Account</label>
                    <p>This will permanently erase all data. This cannot be undone.</p>
                  </div>
                  <button className="danger-action-btn" onClick={handleDeleteAccount}>Delete Permanently</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <style>{`
        .full-settings-layer { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #f8f9fa; z-index: 9999; display: flex; animation: pageFadeIn 0.3s ease; }
        .settings-container { display: flex; width: 100%; max-width: 1200px; margin: 0 auto; background: #fff; height: 100%; }
        .settings-sidebar { width: 280px; border-right: 1px solid #eee; padding: 40px 20px; display: flex; flex-direction: column; }
        .settings-back-btn { background: #1C274C; color: #FFC847; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-bottom: 40px; text-align: left; transition: transform 0.2s; }
        .settings-back-btn:hover { transform: translateX(-5px); }
        .settings-nav { flex: 1; }
        .nav-item { display: flex; align-items: center; width: 100%; padding: 14px 15px; border: none; background: none; border-radius: 10px; color: #555; font-size: 16px; font-weight: 500; cursor: pointer; margin-bottom: 5px; transition: 0.2s; }
        .nav-item.active { background: #f0f4ff; color: #1C274C; font-weight: 700; }
        .nav-item:hover:not(.active) { background: #f8f9fa; }
        .nav-icon { margin-right: 12px; font-size: 18px; }
        .settings-main { flex: 1; padding: 60px 80px; display: flex; flex-direction: column; background: #fff; overflow-y: auto; }
        .settings-view-header h1 { font-size: 32px; color: #1C274C; margin-bottom: 10px; }
        .settings-view-header p { color: #888; margin-bottom: 40px; }
        .settings-card-group { background: #fcfcfc; border: 1px solid #eee; border-radius: 16px; padding: 10px 25px; margin-bottom: 30px; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .setting-row.no-border { border-bottom: none; }
        .setting-row label { display: block; font-weight: 700; color: #1C274C; margin-bottom: 4px; }
        .setting-row p { margin: 0; font-size: 14px; color: #666; }
        .row-actions { display: flex; gap: 10px; }
        .shine-input { padding: 12px 15px; border-radius: 10px; border: 1.5px solid #eee; background: #fff; width: 100%; max-width: 300px; outline: none; transition: border-color 0.2s; margin-top: 8px; }
        .shine-input:focus { border-color: #FFC847; }
        .password-form { display: flex; flex-direction: column; gap: 8px; width: 300px; }
        .action-btn, .save-btn, .cancel-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid #ddd; background: #fff; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .action-btn:hover { background: #1C274C; color: #fff; }
        .save-btn { background: #1C274C; color: #FFC847; border: none; }
        .cancel-btn { background: #f8f9fa; border: 1px solid #eee; }
        .danger-zone { margin-top: 20px; border: 1px solid #ffebeb; border-radius: 16px; padding: 25px; }
        .danger-zone h3 { color: #ff4d4d; font-size: 14px; text-transform: uppercase; margin-bottom: 20px; }
        .danger-action-btn { padding: 10px 20px; background: #ff4d4d; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .empty-settings-state { text-align: center; padding: 60px 0; color: #aaa; }
        .empty-settings-state .big-icon { font-size: 48px; display: block; margin-bottom: 15px; }
        .logout-button { width: 100%; padding: 12px; border: 1px solid #eee; background: #fff; border-radius: 10px; color: #ff4d4d; font-weight: 700; cursor: pointer; }
        @keyframes pageFadeIn { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

// --- Main Profile Page Component ---
export default function ProfilePage({
  user: initialUser,
  posts = [],
  likedPosts = [],
  savedPosts = [],
  communities: initialCommunities = [],
}) {
  const { user: loggedInUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("Posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => { setUser(initialUser); }, [initialUser]);

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
    const handleScroll = () => { setShowSearch(window.scrollY > 200); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (activeTab === "Communities" && userId && fetchedCommunities.length === 0) {
      API.get(`/communities/user/${userId}`)
        .then((res) => setFetchedCommunities(res.data))
        .catch((err) => console.error("Error loading communities", err));
    }
    if (activeTab === "Articles" && userId) {
      API.get(`/articles/user/${userId}`)
        .then((res) => setFetchedArticles(Array.isArray(res.data) ? res.data : []))
        .catch((err) => console.error("Error loading articles", err));
    }
  }, [activeTab, userId, fetchedCommunities.length]);

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
    } catch (err) { alert("Error updating profile."); }
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

  // --- UPDATED: Functional Report ---
  const handleReport = async () => {
    const reason = window.prompt("Reason for reporting this profile:");
    if (!reason) return;
    try {
      await API.post("/reports", { targetId: userId, targetType: "USER", reason });
      alert(`Report submitted for @${user.username}. Thank you.`);
    } catch (err) {
      alert("Failed to submit report.");
    } finally { setMenuOpen(false); }
  };

  // --- NEW: Functional Block from Popup ---
  const handleBlockUser = async () => {
    if (window.confirm(`Block @${user.username}? They won't be able to see your posts or profile.`)) {
      try {
        await API.post(`/follow/block/${userId}`);
        alert("User blocked.");
        navigate("/"); 
      } catch (err) { alert("Failed to block user."); }
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
      {shareOpen && <SharePopup postId={user.id} onClose={() => setShareOpen(false)} />}
      
      {showSettings && (
        <SettingsPage 
          user={user} 
          onClose={() => setShowSettings(false)} 
          logout={logout}
          onUserUpdate={(updated) => setUser(updated)}
        />
      )}

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
              {showSearch ? (
                <div className="profile-search-container" style={{ display: "flex", alignItems: "center", backgroundColor: "#FCFCFC", border: "1px solid #ddd", borderRadius: "0.7rem", padding: "0.5rem 0.625rem", width: "250px" }}>
                  <input type="text" placeholder={`Search ${activeTab}...`} autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px" }} />
                </div>
              ) : (
                <>
                  {!isCurrentUser && (
                    <button className={`follow-btn ${isFollowing ? "following" : ""}`} onClick={handleFollowToggle}>
                      {!isFollowing && <img src={UserPlusIcon} alt="" width={20} />}
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                  {isCurrentUser && (
                    <button className="follow-btn" onClick={editMode ? handleSaveProfile : () => setEditMode(true)}>
                      {editMode ? "Save" : "Edit Profile"}
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
                          <>
                            <div onClick={handleBlockUser} style={{ color: "#FF4D4D" }}>Block User</div>
                            <div className="report-item" onClick={handleReport} style={{ color: "#FF4D4D" }}>Report Profile</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="divider second" />
        </div>

        <div className="tab-content" style={{ minHeight: "100vh", padding: "20px 0" }}>
          {activeTab === "Posts" && getFilteredData(posts).map((p, i) => renderPostByType(p, i))}
          {activeTab === "Communities" && getFilteredData(fetchedCommunities, "name").map((c) => (
            <CommunityCard key={c.id} community={{ id: c.id, communityIcon: getImageUrl(c.icon), communityName: c.name, bannerTitle: c.slogan || "", descriptionText: c.discription || "No description provided.", membersCountText: `${c.memberCount || 0} members`, imageUrl: getImageUrl(c.banner), keywords: c.interests || [] }} feedWidth={765} />
          ))}
          {activeTab === "Articles" && (
            <div className="articles-feed-container">
              {getFilteredData(fetchedArticles, "title").map((art) => <Post key={art.id} article={art} profileUser={user} />)}
            </div>
          )}
          {activeTab === "Liked Posts" && getFilteredData(likedPosts).map((p, i) => renderPostByType(p, i))}
          {activeTab === "Saved" && isCurrentUser && getFilteredData(savedPosts).map((p, i) => (
            <div key={p.id || i}>{renderPostByType(p, i)}</div>
          ))}
          {getFilteredData(activeTab === "Posts" ? posts : (activeTab === "Communities" ? fetchedCommunities : (activeTab === "Articles" ? fetchedArticles : likedPosts))).length === 0 && (
            <div className="empty-state">No {activeTab.toLowerCase()} found</div>
          )}
        </div>
      </div>
    </>
  );
}