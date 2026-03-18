import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "./Header";
import LeftSidebar from "./forum/LeftSidebar";
import RightSidebar from "./forum/RightSidebar";
import Feed from "./forum/Feed";
import PostView from "./PostView/PostView";
import { SearchContext } from "../searchContext.jsx";
import "../styles/Forum.css";

export default function Forum() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setSearchQuery } = useContext(SearchContext);

  const [selectedPostId, setSelectedPostId] = useState(postId || null);
  const [feed, setFeed] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const scrollPosRef = useRef(0);

  // Sync state with URL params
  useEffect(() => {
    setSelectedPostId(postId || null);
  }, [postId]);

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("search") || "";
    setSearchQuery(query);
  }, [location.search, setSearchQuery]);

  const handleSelectPost = (id) => {
    scrollPosRef.current = window.scrollY;
    setSelectedPostId(id);
    navigate(`/forum/post/${id}`);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSelectedPostId(null);
    navigate("/forum");

    setTimeout(() => {
      window.scrollTo({
        top: scrollPosRef.current,
        behavior: "instant",
      });
    }, 0);
  };

  return (
    <div className="forum-page">
      <Header />

      {/* Mobile Top Bar */}
      <div className="forum-mobile-topbar">
        <button className="forum-mobile-menu-btn" onClick={() => setMobileNavOpen(true)}>
          ☰ Menu
        </button>
      </div>

      {/* Unified Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)} />
          <aside className="mobile-left-drawer">
            <button className="mobile-drawer-close" onClick={() => setMobileNavOpen(false)}>✕</button>
            
            <div className="mobile-drawer-scroll-area">
              {/* 1. Post Button (from RightSidebar) */}
              <RightSidebar showOnly={['postButton']} />

              {/* 2. Events (from RightSidebar) */}
              <div style={{ marginTop: '15px' }}>
                 <RightSidebar showOnly={['events']} />
              </div>

              {/* 3. Trending (from LeftSidebar) */}
              <div style={{ marginTop: '15px' }}>
                <LeftSidebar hideSearch={true} showOnly={['trending']} />
              </div>

              {/* 4. Friends (from RightSidebar) */}
              <div style={{ marginTop: '15px' }}>
                <RightSidebar showOnly={['friends']} />
              </div>

              {/* 5. Messenger Group (from LeftSidebar) */}
              <div style={{ marginTop: '15px' }}>
                <LeftSidebar hideSearch={true} showOnly={['messenger']} />
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Forum Layout */}
      <div className="forum-container">
        <aside className="left-column">
          <LeftSidebar />
        </aside>

        <main className="center-column">
          {/* Mobile-only Search Group: Placed before the feed */}
          {!selectedPostId && (
            <div className="mobile-search-wrapper">
              <LeftSidebar onlySearch={true} />
            </div>
          )}

          {selectedPostId ? (
            <PostView postId={selectedPostId} goBack={handleBack} />
          ) : (
            <div className="feed-scroll">
              <Feed
                onSelectPost={handleSelectPost}
                feed={feed}
                setFeed={setFeed}
              />
            </div>
          )}
        </main>

        <aside className="right-column">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
