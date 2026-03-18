import React, { useState, useEffect, useMemo } from "react";
import CommunityCard from "./CommunityCard";
import { API_BASE_URL } from "../../api";

export default function FeedC({ feedWidth, searchText = "", setSearchText }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        // Ensure this URL matches your active backend port
        const res = await fetch(`${API_BASE_URL}/communities`);
        
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

  const normalizedQuery = searchText.trim().toLowerCase();

  const filteredCommunities = useMemo(() => {
    if (!normalizedQuery) return communities;

    return communities.filter((community) => {
      const name = (community.name || "").toLowerCase();
      const slogan = (community.slogan || "").toLowerCase();
      const description = (community.discription || "").toLowerCase();
      const interests = Array.isArray(community.interests)
        ? community.interests
        : typeof community.interests === "string"
          ? community.interests.split(",")
          : [];

      const keywords = interests
        .map((interest) => String(interest || "").toLowerCase())
        .filter(Boolean);

      return (
        name.includes(normalizedQuery) ||
        slogan.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        keywords.some((keyword) => keyword.includes(normalizedQuery))
      );
    });
  }, [communities, normalizedQuery]);

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading communities...</div>;
  if (error) return <div style={{ textAlign: "center", color: "#ff4d4f", padding: 40 }}>{error}</div>;

  if (communities.length === 0) {
    return <div style={{ textAlign: "center", padding: 40 }}>No communities available yet.</div>;
  }

  if (filteredCommunities.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#1C274C" }}>
        No communities matched “{searchText}”. Try a community name or one of its keywords.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
      {filteredCommunities.map((comm) => (
        <CommunityCard
          key={comm.id}
          feedWidth={feedWidth}
          onintrestClick={(interest) => setSearchText?.(interest)}
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
