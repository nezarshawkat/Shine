import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchContext } from "/workspaces/Shine/frontend/src/searchContext.jsx";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";
import magnifier from "../../assets/magnifier.svg";
import closeIcon from "../../assets/close.svg";
import axios from "axios";
import { API_BASE_URL, BACKEND_URL } from "../../api";


const RightSideBarA = () => {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const { user } = useContext(AuthContext);

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchText, setSearchText] = useState(searchQuery || "");

  const [trends, setTrends] = useState({
    viralKeywords: [],
    trendingHashtags: [],
  });

  const [loading, setLoading] = useState(true);

  // Matches 'isAuthorized' from your Prisma schema
  const hasPostingAccess = user && user.isAuthorized;

  /* =====================================================
      FETCH REAL TREND DATA FROM BACKEND
  ===================================================== */
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

  /* =====================================================
      SEARCH HANDLING
  ===================================================== */
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

  const handleTrendingClick = (name) => {
    const formattedTag = `#${name}`;
    setSearchText(formattedTag);
    setSearchQuery(formattedTag);
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* =====================================================
           SEARCH + TOPICS
      ===================================================== */}
      <div
        style={{
          width: "100%",
          borderRadius: "1.4rem",
          border: "0.5px solid #1C274C",
          padding: "1.25rem",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#FCFCFC",
            border: "0.2px solid black",
            borderRadius: "0.7rem",
            padding: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {!searchText && (
            <img
              src={magnifier}
              alt="search"
              style={{ width: "20px", marginRight: "8px" }}
            />
          )}

          <input
            type="text"
            placeholder="Search articles..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "14px",
            }}
          />

          {searchText && (
            <img
              src={closeIcon}
              alt="clear"
              onClick={clearSearch}
              style={{ width: "14px", cursor: "pointer" }}
            />
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {!loading ? (
            trends.viralKeywords.map((topic, index) => {
              const isActive = selectedTopic === topic;
              return (
                <button
                  key={index}
                  onClick={() => handleTopicClick(topic)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "10px",
                    border: isActive ? "1px solid #1C274C" : "1px solid #ccc",
                    background: isActive ? "#ECF2F6" : "transparent",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: isActive ? "600" : "300",
                  }}
                >
                  {topic}
                </button>
              );
            })
          ) : (
            <span>Loading trends...</span>
          )}
        </div>
      </div>

      {/* =====================================================
           TRENDING HASHTAGS
      ===================================================== */}
      <div
        style={{
          width: "100%",
          borderRadius: "1.4rem",
          border: "0.5px solid #1C274C",
          padding: "1.25rem",
          backgroundColor: "#FFFFFF",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}
        >
          Trending
        </div>

        <div
          style={{
            height: "1px",
            background: "#1C274C",
            marginBottom: "15px",
          }}
        />

        {loading ? (
          <span>Loading...</span>
        ) : (
          trends.trendingHashtags.map((tag, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                cursor: "pointer",
              }}
              onClick={() => handleTrendingClick(tag.name)}
            >
              <span>
                <span style={{ fontWeight: "600", color: "#FFC847" }}>
                  #{index + 1}.
                </span>{" "}
                #{tag.name}
              </span>
              <span style={{ fontSize: "13px", fontWeight: "500" }}>
                {tag.views}
              </span>
            </div>
          ))
        )}
      </div>

      {/* =====================================================
           ACTION BUTTON (Apply vs Post)
      ===================================================== */}
      <div style={{ width: "100%", boxSizing: "border-box" }}>
        <button
          onClick={() =>
            navigate(hasPostingAccess ? "/create-article" : "/article-apply")
          }
          style={{
            width: "100%",
            height: "57px",
            borderRadius: "1.4rem",
            backgroundColor: "#FFC847",
            color: "#1C274C",
            border: "0px solid #1C274C", // Added border to match group boxes
            fontSize: "18px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {hasPostingAccess ? "Post an article" : "Apply for posting"}
        </button>
      </div>
    </div>
  );
};

export default RightSideBarA;