import React, { useContext, useEffect, useState } from "react";
import { SearchContext } from "/workspaces/Shine/frontend/src/searchContext.jsx";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import axios from "axios";

const LeftSidebar = ({ onlySearch = false, hideSearch = false, showOnly = null }) => {
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const [trends, setTrends] = useState({ viralKeywords: [], trendingHashtags: [] });
  const [inbox, setInbox] = useState([]);
  const [systemNotif, setSystemNotif] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api";

  useEffect(() => {
    const fetchAllSidebarData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Trends
        const trendRes = await axios.get(`${API_BASE}/posts/trends`);
        setTrends(trendRes.data);

        // 2. Fetch Messenger Activity & Notifications
        const [inboxRes, notifRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/messenger/inbox`),
          axios.get(`${API_BASE}/notifications`)
        ]);

        if (inboxRes.status === "fulfilled") {
          setInbox(inboxRes.value.data.slice(0, 3));
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
  }, []);

  // Helper to check if a section should be visible based on the showOnly prop
  const shouldShow = (section) => !showOnly || showOnly.includes(section);

  // Logic for the Messenger unread status
  const unreadCount = inbox.filter(chat => chat.unread === true || chat.isRead === false).length;

  const handleTopicClick = (topic) => {
    setSearchQuery(searchQuery === topic ? "" : topic);
  };

  // Reusable Search Card Component
  const SearchCard = (
    <div className="forum-search-card" style={{ 
      width: "100%", borderRadius: "1.4rem", 
      border: "0.5px solid #1C274C", padding: "1.25rem", 
      backgroundColor: "#FFFFFF", display: "flex", flexDirection: "column", boxSizing: "border-box"
    }}>
      <div style={{ 
        display: "flex", alignItems: "center", backgroundColor: "#FCFCFC", 
        border: "0.2px solid black", borderRadius: "0.7rem", padding: "0.5rem 0.625rem", marginBottom: "1.1rem" 
      }}>
        {!searchQuery && <img src={magnifier} alt="search" style={{ width: "1.25rem", marginRight: "0.4rem" }} />}
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
          <img src={closeIcon} alt="clear" onClick={() => setSearchQuery("")} 
               style={{ width: "1rem", cursor: "pointer", marginLeft: "0.4rem" }} />
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

  // Return only the search component if explicitly requested
  if (onlySearch) return SearchCard;

  return (
    <div className="forum-left-sidebar" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Search Card Section */}
      {!hideSearch && shouldShow('search') && SearchCard}

      {/* Group 2: Trending Hashtags */}
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

      {/* Group 3: Messenger (Activity Group) */}
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
            
            {/* System Notification */}
            <div style={{ padding: "0.8rem", borderRadius: "0.8rem", backgroundColor: "#FFFBF2", border: "0.5px solid #FFE4A3" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: "800", color: "#FFC847", textTransform: "uppercase" }}>System</div>
              <div style={{ fontSize: "0.85rem", color: "#1C274C" }}>
                {systemNotif ? systemNotif.content : "No new notifications"}
              </div>
            </div>

            {/* New Messages Status */}
            <div style={{ padding: "0.8rem", borderRadius: "0.8rem", backgroundColor: "#E0F2FE", border: "0.5px solid #7DD3FC" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: "800", color: "#0284C7", textTransform: "uppercase" }}>Activity</div>
              <div style={{ fontSize: "0.85rem", color: "#1C274C" }}>
                {unreadCount > 0 ? `You have ${unreadCount} new messages` : "All caught up!"}
              </div>
            </div>

            {/* Mini Inbox List */}
            {!loading && inbox.length > 0 && inbox.map((chat, idx) => (
              <div 
                key={idx} 
                onClick={() => window.location.href = `/messenger/${chat._id}`}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0.4rem", cursor: "pointer" }}
              >
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#1C274C", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>
                  {chat.participantName?.charAt(0) || "U"}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1C274C" }}>{chat.participantName}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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