import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
} from "react";
import { API_BASE_URL, BACKEND_URL } from "../../api";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { SearchContext } from "../../searchContext.jsx";
import { AuthContext } from "../AuthProvider.jsx"; 
import CommunitySidebar from "./CommunitySidebar";
import CommunitySettings from "./CommunitySettings"; 
import OpinionPost from "../posts/opinionPost.jsx";
import CritiquePost from "../posts/critiquePost.jsx";
import AnalysisPost from "../posts/analysisPost.jsx";
import PollPost from "../posts/pollPost.jsx";
import SkeletonPost from "../posts/SkeletonPost.jsx";

// Assets for mobile UI consistency
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import feather from "../../assets/feather.png";
import MenuIcon from "../../assets/Menu.svg";

import "/workspaces/Shine/frontend/src/styles/Communityprofile.css";

const API_URL = API_BASE_URL;
const ASSET_URL = BACKEND_URL;

export default function CommunityProfile() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const { token, userId } = useContext(AuthContext);
  const currentUserId = localStorage.getItem("userId");

  const [community, setCommunity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Overlay & Popup States
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [settingsTab, setSettingsTab] = useState("General");
  const [showPostPopup, setShowPostPopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);

  // Mobile Join/Trends States
  const [joining, setJoining] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [trends, setTrends] = useState({ viralKeywords: [], trendingHashtags: [] });

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [bannerFile, setBannerFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);

  const observer = useRef();
  const postPopupRef = useRef(null);
  const settingsPopupRef = useRef(null);

  const getFullUrl = (path, fallback) => {
    if (!path) return fallback;
    if (path.startsWith("blob:")) return path;
    return path.startsWith("http") ? path : `${ASSET_URL}${path}`;
  };

  const fetchCommunity = async () => {
    try {
      const res = await axios.get(`${API_URL}/communities/${communityId}`);
      setCommunity(res.data);
      setEditData({ ...res.data, description: res.data.discription });
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await axios.get(`${API_URL}/posts/trends`);
      setTrends(res.data);
    } catch (err) {
      console.error("Trends error");
    } finally {
      setLoadingTrends(false);
    }
  };

  useEffect(() => {
    setFeed([]);
    setPage(1);
    setHasMore(true);
    fetchCommunity();
    fetchTrends();
  }, [communityId]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!communityId) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/communities/${communityId}/posts`, {
          params: { page, limit: 10 },
        });
        const { posts, pagination } = res.data;
        if (posts.length === 0) {
          setHasMore(false);
        } else {
          setFeed((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const unique = posts.filter((p) => !existing.has(p.id));
            return [...prev, ...unique].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          });
          setHasMore(page < pagination.totalPages);
        }
      } catch (err) {
        console.error("Post Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [page, communityId]);

  const handleJoin = async () => {
    if (!userId || !token) { navigate("/login"); return; }
    try {
      setJoining(true);
      await axios.post(`${API_URL}/communities/${communityId}/join`, { userId }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      window.location.reload(); 
    } catch (err) { console.error(err); } finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this community?")) return;
    try {
      await axios.post(`${API_URL}/communities/${communityId}/leave`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("slogan", editData.slogan);
      formData.append("discription", editData.description);
      if (bannerFile) formData.append("banner", bannerFile);
      if (iconFile) formData.append("icon", iconFile);

      const res = await axios.put(`${API_URL}/communities/${communityId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCommunity(res.data);
      setIsEditing(false);
    } catch (err) {
      alert("Error saving community.");
    }
  };

  const roleData = useMemo(() => {
    if (!community || !currentUserId) return { isMember: false, isAdmin: false, isMainAdmin: false, isPending: false };
    const memberRecord = community.communityMembers?.find((m) => m.userId === currentUserId);
    const isPending = memberRecord?.status === "PENDING"; 
    return {
      isMember: !!memberRecord && !isPending,
      isPending: isPending,
      isAdmin: memberRecord?.role === "ADMIN" || memberRecord?.role === "MAIN_ADMIN",
      isMainAdmin: memberRecord?.role === "MAIN_ADMIN",
    };
  }, [community, currentUserId]);

  const lastPostRef = useCallback((node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage((prev) => prev + 1);
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const filteredFeed = useMemo(() => {
    if (!searchQuery) return feed;
    const query = searchQuery.toLowerCase();
    return feed.filter((p) => p.text?.toLowerCase().includes(query));
  }, [feed, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (postPopupRef.current && !postPopupRef.current.contains(e.target)) setShowPostPopup(false);
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(e.target)) setShowSettingsPopup(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > 260 && !isPinned) setIsPinned(true);
      if (y < 200 && isPinned) setIsPinned(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPinned]);

  if (!community) return <div style={{ padding: 100, textAlign: "center" }}>Loading...</div>;

  return (
    <div className="community-page">
      {/* Banner */}
      <div
        className="community-banner"
        style={{ backgroundImage: `url(${getFullUrl(isEditing ? editData.banner : community.banner, "/images/default-banner.jpg")})` }}
      >
        {isEditing && (
          <div className="banner-edit-overlay">
            <button className="change-img-btn" onClick={() => document.getElementById("bannerFile").click()}>Change Banner</button>
            <input type="file" id="bannerFile" hidden onChange={(e) => {
              const file = e.target.files[0];
              if (file) setEditData({ ...editData, banner: URL.createObjectURL(file) });
              setBannerFile(file);
            }} />
          </div>
        )}
        <div className="community-banner-members">
          {!isEditing ? (
            <>{community._count?.communityMembers || 0} members</>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="edit-save-btn" onClick={handleSave}>Save</button>
              <button className="edit-cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className={`community-profile-header ${isPinned ? "pinned" : ""}`}>
        <div style={{ position: "relative" }}>
          <img
            src={getFullUrl(isEditing ? editData.icon : community.icon, "/images/default-avatar.png")}
            className={`community-profile-image ${isPinned ? "small" : ""}`}
            alt="icon"
          />
          {isEditing && (
            <button className="change-icon-btn" onClick={() => document.getElementById("iconFile").click()}>Change</button>
          )}
          <input type="file" id="iconFile" hidden onChange={(e) => {
            const file = e.target.files[0];
            if (file) setEditData({ ...editData, icon: URL.createObjectURL(file) });
            setIconFile(file);
          }} />
        </div>

        <div className="community-name-slogan">
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <input className="edit-title-input" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
              <input className="edit-slogan-input" value={editData.slogan} onChange={(e) => setEditData({ ...editData, slogan: e.target.value })} />
            </div>
          ) : (
            <>
              <div className="community-name">{community.name}</div>
              {!isPinned && <div className="community-slogan">{community.slogan}</div>}
            </>
          )}
        </div>
      </div>

      <div className="community-container">
        <main className="community-center">
          
          {/* 1. DESCRIPTION (Now above buttons on mobile) */}
          <div className="community-description">
            {isEditing ? (
              <textarea 
                className="edit-desc-textarea" 
                value={editData.description} 
                onChange={(e) => setEditData({ ...editData, description: e.target.value })} 
              />
            ) : (
              community.discription
            )}
          </div>

          {/* 2. MOBILE-ONLY ACTION BUTTONS & SEARCH */}
          <div className="mobile-sidebar-replacement">
            {!roleData.isMember ? (
              <button 
                onClick={handleJoin} 
                disabled={joining || roleData.isPending} 
                className="mobile-join-btn"
                style={{ backgroundColor: roleData.isPending ? "#ccc" : "#1C274C", color: roleData.isPending ? "#666" : "#FFC847" }}
              >
                {joining ? "Processing..." : roleData.isPending ? "Request Pending" : "Join Community"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: "10px", width: "100%", marginBottom: "20px" }}>
                <div style={{ flex: 1, position: "relative" }} ref={postPopupRef}>
                  <button 
                    onClick={() => setShowPostPopup(!showPostPopup)} 
                    className="sidebar-post-btn-style"
                  >
                    <img src={feather} alt="" style={{ width: 18 }} />
                    <span style={{ fontSize: "17px", fontWeight: 600, color: "#FFC847" }}>Post</span>
                  </button>
                  {showPostPopup && (
                    <div className="popup-menu mobile-popup">
                      {["Opinion", "Analysis", "Critique", "Poll"].map((label, i) => (
                        <button key={i} className="side-menu-item" onClick={() => navigate(`/${label.toLowerCase()}-create`, { state: { preSelectCommunity: community.name } })}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: "relative" }} ref={settingsPopupRef}>
                  <button onClick={() => setShowSettingsPopup(!showSettingsPopup)} className="sidebar-menu-btn-style">
                    <img src={MenuIcon} alt="menu" style={{ width: 22 }} />
                  </button>
                  {showSettingsPopup && (
                    <div className="popup-menu settings-menu mobile-popup">
                      {roleData.isAdmin || roleData.isMainAdmin ? (
                        <>
                          <div className="side-menu-item" onClick={() => { setSettingsTab("Members"); setShowSettingsOverlay(true); setShowSettingsPopup(false); }}>Community Manager</div>
                          <div className="side-menu-item" onClick={() => { setSettingsTab("General"); setShowSettingsOverlay(true); setShowSettingsPopup(false); }}>Settings</div>
                        </>
                      ) : (
                        <>
                          <div className="side-menu-item" onClick={() => alert("Reported")}>Report</div>
                          <div className="side-menu-item delete" onClick={handleLeave}>Leave Group</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="sidebar-search-container mobile-search-group">
              <div className="search-bar-mini">
                {!searchQuery && <img src={magnifier} style={{ width: "1.25rem", marginRight: "0.4rem" }} alt="search" />}
                <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <img src={closeIcon} onClick={() => setSearchQuery("")} style={{ width: "1rem", cursor: "pointer" }} alt="clear" />}
              </div>
              <div className="trend-tags">
                {!loadingTrends ? trends.viralKeywords.map((topic, i) => (
                  <button key={i} onClick={() => setSearchQuery(searchQuery === topic ? "" : topic)} className={searchQuery === topic ? "active" : ""}>{topic}</button>
                )) : <span>Loading...</span>}
              </div>
            </div>
          </div>

          {/* 3. THE FEED */}
          <div className="community-feed-list">
            {filteredFeed.map((post, index) => {
              const Component = { opinion: OpinionPost, critique: CritiquePost, analysis: AnalysisPost, poll: PollPost }[post.type];
              return Component ? (
                <div key={post.id} ref={filteredFeed.length === index + 1 ? lastPostRef : null} style={{ marginBottom: "12px" }}>
                  <Component postId={post.id} initialData={post} />
                </div>
              ) : null;
            })}
            {loading && <SkeletonPost />}
          </div>
        </main>

        <div className="community-sidebar">
          <CommunitySidebar 
            isMember={roleData.isMember} 
            isPending={roleData.isPending}
            isAdmin={roleData.isAdmin} 
            isMainAdmin={roleData.isMainAdmin}
            setIsEditing={setIsEditing} 
            communityName={community.name}
            onOpenSettings={(tab) => {
              setSettingsTab(tab);
              setShowSettingsOverlay(true);
            }}
          />
        </div>
      </div>

      {showSettingsOverlay && (
        <CommunitySettings 
          community={community} 
          initialSection={settingsTab}
          onClose={() => setShowSettingsOverlay(false)}
          onUpdate={() => {
            fetchCommunity();
            setShowSettingsOverlay(false);
          }}
        />
      )}
      
      <style>{`
        .mobile-sidebar-replacement { display: none; }

        @media (max-width: 768px) {
          .mobile-sidebar-replacement { display: block; width: 100%; margin-bottom: 20px; }
          .community-sidebar { display: none; }
          .community-center { width: 100% !important; padding: 0 15px !important; }
        }

        .sidebar-post-btn-style { width: 100%; height: 57px; borderRadius: 1.4rem; background-color: #1c274c; border: none; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; border-radius: 1.4rem; }
        .sidebar-menu-btn-style { width: 57px; height: 57px; borderRadius: 1.4rem; background-color: #F0F2F5; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 1.4rem; }
        .mobile-join-btn { width: 100%; height: 61px; border-radius: 19px; font-weight: 600; cursor: pointer; border: none; margin-bottom: 20px; }

        .popup-menu { 
          position: absolute; top: 65px; left: 0; width: 100%; background: white; border-radius: 15px; 
          border: 1px solid rgba(28, 39, 76, 0.15); padding: 8px 0; z-index: 100; display: flex; 
          flex-direction: column; box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
        }
        .settings-menu { right: 0; left: auto; width: 190px; }
        .side-menu-item { padding: 12px 18px; cursor: pointer; font-size: 15px; color: #1c274c; font-weight: 500; width: 100%; text-align: left; border: none; background: none; }
        .side-menu-item:hover { background: #f1f3f5; }
        .side-menu-item.delete { color: #ff4d4f; border-top: 1px solid #eee; margin-top: 4px; padding-top: 12px; }

        .sidebar-search-container { width: 100%; border-radius: 1.4rem; border: 0.5px solid #1C274C; padding: 1.25rem; background: #FFF; }
        .search-bar-mini { display: flex; align-items: center; background: #FCFCFC; border: 0.2px solid black; border-radius: 0.7rem; padding: 0.5rem; }
        .search-bar-mini input { flex: 1; border: none; outline: none; background: transparent; padding-left: 5px; }
        .trend-tags { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .trend-tags button { font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 0.6rem; border: 1px solid #ccc; background: transparent; cursor: pointer; }
        .trend-tags button.active { background: #ECF2F6; border-color: #1C274C; }

        .community-description { padding: 15px 0; font-size: 15px; color: #333; line-height: 1.5; }
        .edit-save-btn { background: #1C274C; color: #FFC847; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .edit-cancel-btn { background: #eee; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; }
        .edit-title-input, .edit-slogan-input { border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 100%; }
        .edit-desc-textarea { width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-family: inherit; }
      `}</style>
    </div>
  );
}