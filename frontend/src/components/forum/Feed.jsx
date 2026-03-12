import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { AuthContext } from "../AuthProvider.jsx";
import { SearchContext } from "../../searchContext.jsx";
import OpinionPost from "/workspaces/Shine/frontend/src/components/posts/opinionPost.jsx";
import CritiquePost from "/workspaces/Shine/frontend/src/components/posts/critiquePost.jsx";
import AnalysisPost from "/workspaces/Shine/frontend/src/components/posts/analysisPost.jsx";
import PollPost from "/workspaces/Shine/frontend/src/components/posts/pollPost.jsx";
import SkeletonPost from "/workspaces/Shine/frontend/src/components/posts/SkeletonPost.jsx";

const FEED_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/posts";

export default function Feed({ feed, setFeed, onSelectPost }) {
  const { searchQuery } = useContext(SearchContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 1. Persist scroll position across renders
  const scrollRef = useRef(0);

  useEffect(() => {
    window.scrollTo(0, scrollRef.current);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Filter feed logic
  const filteredFeed = useMemo(() => {
    if (!searchQuery) return feed;
    const query = searchQuery.toLowerCase();
    return feed.filter(
      (post) =>
        post.text?.toLowerCase().includes(query) ||
        post.keywords?.some((k) => k.toLowerCase().includes(query))
    );
  }, [feed, searchQuery]);

  // 3. Infinite scroll observer
  const observer = useRef();
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // 4. FETCH POSTS
  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${FEED_URL}?page=${page}&pageSize=10`);
        const newPosts = res.data;

        if (!Array.isArray(newPosts)) {
          console.error("Backend error: Expected array but got:", newPosts);
          setError("Failed to load feed (invalid server response)");
          return;
        }

        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          setFeed((prevPosts) => {
            const existingIds = new Set(prevPosts.map((p) => p.id));
            const uniquePosts = newPosts.filter((p) => !existingIds.has(p.id));
            return [...prevPosts, ...uniquePosts];
          });
          setHasMore(newPosts.length === 10);
        }
      } catch (err) {
        console.error("Network error:", err.message);
        setError("Failed to load feed. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [page]); 

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // 5. RENDER POST - FIXED: Added width: 100% to force filling the column
  const renderPost = (post, index) => {
    const isLast = filteredFeed.length === index + 1;
    
    const componentMap = {
      opinion: OpinionPost,
      critique: CritiquePost,
      analysis: AnalysisPost,
      poll: PollPost,
    };

    const Component = componentMap[post.type];
    
    if (!Component) {
        console.warn(`Unknown post type: ${post.type}`, post);
        return null;
    }

    return (
      <div
        ref={isLast ? lastPostRef : null}
        key={post.id || index}
        style={{ 
          width: "100%", // Force post to fill the center column
          marginBottom: isMobile ? "2px" : "12px" 
        }}
      >
        <Component 
          postId={post.id} 
          initialData={post} 
          onClick={() => onSelectPost(post.id)} 
        />
      </div>
    );
  };

  if (error) {
    return (
      <div style={{ padding: 40, color: "#ef4444", textAlign: "center" }}>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ marginTop: "10px", padding: "8px 16px", cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        flex: 1,
        padding: isMobile ? "12px" : "20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center", // Ensures content stays centered if it hits a max-width
      }}
    >
      {/* Container for the list of posts */}
      <div 
        style={{ 
          width: "100%", 
          display: "flex", 
          flexDirection: "column", 
          gap: isMobile ? "2px" : "12px", 
          alignItems: "center" 
        }}
      >
        {filteredFeed.map((post, index) => renderPost(post, index))}

        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ width: "100%" }}>
              <SkeletonPost />
            </div>
          ))}
      </div>

      {!hasMore && filteredFeed.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          You've reached the end of the feed.
        </div>
      )}

      {filteredFeed.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          No posts found.
        </div>
      )}
    </div>
  );
}