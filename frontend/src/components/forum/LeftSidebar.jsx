import React, { useContext, useEffect, useState, memo } from "react";
import { SearchContext } from "/workspaces/Shine/frontend/src/searchContext.jsx";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import axios from "axios";
import { API_BASE_URL } from "../../api";

// ✅ 1. Moved OUTSIDE to prevent unmounting/focus loss
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
            // ✅ Fix: use visibility instead of conditional rendering to prevent layout shift
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
  const [trends, setTrends] = useState({ viralKeywords: [], trendingHashtags: [] });
  const [inbox, setInbox] = useState([]);
  const [systemNotif, setSystemNotif] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    const fetchAllSidebarData = async () => {
      setLoading(true);
      try {
        const trendRes = await axios.get(`${API_BASE}/posts/trends`);
        setTrends(trendRes.data);

        const [inboxRes, notifRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/messenger/inbox`),
          axios.get(`${API_BASE}/notifications`)
        ]);

        if (inboxRes.status === "fulfilled") {
          setInbox(inboxRes.value.data);
        }
        
        if (notifRes.status === "fulfilled" && notifRes.value.data.length > 0) {
          setSystemNotif(notifRes.value.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSidebarData();
  }, [API_BASE]);

  const shouldShow = (section) => !showOnly || showOnly.includes(section);
  
  const unreadCount = inbox.filter(chat => chat.unread === true).length;

  const handleTopicClick = (topic) => {
    setSearchQuery(searchQuery === topic ? "" : topic);
  };

  // ✅ 2. Reference the stable SearchSection component
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
            <span style={{ fontSize: "1rem", fontWeight: "300", color: "#FFC847", cursor: "pointer" }}>View all</span>
          </div>
          <div style={{ height: "0.5px", backgroundColor: "#1C274C", marginBottom: "1.15rem", marginLeft: "-1.25rem", marginRight: "-1.25rem" }}></div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {!loading ? (
              trends.trendingHashtags?.map((tag, index) => (
                <div 
                  key={index} 
                  onClick={() => setSearchQuery(`#${tag.name}`)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <span>
                    <span style={{ fontWeight: "500", color: "#FFC847" }}>#{index + 1}. </span>
                    <span style={{ color: "#1C274C", fontWeight: "400" }}>#{tag.name}</span>
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "500", color: "#1C274C" }}>{tag.views}</span>
                </div>
              ))
            ) : <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Loading trends...</span>}
          </div>
        </div>
      )}

      {/* Messenger & Activity Section */}
      {shouldShow('messenger') && (
        <div className="forum-messages-card" style={{ 
          width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C", 
          padding: "1.25rem", backgroundColor: "#FFFFFF", boxSizing: "border-box", marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.15rem" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: "500", color: "#1C274C" }}>Messenger</span>
            <span 
              onClick={() => window.location.href = "/messenger"}
              style={{ fontSize: "1rem", fontWeight: "300", color: "#FFC847", cursor: "pointer" }}
            >
              Open
            </span>
          </div>
          <div style={{ height: "0.5px", backgroundColor: "#1C274C", marginBottom: "1.15rem", marginLeft: "-1.25rem", marginRight: "-1.25rem" }}></div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ padding: "0.8rem", borderRadius: "0.8rem", backgroundColor: systemNotif && !systemNotif.isRead ? "#FFFBF2" : "#F9FAFB", border: systemNotif && !systemNotif.isRead ? "0.5px solid #FFE4A3" : "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: "800", color: systemNotif && !systemNotif.isRead ? "#FFC847" : "#9CA3AF", textTransform: "uppercase" }}>System</div>
              <div style={{ fontSize: "0.85rem", color: "#1C274C" }}>
                {systemNotif ? systemNotif.content : "No new notifications"}
              </div>
            </div>

            <div style={{ padding: "0.8rem", borderRadius: "0.8rem", backgroundColor: unreadCount > 0 ? "#E0F2FE" : "#F9FAFB", border: unreadCount > 0 ? "0.5px solid #7DD3FC" : "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: "800", color: unreadCount > 0 ? "#0284C7" : "#9CA3AF", textTransform: "uppercase" }}>Activity</div>
              <div style={{ fontSize: "0.85rem", color: "#1C274C" }}>
                {unreadCount > 0 ? `You have ${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : "All caught up!"}
              </div>
            </div>

            {!loading && inbox.length > 0 && inbox.map((chat, idx) => (
              <div 
                key={idx} 
                onClick={() => window.location.href = `/messenger/${chat._id}`}
                style={{ 
                  display: "flex", alignItems: "center", gap: "10px", padding: "0.4rem", 
                  cursor: "pointer", borderRadius: "0.5rem",
                  backgroundColor: chat.unread ? "#F0F9FF" : "transparent"
                }}
              >
                <div style={{ 
                  width: "32px", height: "32px", borderRadius: "50%", 
                  backgroundColor: chat.unread ? "#0284C7" : "#1C274C", 
                  color: "white", display: "flex", alignItems: "center", 
                  justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold" 
                }}>
                  {chat.participantName?.charAt(0) || "U"}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: chat.unread ? "700" : "600", color: "#1C274C" }}>
                    {chat.participantName}
                    {chat.unread && <span style={{ marginLeft: "5px", color: "#0284C7" }}>●</span>}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: chat.unread ? "#1C274C" : "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {chat.lastMessage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;