import React, { useState, useEffect } from "react";
import CommunityCard from "./CommunityCard";

export default function FeedC({ feedWidth }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        // Ensure this URL matches your active backend port
        const res = await fetch("https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/communities");
        
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const result = await res.json();
        
        // Handle both direct array or nested data object
        const communityList = Array.isArray(result) ? result : (result.data || []);
        setCommunities(communityList);
      } catch (err) {
        console.error("Failed to fetch communities:", err);
        setError("Could not load communities. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading communities...</div>;
  if (error) return <div style={{ textAlign: "center", color: "#ff4d4f", padding: 40 }}>{error}</div>;

  if (communities.length === 0) {
    return <div style={{ textAlign: "center", padding: 40 }}>No communities available yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
      {communities.map((comm) => (
        <CommunityCard
          key={comm.id}
          feedWidth={feedWidth}
          community={{
            id: comm.id,
            communityIcon: comm.icon, 
            communityName: comm.name,
            bannerTitle: comm.slogan || "",
            descriptionText: comm.discription || "", // Note: spelling matches your schema
            keywords: comm.interests || [],         // Note: matches schema 'interests'
            imageUrl: comm.banner || "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600",
            membersCountText: `${comm._count?.communityMembers || 0} members`,
            imageAvatars: comm.friendsInComm?.map(f => f.image).filter(Boolean) || [], 
            memberReferenceText: comm.memberReferenceText || "",
          }}
        />
      ))}
    </div>
  );
}