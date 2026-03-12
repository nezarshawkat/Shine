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


export default function ProfilePage({
  user,
  posts = [],
  likedPosts = [],
  savedPosts = [],
  communities: initialCommunities = [],
}) {
  const { user: loggedInUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("Posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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
      setShowSearch(window.scrollY > 200);
    };
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

      setEditMode(false);
      if (user.username !== returnedUser.username) {
        window.location.href = `/profile/${returnedUser.username}`;
      } else {
        setImagePreview(getImageUrl(returnedUser.image));
      }
    } catch (err) {
      console.error("Update error", err);
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

  const handleReport = () => {
    alert(`Report submitted for @${user.username}. Our team will review this profile.`);
    setMenuOpen(false);
    // Logic for API call to /report/user/${userId} goes here
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
                            <div onClick={() => navigate(`/${user.username}/settings`)}>Settings</div>
                            <div className="logout-item" onClick={() => { logout(); navigate("/"); }}>Logout</div>
                          </>
                        ) : (
                          <div className="report-item" onClick={handleReport} style={{ color: "#FF4D4D" }}>Report Profile</div>
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
            <div key={p.id || i} style={{ cursor: location.state?.from === "critique" ? "pointer" : "default" }}>{renderPostByType(p, i)}</div>
          ))}
          {getFilteredData(activeTab === "Posts" ? posts : (activeTab === "Communities" ? fetchedCommunities : (activeTab === "Articles" ? fetchedArticles : likedPosts))).length === 0 && (
            <div className="empty-state">No {activeTab.toLowerCase()} found</div>
          )}
        </div>
      </div>
    </>
  );
}