// src/data/postsStore.js

import axios from "axios";
import { API_BASE_URL } from "../api";

/**
 * Create a new post via backend API
 * @param {Object} post - Post data: { type, text, keywords, authorId, pollOptions, communityId, parentId }
 */
export async function createPost(post) {
  try {
    const response = await axios.post(`${API_BASE_URL}/posts`, post);
    console.log("Post created:", response.data);
    return response.data; // return the created post
  } catch (error) {
    console.error("Failed to create post:", error.response?.data || error.message);
    throw error;
  }
}
