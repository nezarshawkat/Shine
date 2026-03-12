import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { SearchContext } from "../../searchContext.jsx";
import CommunitySidebar from "./CommunitySidebar";
import CommunitySettings from "./CommunitySettings"; // Imported the settings component
import OpinionPost from "../posts/opinionPost.jsx";
import CritiquePost from "../posts/critiquePost.jsx";
import AnalysisPost from "../posts/analysisPost.jsx";
import PollPost from "../posts/pollPost.jsx";
import SkeletonPost from "../posts/SkeletonPost.jsx";
import "/workspaces/Shine/frontend/src/styles/Communityprofile.css";

const API_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api";
const ASSET_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev";

export default function CommunityProfile() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { searchQuery } = useContext(SearchContext);
  const currentUserId = localStorage.getItem("userId");

  const [community, setCommunity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Overlay States
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [settingsTab, setSettingsTab] = useState("General");

  // Edit States (Legacy Inline Editing)
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [bannerFile, setBannerFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);

  const observer = useRef();

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

  useEffect(() => {
    setFeed([]);
    setPage(1);
    setHasMore(true);
    fetchCommunity();
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

  // Roles Calculation
  const roleData = useMemo(() => {
    if (!community || !currentUserId) return { isMember: false, isAdmin: false, isMainAdmin: false };
    const memberRecord = community.communityMembers?.find((m) => m.userId === currentUserId);
    return {
      isMember: !!memberRecord,
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
          {filteredFeed.map((post, index) => {
            const Component = { opinion: OpinionPost, critique: CritiquePost, analysis: AnalysisPost, poll: PollPost }[post.type];
            return Component ? (
              <div key={post.id} ref={filteredFeed.length === index + 1 ? lastPostRef : null} style={{ marginBottom: "12px" }}>
                <Component postId={post.id} initialData={post} />
              </div>
            ) : null;
          })}
          {loading && <SkeletonPost />}
        </main>

        <div className="community-sidebar">
          <CommunitySidebar 
            isMember={roleData.isMember} 
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

      {/* Settings Overlay Layer */}
      {showSettingsOverlay && (
        <CommunitySettings 
          community={community} 
          initialSection={settingsTab}
          onClose={() => setShowSettingsOverlay(false)}
          onUpdate={() => {
            fetchCommunity(); // Refresh community data
            setShowSettingsOverlay(false);
          }}
        />
      )}
      
      <style>{`
        .community-description { padding: 20px 0; font-size: 15px; color: #333; line-height: 1.5; }
        .banner-edit-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
        .change-img-btn { background: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: 600; }
        .edit-save-btn { background: #1C274C; color: #FFC847; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .edit-cancel-btn { background: #eee; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; }
        .change-icon-btn { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); background: #1C274C; color: white; border: none; padding: 2px 8px; font-size: 10px; border-radius: 4px; }
        .edit-title-input, .edit-slogan-input { border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 100%; }
        .edit-desc-textarea { width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-family: inherit; }
      `}</style>
    </div>
  );
}