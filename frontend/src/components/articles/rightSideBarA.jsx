import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchContext } from "/workspaces/Shine/frontend/src/searchContext.jsx";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import axios from "axios";
import { BACKEND_URL } from "../../api";

/* =====================================================
    1. TREND SEARCH (Search Input + Keyword Bubbles)
===================================================== */
export const TrendSearch = ({ trends, loading }) => {
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchText, setSearchText] = useState(searchQuery || "");

  const handleSearchChange = (value) => {
    setSearchText(value);
    setSearchQuery(value);
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchQuery("");
    setSelectedTopic(null);
  };

  const handleTopicClick = (topic) => {
    const newValue = selectedTopic === topic ? "" : topic;
    setSelectedTopic(newValue);
    setSearchText(newValue);
    setSearchQuery(newValue);
  };

  return (
    <div style={{
      width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C",
      padding: "1.25rem", backgroundColor: "#FFFFFF", display: "flex",
      flexDirection: "column", boxSizing: "border-box"
    }}>
      <div style={{
        display: "flex", alignItems: "center", backgroundColor: "#FCFCFC",
        border: "0.2px solid black", borderRadius: "0.7rem", padding: "0.5rem", marginBottom: "1rem"
      }}>
        {!searchText && <img src={magnifier} alt="search" style={{ width: "20px", marginRight: "8px" }} />}
        <input
          type="text" placeholder="Search articles..." value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "14px" }}
        />
        {searchText && <img src={closeIcon} alt="clear" onClick={clearSearch} style={{ width: "14px", cursor: "pointer" }} />}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {!loading ? (
          trends.viralKeywords.map((topic, index) => (
            <button
              key={index} onClick={() => handleTopicClick(topic)}
              style={{
                padding: "5px 10px", borderRadius: "10px", fontSize: "13px", cursor: "pointer",
                border: selectedTopic === topic ? "1px solid #1C274C" : "1px solid #ccc",
                background: selectedTopic === topic ? "#ECF2F6" : "transparent",
                fontWeight: selectedTopic === topic ? "600" : "300",
              }}
            >
              {topic}
            </button>
          ))
        ) : <span>Loading trends...</span>}
      </div>
    </div>
  );
};

/* =====================================================
    2. TREND LIST (Hashtag Ranking)
===================================================== */
export const TrendList = ({ trends, loading }) => {
  const { setSearchQuery } = useContext(SearchContext);
  
  const handleTrendingClick = (name) => {
    setSearchQuery(`#${name}`);
  };

  return (
    <div style={{
      width: "100%", borderRadius: "1.4rem", border: "0.5px solid #1C274C",
      padding: "1.25rem", backgroundColor: "#FFFFFF", boxSizing: "border-box"
    }}>
      <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>Trending</div>
      <div style={{ height: "1px", background: "#1C274C", marginBottom: "15px" }} />
      {loading ? <span>Loading...</span> : (
        trends.trendingHashtags.map((tag, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", cursor: "pointer" }}
               onClick={() => handleTrendingClick(tag.name)}>
            <span>
              <span style={{ fontWeight: "600", color: "#FFC847" }}>#{index + 1}.</span> #{tag.name}
            </span>
            <span style={{ fontSize: "13px", fontWeight: "500" }}>{tag.views}</span>
          </div>
        ))
      )}
    </div>
  );
};

/* =====================================================
    3. POST ACTION BUTTON
===================================================== */
export const PostActionButton = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const hasPostingAccess = user && user.isAuthorized;

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <button
        onClick={() => navigate(hasPostingAccess ? "/create-article" : "/article-apply")}
        style={{
          width: "100%", height: "57px", borderRadius: "1.4rem", backgroundColor: "#FFC847",
          color: "#1C274C", border: "none", fontSize: "18px", fontWeight: "600", cursor: "pointer"
        }}
      >
        {hasPostingAccess ? "Post an article" : "Apply for posting"}
      </button>
    </div>
  );
};

/* =====================================================
    MAIN RIGHT SIDEBAR (Desktop Combined View)
===================================================== */
const RightSideBarA = () => {
  const [trends, setTrends] = useState({ viralKeywords: [], trendingHashtags: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/posts/trends`);
        setTrends(res.data);
      } catch (err) { 
        console.error("Failed to fetch trends", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchTrends();
  }, []);

  return (
    <div className="sidebar-container" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Box 1: Search and Topics */}
      <div className="sidebar-box search-section">
        <TrendSearch trends={trends} loading={loading} />
      </div>

      {/* Box 2: Trending Hashtags */}
      <div className="sidebar-box trending-section">
        <TrendList trends={trends} loading={loading} />
      </div>

      {/* Box 3: Action Button */}
      <div className="sidebar-box action-section">
        <PostActionButton />
      </div>

    </div>
  );
};

export default RightSideBarA;