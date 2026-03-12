import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "/workspaces/Shine/frontend/src/api.js";
import profileDefault from "../assets/profileDefault.svg";
import Header from "./Header.jsx";
import "../styles/FollowPages.css"; 
import "../styles/ProfilePage.css";

export default function FollowingPage() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    API.get(`/users/${username}/following`)
      .then((res) => {
        // Ensure we handle the data as an array
        setFollowing(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Following fetching error:", err);
        setLoading(false);
      });
  }, [username]);

  /* SEARCH FILTER */
  const filteredFollowing = following.filter((user) => {
    if (!user) return false;
    const name = user.name || "";
    const uname = user.username || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uname.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
          }}
        >
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <h2 style={{ marginRight: "auto" }}>
            @{username} Following
          </h2>

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
              placeholder="Search following..."
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
          <div className="follow-empty">Loading following list...</div>
        ) : filteredFollowing.length === 0 ? (
          <div className="follow-empty">
            {searchQuery ? "No matching users found" : "Not following anyone yet"}
          </div>
        ) : (
          <div className="follow-list">
            {filteredFollowing.map((user) => (
              <div
                key={user.id}
                className="follow-card"
                onClick={() => navigate(`/profile/${user.username}`)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={user.image || profileDefault}
                  alt={user.username}
                  className="follow-avatar"
                  onError={(e) => { e.target.src = profileDefault; }}
                />

                <div className="follow-info">
                  <div className="follow-name">
                    {user.name || user.username}
                  </div>
                  <div className="follow-username">
                    @{user.username}
                  </div>
                </div>

                <button
                  className="follow-action"
                  style={{ backgroundColor: "#eee", color: "#333" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Following
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}