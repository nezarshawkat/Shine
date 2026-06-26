// src/components/ProfilePageWrapper.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import API from "../api.js"; // your axios instance
import ProfilePage from "./ProfilePage.jsx";
import { AuthContext } from "./AuthProvider.jsx";

export default function ProfilePageWrapper() {
  const { username } = useParams();
  const { user: loggedUser } = useContext(AuthContext);

  // If no username in URL, use the logged-in user's username
  const profileUsername = username || loggedUser?.username;

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [communities, setCommunities] = useState([]);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileUsername) return;

    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1️⃣ Fetch user by username
        console.log("Fetching user:", profileUsername);
        const userRes = await API.get(`/users/${profileUsername}`);
        const userData = userRes.data;
        setUser(userData);

        const userId = userData.id; // Prisma uses `id`

        // 2️⃣ Fetch user posts
        try {
          const postsRes = await API.get(`/users/${userId}/posts`);
          setPosts(postsRes.data || []);
        } catch (err) {
          console.warn("Failed to fetch user posts:", err.message);
          setPosts([]);
        }

        // 3️⃣ Fetch liked posts
        try {
          const likedRes = await API.get(`/users/${userId}/liked`);
          setLikedPosts(likedRes.data || []);
        } catch (err) {
          console.warn("Failed to fetch liked posts:", err.message);
          setLikedPosts([]);
        }

        // 4️⃣ Fetch saved posts
        try {
          const savedRes = await API.get(`/users/${userId}/saved`);
          setSavedPosts(savedRes.data || []);
        } catch (err) {
          console.warn("Failed to fetch saved posts:", err.message);
          setSavedPosts([]);
        }

        // 5️⃣ Fetch user communities
        try {
          const communitiesRes = await API.get(`/users/${userId}/communities`);
          setCommunities(communitiesRes.data || []);
        } catch (err) {
          console.warn("Failed to fetch communities:", err.message);
          setCommunities([]);
        }

      } catch (err) {
        console.error("Profile fetch failed:", err);
        setError("Failed to fetch profile. User may not exist.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [profileUsername]);

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!user) return <div>User not found</div>;

  const isOwner = loggedUser && loggedUser.username === user.username;

  return (
    <ProfilePage
      user={user}
      posts={posts}
      likedPosts={likedPosts}
      savedPosts={savedPosts}
      communities={communities}
      isOwner={isOwner}
    />
  );
}
