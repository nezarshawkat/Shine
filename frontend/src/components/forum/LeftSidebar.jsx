import React, { useContext, useEffect, useState, memo } from "react";
import { SearchContext } from "../../searchContext.jsx";
import { useNavigate } from "react-router-dom";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import axios from "axios";
import { API_BASE_URL } from "../../api";

// ✅ Memoized Search Section to prevent re-renders on every keystroke
const SearchSection = memo(({ 
  searchQuery, 
  setSearchQuery, 
  loading, 
  trends, 
  handleTopicClick 
}) => {
  return (
    <div className="forum-search-card" style={{ 
      width: "100%", borderRadius: "1.4rem", 
      border: "0.5px solid #1C274C", padding: "1.25rem", 
      backgroundColor: "#FFFFFF", display: "flex", flexDirection: "column", boxSizing: "border-box"
    }}>
      <div style={{ 
        display: "flex", alignItems: "center", backgroundColor: "#FCFCFC", 
        border: "0.2px solid black", borderRadius: "0.7rem", padding: "0.5rem 0.625rem", marginBottom: "1.1rem" 
      }}>
        <img
          src={magnifier}
          alt="search"
          style={{
            width: "1.25rem",
            marginRight: "0.4rem",
            visibility: searchQuery ? "hidden" : "visible",
          }}
        />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            flex: 1, border: "none", outline: "none", backgroundColor: "transparent", 
            fontSize: "0.9rem", color: "#1C274C", fontWeight: "300"
          }}
        />
        {searchQuery && (
          <img 
            src={closeIcon} 
            alt="clear" 
            onClick={() => setSearchQuery("")} 
            style={{ width: "1rem", cursor: "pointer", marginLeft: "0.4rem" }} 
          />
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignContent: "flex-start" }}>
        {!loading ? (
          trends.viralKeywords?.map((topic, index) => {
            const isSelected = searchQuery === topic;
            return (
              <button
                className={`search-keyword-chip ${isSelected ? "active" : ""}`}
                key={index}
                onClick={() => handleTopicClick(topic)}
                style={{ 
                  fontSize: "0.85rem", padding: "0.3rem 0.6rem", borderRadius: "0.6rem", 
                  border: isSelected ? "1px solid #1C274C" : "0.1px solid #CCC", 
                  backgroundColor: isSelected ? "#ECF2F6" : "transparent",
                  color: "#1C274C", fontWeight: isSelected ? "600" : "300",
                  cursor: "pointer", transition: "all 0.2s ease"
                }}
              >
                {topic}
              </button>
            );
          })
        ) : (
          <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Loading viral topics...</span>
        )}
      </div>
    </div>
  );
});

const LeftSidebar = ({ onlySearch = false, hideSearch = false, showOnly = null }) => {
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const navigate = useNavigate();
  const [trends, setTrends] = useState({ viralKeywords: [], trendingHashtags: [] });
  const [inbox, setInbox] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchAllSidebarData = async () => {
      setLoading(true);
      try {
        const headers = { headers: getAuthHeader() };
        const [trendRes, inboxRes, systemRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/posts/trends`, { params: { limit: 5 } }),
          axios.get(`${API_BASE_URL}/messenger/inbox`, headers),
          axios.get(`${API_BASE_URL}/messenger/system`, headers)
        ]);

        if (trendRes.status === "fulfilled") setTrends(trendRes.value.data);
        if (inboxRes.status === "fulfilled") setInbox(inboxRes.value.data);
        if (systemRes.status === "fulfilled") setSystemNotifications(systemRes.value.data);
      } catch (err) {
        console.error("Failed to fetch sidebar data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSidebarData();
  }, []);

  const normalizeKeyword = (value) => String(value || "").replace(/^#/, "");

  const handleTopicClick = (topic) => {
    const normalizedTopic = normalizeKeyword(topic);
    const normalizedCurrent = normalizeKeyword(searchQuery);
    setSearchQuery(normalizedCurrent === normalizedTopic ? "" : normalizedTopic);
  };

  const unreadMsgCount = inbox.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
  const unreadSysCount = systemNotifications.filter(n => !n.isRead).length;
  const totalAlerts = unreadMsgCount + unreadSysCount;

  const shouldShow = (section) => !showOnly || showOnly.includes(section);
  const sidebarHashtags = (trends.trendingHashtags?.length
    ? trends.trendingHashtags
    : (trends.viralKeywords || []).map((name) => ({ name, views: "—" }))).slice(0, 5);

  const searchEl = (
    <SearchSection 
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      loading={loading}
      trends={trends}
      handleTopicClick={handleTopicClick}
    />
  );

  if (onlySearch) return searchEl;

  return (
    <div className="forum-left-sidebar" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {!hideSearch && shouldShow('search') && searchEl}

      {/* Trending Section */}
      {shouldShow('trending') && (
        <div className="forum-trending-card" style={{ 
          width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C", 
          padding: "1.25rem", backgroundColor: "#FFFFFF", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.15rem" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: "500", color: "#1C274C" }}>Trending</span>
            <span
              onClick={() => navigate("/forum/trending")}
              style={{ fontSize: "1rem", fontWeight: "300", color: "#FFC847", cursor: "pointer" }}
            >
              View all
            </span>
          </div>
          <div style={{ height: "0.5px", backgroundColor: "#1C274C", marginBottom: "1.15rem", marginLeft: "-1.25rem", marginRight: "-1.25rem" }}></div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {!loading ? (
              sidebarHashtags.map((tag, index) => (
                <div 
                  key={index} 
                  onClick={() => handleTopicClick(tag.name)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <span>
                    <span style={{ fontWeight: "500", color: "#FFC847" }}>#{index + 1}. </span>
                    <span style={{ color: "#1C274C", fontWeight: "400" }}>{tag.name?.startsWith("#") ? tag.name : `#${tag.name}`}</span>
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "500", color: "#1C274C" }}>
                    {tag.views} {/* Now shows real count like "5" or "1.2K" */}
                  </span>
                </div>
              ))
            ) : <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Loading...</span>}
          </div>
        </div>
      )}

      {/* Messenger & Activity Section */}
      {shouldShow('messenger') && (
        <div className="forum-messages-card" style={{ 
          width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C", 
          padding: "1.25rem", backgroundColor: "#FFFFFF", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.15rem" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: "500", color: "#1C274C" }}>Messenger</span>
            {totalAlerts > 0 && (
              <span style={{ padding: "0.2rem 0.5rem", borderRadius: "999px", backgroundColor: "#FFE4A3", color: "#1C274C", fontSize: "0.75rem", fontWeight: "700" }}>
                {totalAlerts} new
              </span>
            )}
            <span onClick={() => window.location.href = "/messenger"} style={{ fontSize: "1rem", fontWeight: "300", color: "#FFC847", cursor: "pointer" }}>Open</span>
          </div>

          <div style={{ height: "0.5px", backgroundColor: "#1C274C", marginBottom: "1.15rem", marginLeft: "-1.25rem", marginRight: "-1.25rem" }}></div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div 
              onClick={() => window.location.href = "/messenger"}
              style={{ padding: "0.8rem", borderRadius: "0.8rem", cursor: "pointer", backgroundColor: unreadSysCount > 0 ? "#FFFBF2" : "#F9FAFB", border: unreadSysCount > 0 ? "0.5px solid #FFE4A3" : "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: "800", color: unreadSysCount > 0 ? "#FFC847" : "#9CA3AF", textTransform: "uppercase" }}>System</div>
              <div style={{ fontSize: "0.85rem", color: "#1C274C" }}>
                {unreadSysCount} new notification{unreadSysCount === 1 ? "" : "s"}
              </div>
            </div>

            <div 
              onClick={() => window.location.href = "/messenger"}
              style={{ padding: "0.8rem", borderRadius: "0.8rem", cursor: "pointer", backgroundColor: unreadMsgCount > 0 ? "#E0F2FE" : "#F9FAFB", border: unreadMsgCount > 0 ? "0.5px solid #7DD3FC" : "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: "800", color: unreadMsgCount > 0 ? "#0284C7" : "#9CA3AF", textTransform: "uppercase" }}>Activity</div>
              <div style={{ fontSize: "0.85rem", color: "#1C274C" }}>
                {unreadMsgCount} new message{unreadMsgCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
