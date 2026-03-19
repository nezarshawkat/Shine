import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api.js";
import profileDefault from "../assets/profileDefault.svg";
import Header from "./Header.jsx";
import "../styles/FollowPages.css";
import "../styles/ProfilePage.css";

export default function FollowersPage() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Ensure the path matches the backend mount: /api/users/:username/followers
    // Since your API.js likely has /api as baseURL, we use /users/...
    setLoading(true);
    API.get(`/users/${username}/followers`)
      .then((res) => {
        // Ensure we are setting an array even if the response is weird
        setFollowers(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Followers fetching error:", err);
        setLoading(false);
      });
  }, [username]);

  /* SEARCH FILTER */
  const filteredFollowers = followers.filter((user) => {
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
            onClick={() => navigate(-1)} // Takes you back to the previous page
          >
            ← Back
          </button>

          <h2 style={{ marginRight: "auto" }}>
            @{username}'s Followers
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
              placeholder="Search followers..."
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
          <div className="follow-empty">Loading followers...</div>
        ) : filteredFollowers.length === 0 ? (
          <div className="follow-empty">
            {searchQuery ? "No matching followers found" : "No followers yet"}
          </div>
        ) : (
          <div className="follow-list">
            {filteredFollowers.map((follower) => (
              <div
                key={follower.id}
                className="follow-card"
                onClick={() => navigate(`/profile/${follower.username}`)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={follower.image || profileDefault}
                  alt={follower.username}
                  className="follow-avatar"
                  onError={(e) => { e.target.src = profileDefault; }}
                />

                <div className="follow-info">
                  <div className="follow-name">
                    {follower.name || follower.username}
                  </div>
                  <div className="follow-username">
                    @{follower.username}
                  </div>
                </div>

                <button
                  className="follow-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Optional: add follow/unfollow logic here later
                  }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}