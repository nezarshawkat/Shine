import React, { useContext, useEffect, useState, useRef } from "react";
import { SearchContext } from "../../searchContext.jsx";
import { AuthContext } from "../AuthProvider.jsx";
import { useParams, useNavigate } from "react-router-dom";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import feather from "../../assets/feather.png";
import MenuIcon from "../../assets/Menu.svg";
import axios from "axios";
import { API_BASE_URL, BACKEND_URL } from "../../api";
import ReportModal from "../reporting/ReportModal";
import { submitReport } from "../reporting/reportUtils";


const CommunitySidebar = ({ 
  isMember, 
  isPending, 
  isAdmin, 
  isMainAdmin, 
  communityName, 
  onOpenSettings,
  isPrivate
}) => {
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const { user, token, userId } = useContext(AuthContext);
  const { communityId } = useParams();
  const navigate = useNavigate();
  
  const postPopupRef = useRef(null);
  const settingsPopupRef = useRef(null);

  const [joining, setJoining] = useState(false);
  const [showPostPopup, setShowPostPopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [trends, setTrends] = useState({ viralKeywords: [], trendingHashtags: [] });

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/posts/trends`);
        setTrends(res.data);
      } catch (err) {
        console.error("Trends error");
      } finally {
        setLoadingTrends(false);
      }
    };
    fetchTrends();
  }, []);

  const handleJoin = async () => {
    if (!userId || !token) { navigate("/login"); return; }
    try {
      setJoining(true);
      await axios.post(`${BACKEND_URL}/api/communities/${communityId}/join`, { userId }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      window.location.reload(); 
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this community?")) return;
    try {
      await axios.post(`${BACKEND_URL}/api/communities/${communityId}/leave`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const submitCommunityReport = async (reason) => {
    try {
      await submitReport(token, { type: "COMMUNITY", targetId: communityId, reason });
      setShowReportModal(false);
      setShowSettingsPopup(false);
      alert("Report submitted");
    } catch (error) {
      alert("Failed to submit report");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (postPopupRef.current && !postPopupRef.current.contains(e.target)) setShowPostPopup(false);
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(e.target)) setShowSettingsPopup(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {!isMember ? (
        <button 
          onClick={handleJoin} 
          disabled={joining || isPending} 
          style={{ 
            width: "100%", height: "61px", 
            backgroundColor: isPending ? "#ccc" : "#1C274C", 
            color: isPending ? "#666" : "#FFC847", 
            borderRadius: "19px", fontWeight: "600", 
            cursor: isPending ? "default" : "pointer", border: "none" 
          }}
        >
          {joining ? "Processing..." : isPending ? "Request Pending" : isPrivate ? "Request to Join" : "Join Community"}
        </button>
      ) : (
        /* BUTTONS SIDE BY SIDE (RESTORED ORIGINAL LAYOUT) */
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <div style={{ flex: 1, position: "relative" }} ref={postPopupRef}>
            <button 
              onClick={() => setShowPostPopup(!showPostPopup)} 
              style={{ width: "100%", height: "57px", borderRadius: "1.4rem", backgroundColor: "#1c274c", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer" }}
            >
              <img src={feather} alt="" style={{ width: 18 }} />
              <span style={{ fontSize: "17px", fontWeight: 600, color: "#FFC847" }}>Post</span>
            </button>

            {showPostPopup && (
              <div className="popup-menu">
                {["Opinion", "Analysis", "Critique", "Poll"].map((label, i) => (
                  <button key={i} className="side-menu-item" onClick={() => navigate(`/${label.toLowerCase()}-create`, { state: { preSelectCommunity: communityName } })}>{label}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }} ref={settingsPopupRef}>
            <button 
              onClick={() => setShowSettingsPopup(!showSettingsPopup)} 
              style={{ width: "57px", height: "57px", borderRadius: "1.4rem", backgroundColor: "#F0F2F5", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <img src={MenuIcon} alt="menu" style={{ width: 22 }} />
            </button>

            {showSettingsPopup && (
              <div className="popup-menu settings-menu">
                {isAdmin || isMainAdmin ? (
                  <>
                    <div className="side-menu-item" onClick={() => { onOpenSettings("Members"); setShowSettingsPopup(false); }}>
                        Community Manager
                    </div>
                    <div className="side-menu-item" onClick={() => { onOpenSettings("General"); setShowSettingsPopup(false); }}>
                        Community Settings
                    </div>
                  </>
                ) : (
                  <>
                    <div className="side-menu-item" onClick={() => setShowReportModal(true)}>Report</div>
                    <div className="side-menu-item delete" onClick={handleLeave}>Leave Group</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEARCH & TRENDS SECTION */}
      <div className="sidebar-search-container">
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

      <ReportModal
        title="Report Community"
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSelect={submitCommunityReport}
      />
      <style>{`
        .popup-menu { 
          position: absolute; 
          top: 65px; 
          left: 0;
          width: 100%; 
          background: white; 
          border-radius: 15px; 
          border: 1px solid rgba(28, 39, 76, 0.15); 
          padding: 8px 0; 
          z-index: 100; 
          display: flex; 
          flex-direction: column; 
          box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
        }
        .settings-menu { 
          right: 0;
          left: auto;
          width: 190px; 
        }
        .side-menu-item { 
          padding: 12px 18px; 
          cursor: pointer; 
          font-size: 15px; 
          color: #1c274c; 
          font-weight: 500; 
          width: 100%; 
          text-align: left; 
          border: none;
          background: none;
          transition: background 0.1s ease;
        }
        .side-menu-item:hover { 
          background: #f1f3f5; 
        }
        .side-menu-item.delete { 
          color: #ff4d4f; 
          border-top: 1px solid #eee; 
          margin-top: 4px;
          padding-top: 12px;
        }
        .sidebar-search-container { width: 100%; border-radius: 1.4rem; border: 0.5px solid #1C274C; padding: 1.25rem; background: #FFF; }
        .search-bar-mini { display: flex; align-items: center; background: #FCFCFC; border: 0.2px solid black; border-radius: 0.7rem; padding: 0.5rem; }
        .search-bar-mini input { flex: 1; border: none; outline: none; background: transparent; }
        .trend-tags { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .trend-tags button { font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 0.6rem; border: 1px solid #ccc; background: transparent; cursor: pointer; }
        .trend-tags button.active { background: #ECF2F6; border-color: #1C274C; }
      `}</style>
    </div>
  );
};

export default CommunitySidebar;
