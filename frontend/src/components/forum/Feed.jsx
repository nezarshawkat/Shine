import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthProvider.jsx";
import { SearchContext } from "../../searchContext.jsx";
import OpinionPost from "../posts/opinionPost.jsx";
import CritiquePost from "../posts/critiquePost.jsx";
import AnalysisPost from "../posts/analysisPost.jsx";
import PollPost from "../posts/pollPost.jsx";
import SkeletonPost from "../posts/SkeletonPost.jsx";
import profileDefault from "../../assets/profileDefault.svg";
import API, { API_BASE_URL, buildMediaUrl } from "../../api";

const FEED_URL = `${API_BASE_URL}/posts`;
const FEED_RESUME_TTL_MS = 30 * 60 * 1000;

function getFeedSessionId() {
  const key = "shine:feed-session";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(key, id);
  return id;
}

function readResumePostId(userId) {
  try {
    const key = `shine:feed-resume:${userId || "guest"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved.postId || Date.now() - saved.at > FEED_RESUME_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return saved.postId;
  } catch {
    return null;
  }
}

function TrackedFeedPost({
  post,
  Component,
  isLast,
  lastPostRef,
  onSelectPost,
  queueFeedEvent,
  rememberPosition,
  isMobile,
}) {
  const postRef = useRef(null);
  const visibleSinceRef = useRef(null);
  const impressionSentRef = useRef(false);
  const impressionTimerRef = useRef(null);

  const setPostNode = useCallback((node) => {
    postRef.current = node;
    if (isLast) lastPostRef(node);
  }, [isLast, lastPostRef]);

  useEffect(() => {
    const node = postRef.current;
    if (!node) return undefined;

    const finishVisibility = () => {
      clearTimeout(impressionTimerRef.current);
      if (!visibleSinceRef.current) return;
      const dwellMs = Date.now() - visibleSinceRef.current;
      visibleSinceRef.current = null;
      if (impressionSentRef.current && dwellMs >= 700) {
        queueFeedEvent({ type: "dwell", postId: post.id, dwellMs });
        if (dwellMs < 1500) queueFeedEvent({ type: "skip", postId: post.id });
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        if (!visibleSinceRef.current) visibleSinceRef.current = Date.now();
        clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = setTimeout(() => {
          if (!impressionSentRef.current) {
            impressionSentRef.current = true;
            queueFeedEvent({ type: "impression", postId: post.id });
          }
          rememberPosition(post.id);
        }, 700);
      } else {
        finishVisibility();
      }
    }, { threshold: [0, 0.6] });

    observer.observe(node);
    return () => {
      observer.disconnect();
      finishVisibility();
    };
  }, [post.id, queueFeedEvent, rememberPosition]);

  const handleOpen = () => {
    queueFeedEvent({ type: "open", postId: post.id });
    rememberPosition(post.id);
    onSelectPost(post.id);
  };

  const handleClickCapture = (event) => {
    const interactive = event.target.closest(
      "button, a, input, textarea, select, [role='button'], .post-action-icon"
    );
    if (!interactive) {
      queueFeedEvent({ type: "open", postId: post.id });
      rememberPosition(post.id);
    }
  };

  return (
    <div
      ref={setPostNode}
      data-feed-post-id={post.id}
      onClickCapture={handleClickCapture}
      style={{
        width: "100%",
        maxWidth: "765px",
        overflow: "hidden",
        marginBottom: isMobile ? "2px" : "12px",
      }}
    >
      <Component postId={post.id} initialData={post} onClick={handleOpen} />
    </div>
  );
}

export default function Feed({ feed, setFeed, onSelectPost }) {
  const { user, userId, token, refreshUser } = useContext(AuthContext);
  const { searchQuery } = useContext(SearchContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [followBusyUserId, setFollowBusyUserId] = useState(null);
  const sessionIdRef = useRef(getFeedSessionId());
  const resumePostIdRef = useRef(readResumePostId(userId));
  const loadedIdsRef = useRef(new Set(feed.map((post) => post.id)));
  const eventQueueRef = useRef([]);

  const trimmedQuery = searchQuery.trim();
  const isUserSearch = trimmedQuery.startsWith("@");
  const usernameQuery = isUserSearch ? trimmedQuery.slice(1).trim() : "";

  const followingSet = useMemo(
    () => new Set((user?.following || []).map((f) => f.followingId)),
    [user]
  );

  useEffect(() => {
    feed.forEach((post) => loadedIdsRef.current.add(post.id));
  }, [feed]);

  const flushFeedEvents = useCallback(async () => {
    if (!token || eventQueueRef.current.length === 0) return;
    const events = eventQueueRef.current.splice(0, 50);
    try {
      await fetch(`${API_BASE_URL}/posts/feed/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch {
      eventQueueRef.current = [...events, ...eventQueueRef.current].slice(0, 100);
    }
  }, [token]);

  const queueFeedEvent = useCallback((event) => {
    if (!userId || !token) return;
    eventQueueRef.current.push({ ...event, sessionId: sessionIdRef.current });
    if (eventQueueRef.current.length >= 10) flushFeedEvents();
  }, [flushFeedEvents, token, userId]);

  const rememberPosition = useCallback((postId) => {
    localStorage.setItem(
      `shine:feed-resume:${userId || "guest"}`,
      JSON.stringify({ postId, at: Date.now() })
    );
  }, [userId]);

  useEffect(() => {
    const timer = window.setInterval(flushFeedEvents, 5000);
    const onPageHide = () => flushFeedEvents();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
      flushFeedEvents();
    };
  }, [flushFeedEvents]);

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
    if (isUserSearch) return [];
    if (!searchQuery) return feed;
    const query = searchQuery.toLowerCase();
    const normalizedQuery = query.startsWith("#") ? query.slice(1) : query;
    return feed.filter((post) => {
      const text = (post.text || "").toLowerCase();
      const keywords = (post.keywords || []).map((k) => String(k).toLowerCase());
      return (
        text.includes(query) ||
        text.includes(normalizedQuery) ||
        keywords.some((k) => k.includes(query) || k.includes(normalizedQuery))
      );
    });
  }, [feed, searchQuery, isUserSearch]);

  useEffect(() => {
    if (!isUserSearch) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }

    if (!usernameQuery) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/users/search`, {
          params: { q: usernameQuery },
        });
        setUserResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("User search failed:", err);
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isUserSearch, usernameQuery]);

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
    if (isUserSearch) return;

    const fetchFeed = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(FEED_URL, {
          params: {
            page,
            pageSize: 10,
            userId: userId || undefined,
            sessionId: sessionIdRef.current,
            exclude: [...loadedIdsRef.current].slice(-500).join(",") || undefined,
            resumePostId:
              page === 1 && loadedIdsRef.current.size === 0
                ? resumePostIdRef.current || undefined
                : undefined,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const newPosts = res.data;

        if (!Array.isArray(newPosts)) {
          console.error("Backend error: Expected array but got:", newPosts);
          setError("Failed to load feed (invalid server response)");
          return;
        }

        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          newPosts.forEach((post) => loadedIdsRef.current.add(post.id));
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
  }, [page, isUserSearch, setFeed, userId, token]);

  const handleFollowToggle = async (targetUserId, currentlyFollowing) => {
    if (!userId || !token || !user?.username || followBusyUserId) return;
    setFollowBusyUserId(targetUserId);
    try {
      const endpoint = currentlyFollowing ? "unfollow" : "follow";
      await API.post(`/follow/${targetUserId}/${endpoint}`, { followerId: userId });
      await refreshUser(user.username, token);
    } catch (err) {
      console.error("Follow action failed", err);
    } finally {
      setFollowBusyUserId(null);
    }
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // 5. RENDER POST
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
      <TrackedFeedPost
        key={post.id || index}
        post={post}
        Component={Component}
        isLast={isLast}
        lastPostRef={lastPostRef}
        onSelectPost={onSelectPost}
        queueFeedEvent={queueFeedEvent}
        rememberPosition={rememberPosition}
        isMobile={isMobile}
      />
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
        padding: isMobile ? "12px 15px" : "20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {isUserSearch ? (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          {!usernameQuery && (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "36px 0" }}>
              Type a username after @ to find people.
            </div>
          )}

          {userSearchLoading && (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>Searching users...</div>
          )}

          {!userSearchLoading && usernameQuery && userResults.length === 0 && (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "36px 0" }}>No users found.</div>
          )}

          {!userSearchLoading &&
            userResults.map((foundUser) => {
              const isSelf = foundUser.id === userId;
              const isFollowing = followingSet.has(foundUser.id);

              return (
                <div
                  className="feed-user-result-card"
                  key={foundUser.id}
                  onClick={() => navigate(`/profile/${foundUser.username}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    background: "#FFF",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img
                    src={buildMediaUrl(foundUser.image) || profileDefault}
                    onError={(e) => {
                      e.currentTarget.src = profileDefault;
                    }}
                    alt={foundUser.username}
                    style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover" }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="feed-user-result-name" style={{ fontWeight: 600, color: "#1C274C" }}>{foundUser.name || foundUser.username}</div>
                    <div className="feed-user-result-username" style={{ fontSize: "13px", color: "#6b7280" }}>@{foundUser.username}</div>
                  </div>

                  <button
                    className="feed-user-result-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSelf) handleFollowToggle(foundUser.id, isFollowing);
                    }}
                    disabled={isSelf || followBusyUserId === foundUser.id}
                    style={{
                      border: "none",
                      borderRadius: "999px",
                      padding: "8px 14px",
                      cursor: isSelf ? "default" : "pointer",
                      fontWeight: 600,
                      background: isSelf ? "#E5E7EB" : isFollowing ? "#1C274C" : "#FFC847",
                      color: isSelf ? "#6b7280" : isFollowing ? "#FFC847" : "#1C274C",
                    }}
                  >
                    {isSelf ? "You" : isFollowing ? "Unfollow" : "Follow"}
                  </button>
                </div>
              );
            })}
        </div>
      ) : (
        <>
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "2px" : "12px",
              alignItems: "center",
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
        </>
      )}
    </div>
  );
}
