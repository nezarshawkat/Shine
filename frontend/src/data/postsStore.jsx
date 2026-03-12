// src/data/postsStore.js

import axios from "axios";

const API_BASE = "http://localhost:5000/api"; // adjust if your backend URL is different

/**
 * Create a new post via backend API
 * @param {Object} post - Post data: { type, text, keywords, authorId, pollOptions, communityId, parentId }
 */
export async function createPost(post) {
  try {
    const response = await axios.post(`${API_BASE}/posts`, post);
    console.log("Post created:", response.data);
    return response.data; // return the created post
  } catch (error) {
    console.error("Failed to create post:", error.response?.data || error.message);
    throw error;
  }
}
