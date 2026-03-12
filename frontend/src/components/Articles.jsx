import React, { useState } from "react";
import Header from "./Header";
import RightSideBarA from "./articles/rightSideBarA";
import FeedA from "./articles/feedA";
import "/workspaces/Shine/frontend/src/styles/articles.css";

function Articles() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="articles-page">
      <Header />
      <div className="forum-mobile-topbar">
        <button className="forum-mobile-menu-btn" onClick={() => setMobileNavOpen(true)}>☰ Menu</button>
      </div>
      {mobileNavOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)} />
          <aside className="mobile-left-drawer">
            <button className="mobile-drawer-close" onClick={() => setMobileNavOpen(false)}>✕</button>
            <button>Trending</button>
            <button>Post</button>
            <button>Article</button>
          </aside>
        </>
      )}

      <div className="articles-container">
        {/* ================= CENTER FEED ================= */}
        <main className="center-column">
          <FeedA />
        </main>

        {/* ================= RIGHT SIDEBAR ================= */}
        <aside className="right-column">
          <RightSideBarA />
        </aside>
      </div>
    </div>
  );
}

export default Articles;