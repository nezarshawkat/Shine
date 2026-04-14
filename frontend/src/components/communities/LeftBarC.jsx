import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import { AuthContext } from "../AuthProvider.jsx";
import { API_BASE_URL, buildMediaUrl } from "../../api";

const LeftBarC = ({ 
  searchText, 
  setSearchText, 
  onlySearch = false, 
  hideSearch = false, 
  showOnly = null 
}) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [trendingTopics, setTrendingTopics] = useState([]);

  // Helper to check if a specific section should be rendered
  const shouldShow = (section) => !showOnly || showOnly.includes(section);

  // 1. DYNAMIC TRENDING TOPICS
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics/trending-searches`);
        const data = await response.json();
        if (data.topSearches) setTrendingTopics(data.topSearches.slice(0, 10));
      } catch (err) {
        console.error("Failed to fetch trending topics:", err);
        setTrendingTopics(["Reform", "Education", "Elections", "Tech"]);
      }
    };
    fetchTrending();
  }, []);

  // 2. CONSOLIDATED COMMUNITIES DATA
  const adminComms = user?.ownedCommunities || [];
  const joinedComms = user?.memberships?.map(m => m.community) || [];
  
  const allUserCommunities = Array.from(
    new Map([...adminComms, ...joinedComms].map(item => [item.id, item])).values()
  );

  const handleTopicClick = (topic) => {
    setSearchText(searchText === topic ? "" : topic);
  };

  const getFullUrl = (path) => {
    return buildMediaUrl(path) || "https://via.placeholder.com/41";
  };

  /* ============================================================
     COMPONENT SECTIONS
  ============================================================ */

  // 🔍 Search & Trending Box
  const SearchSection = (
    <div style={{
      width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C",
      display: "flex", flexDirection: "column", padding: "1.25rem",
      boxSizing: "border-box", backgroundColor: "#FFFFFF",
    }}>
      <div style={{
        display: "flex", alignItems: "center", backgroundColor: "#FCFCFC",
        border: "0.2px solid black", borderRadius: "0.7rem", padding: "0.5rem 0.625rem",
        marginBottom: "1.1rem", width: "100%", boxSizing: "border-box",
      }}>
        {!searchText && <img src={magnifier} alt="search" style={{ width: "1.25rem", height: "1.25rem", marginRight: "0.4rem" }} />}
        <input
          type="text"
          placeholder="Search topics..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1, border: "none", outline: "none", backgroundColor: "transparent", fontSize: "0.9rem", color: "#1C274C", fontWeight: "300" }}
        />
        {searchText && <img src={closeIcon} alt="clear" onClick={() => setSearchText("")} style={{ width: "1rem", height: "1rem", cursor: "pointer", marginLeft: "0.4rem" }} />}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {trendingTopics.map((topic, index) => (
          <button
            key={index}
            onClick={() => handleTopicClick(topic)}
            style={{
              fontSize: "0.85rem", padding: "0.3rem 0.5rem", borderRadius: "0.6rem",
              border: searchText === topic ? "1px solid #1C274C" : "0.1px solid #CCC",
              backgroundColor: searchText === topic ? "#ECF2F6" : "transparent",
              color: "#1C274C",
              fontWeight: searchText === topic ? "600" : "300",
              cursor: "pointer",
            }}
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );

  // 🏠 Communities Table
  const CommunitiesSection = (
    <div style={{
      width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C",
      padding: "1.25rem", boxSizing: "border-box", backgroundColor: "#FFFFFF",
    }}>
      <div style={{ fontSize: "1.25rem", fontWeight: "500", color: "#1C274C", marginBottom: "1.15rem" }}>
        Communities
      </div>
      <div style={{ height: "0.5px", backgroundColor: "#1C274C", marginBottom: "1.15rem" }}></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        {allUserCommunities.length > 0 ? (
          allUserCommunities.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/community/${c.id}`)}
              style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: "11px" }}
            >
              <img 
                src={getFullUrl(c.communityIcon || c.icon)} 
                alt="" 
                style={{ 
                  width: "41px", height: "41px", borderRadius: "4px", 
                  objectFit: "cover", backgroundColor: "#CCCCCC" 
                }} 
              />
              <span style={{ fontSize: "1rem", color: "#1C274C", fontWeight: "400" }}>
                {c.communityName || c.name}
              </span>
            </div>
          ))
        ) : (
          <span style={{ color: "#777", fontSize: "0.9rem" }}>No communities yet.</span>
        )}
      </div>
    </div>
  );

  // ➕ Create Button
  const CreateButton = (
    <button
      onClick={() => navigate("/create-community")}
      style={{
        width: "100%", height: "57px", borderRadius: "1.4rem",
        backgroundColor: "#1C274C", border: "none", fontSize: "19px",
        fontWeight: 600, color: "#FFC847", cursor: "pointer",
      }}
    >
      Make a Community
    </button>
  );

  /* ============================================================
     RENDER LOGIC
  ============================================================ */

  if (onlySearch) return SearchSection;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Search/Trending logic: only show if not hidden AND (no showOnly filter OR trending is in filter) */}
      {!hideSearch && shouldShow("trending") && SearchSection}

      {/* Communities list logic */}
      {shouldShow("communitiesList") && CommunitiesSection}

      {/* Create button logic */}
      {shouldShow("makeButton") && CreateButton}

    </div>
  );
};

export default LeftBarC;
