import React, { useState, useEffect, useRef, useCallback } from "react";
import CommunityCard from "./CommunityCard";
import axios from "axios";

// Removed the .js suffix and kept it to the base route
const API_BASE_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/communities";

export default function CommunityFeed({ userId }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef();

  const fetchCommunities = useCallback(async (isFirstLoad = false) => {
    // If no userId yet, don't attempt fetch
    if (!userId || loading || (!hasMore && !isFirstLoad)) return;
    
    setLoading(true);
    try {
      const currentCursor = isFirstLoad ? null : cursor;
      const res = await axios.get(`${API_BASE_URL}/discover/${userId}`, {
        params: { cursor: currentCursor, limit: 10 }
      });
      
      const newData = res.data.data || [];
      const nextCursor = res.data.nextCursor;

      setCommunities(prev => (isFirstLoad ? newData : [...prev, ...newData]));
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch (err) {
      console.error("Error fetching communities:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, cursor, loading, hasMore]);

  // Infinite Scroll Observer
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchCommunities();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchCommunities]);

  // Initial Fetch: Triggered when userId is finally available
  useEffect(() => {
    if (userId) {
      setCommunities([]); // Reset list on user change
      setHasMore(true);
      setCursor(null);
      fetchCommunities(true);
    }
  }, [userId]); 

  return (
    <div style={{ padding: "20px", maxWidth: "850px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px", fontSize: "24px", fontWeight: "bold", color: "#1C274C" }}>
        Recommended Communities
      </h2>
      
      <div>
        {communities.length > 0 ? (
          communities.map((comm, index) => (
            <div 
              key={`${comm.id}-${index}`} 
              ref={communities.length === index + 1 ? lastElementRef : null}
            >
              <CommunityCard community={comm} />
            </div>
          ))
        ) : (
          !loading && <p style={{ textAlign: "center", color: "#666" }}>No communities found.</p>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "20px", fontWeight: 600, color: "#1C274C" }}>
          Loading communities...
        </div>
      )}
    </div>
  );
}