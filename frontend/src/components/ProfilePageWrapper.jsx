import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api.js";
import ProfilePage from "./ProfilePage.jsx";
import { AuthContext } from "./AuthProvider.jsx";

export default function ProfilePageWrapper() {
  const { username } = useParams();
  const { user: loggedUser } = useContext(AuthContext);
  const profileUsername = username || loggedUser?.username;

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileUsername) return undefined;
    let cancelled = false;

    const fetchProfileData = async (background = false) => {
      if (!background) {
        setLoading(true);
        setError(null);
      }

      try {
        const userRes = await API.get(`/users/${profileUsername}`);
        if (cancelled) return;

        const userData = userRes.data;
        const userId = userData.id;
        const articleOwner = userData.username || userId;
        setUser(userData);

        const results = await Promise.allSettled([
          API.get(`/users/${userId}/posts`),
          API.get(`/users/${userId}/liked`),
          API.get(`/users/${userId}/saved`),
          API.get(`/users/${userId}/communities`),
          API.get(`/articles/user/${articleOwner}`),
        ]);
        if (cancelled) return;

        const setters = [setPosts, setLikedPosts, setSavedPosts, setCommunities, setArticles];
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            setters[index](Array.isArray(result.value.data) ? result.value.data : []);
          } else {
            console.warn("Failed to fetch profile section:", result.reason?.message);
            if (!background) setters[index]([]);
          }
        });
      } catch (fetchError) {
        console.error("Profile fetch failed:", fetchError);
        if (!background && !cancelled) {
          setError("Failed to fetch profile. User may not exist.");
          setUser(null);
        }
      } finally {
        if (!background && !cancelled) setLoading(false);
      }
    };

    fetchProfileData();
    const handleOnline = () => fetchProfileData(true);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
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
      articles={articles}
      isOwner={isOwner}
    />
  );
}
