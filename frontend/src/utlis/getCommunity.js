// frontend/src/utils/getCommunity.js

export async function getCommunityById(communityId) {
  if (!communityId) return null;

  try {
    const res = await fetch(`/api/communities/${communityId}`);
    if (!res.ok) throw new Error("Failed to fetch community");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}
