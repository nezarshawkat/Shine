import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api.js";
import Header from "./Header.jsx";
import "../styles/FollowPages.css";
import "../styles/ProfilePage.css";

export default function TrendingHashtagsPage() {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTrendingHashtags = async () => {
      setLoading(true);
      try {
        const response = await API.get("/posts/trends", { params: { limit: 20 } });
        if (isMounted) {
          setHashtags(Array.isArray(response.data?.trendingHashtags) ? response.data.trendingHashtags : []);
        }
      } catch (error) {
        console.error("Failed to fetch weekly trending hashtags:", error);
        if (isMounted) setHashtags([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrendingHashtags();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredHashtags = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return hashtags;

    return hashtags.filter((hashtag) => hashtag.name?.toLowerCase().includes(normalizedQuery));
  }, [hashtags, searchQuery]);

  return (
    <>
      <Header />

      <div className="follow-page">
        <div
          className="follow-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <div style={{ marginRight: "auto" }}>
            <h2 style={{ margin: 0 }}>Weekly Trending Hashtags</h2>
            <p style={{ margin: "6px 0 0", color: "#5B647C", fontSize: "14px" }}>
              Top 20 hashtags with the highest activity this week.
            </p>
          </div>

          <div
            className="profile-search-container"
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#FCFCFC",
              border: "1px solid #ddd",
              borderRadius: "0.7rem",
              padding: "0.5rem 0.625rem",
              width: "250px",
            }}
          >
            <input
              type="text"
              placeholder="Search hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="follow-empty">Loading trending hashtags...</div>
        ) : filteredHashtags.length === 0 ? (
          <div className="follow-empty">
            {searchQuery ? "No matching hashtags found" : "No trending hashtags available this week"}
          </div>
        ) : (
          <div className="follow-list">
            {filteredHashtags.map((tag, index) => (
              <div
                key={tag.name}
                className="follow-card"
                onClick={() => navigate(`/forum?search=${encodeURIComponent(`#${tag.name}`)}`)}
                style={{ 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center", // Vertically centers all children in the row
                  gap: "16px" 
                }}
              >
                {/* Rank Number Circle */}
                <div
                  style={{
                    width: "56px",
                    minWidth: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#FFF6E0",
                    color: "#FFC847",
                    fontSize: "18px",
                    fontWeight: 800,
                  }}
                >
                  #{index + 1}
                </div>

                {/* Hashtag Info - Centered vertically with the number */}
                <div className="follow-info" style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="follow-name" style={{ margin: 0, lineHeight: "1.2" }}>#{tag.name}</div>
                  <div className="follow-username" style={{ margin: 0, lineHeight: "1.2" }}>Weekly views: {tag.views}</div>
                </div>

                {/* Search Button */}
                <button
                  className="follow-action"
                  style={{ 
                    backgroundColor: "#1C274C", 
                    color: "#FFC847", 
                    minWidth: "100px",
                    height: "fit-content" 
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/forum?search=${encodeURIComponent(`#${tag.name}`)}`);
                  }}
                >
                  Search
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}