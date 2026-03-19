import React, { useState } from "react";
import Header from "./Header";
import FeedC from "./communities/feedC.jsx";
import LeftBarC from "./communities/LeftBarC.jsx";
import RightBarC from "./communities/rightBarC.jsx";
import "../styles/comm.css";

export default function Communities() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  return (
    <div className="communities-page">
      <Header />

      {/* 1. Mobile Top Bar (Single Menu Icon) */}
      <div className="forum-mobile-topbar">
        <button className="forum-mobile-menu-btn" onClick={() => setMobileNavOpen(true)}>
          ☰ Menu
        </button>
      </div>

      {/* 2. Unified Mobile Drawer */}
      {mobileNavOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)} />
          <aside className="mobile-left-drawer">
            <button className="mobile-drawer-close" onClick={() => setMobileNavOpen(false)}>✕</button>
            
            <div className="mobile-drawer-scroll-area">
              {/* ORDER: Make Community -> Events -> Trending -> Friends -> Messenger */}
              
              {/* A. Make Community Button (from LeftBarC) */}
              <LeftBarC showOnly={["makeButton"]} />

              {/* B. Events (from RightBarC) */}
              <div style={{ marginTop: '1.25rem' }}>
                <RightBarC showOnly={["events"]} />
              </div>

              {/* C. Trending Topics (from LeftBarC) */}
              <div style={{ marginTop: '1.25rem' }}>
                <LeftBarC hideSearch={true} showOnly={["trending"]} searchText={searchText} setSearchText={setSearchText} />
              </div>

              {/* D. Friends (from RightBarC) */}
              <div style={{ marginTop: '1.25rem' }}>
                <RightBarC showOnly={["friends"]} />
              </div>

              {/* E. Communities List (from LeftBarC - serves as 'Messenger/Group' context here) */}
              <div style={{ marginTop: '1.25rem' }}>
                <LeftBarC showOnly={["communitiesList"]} />
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="communities-container">
        {/* Left Sidebar (Desktop) */}
        <aside className="left-column">
          <LeftBarC searchText={searchText} setSearchText={setSearchText} />
        </aside>

        {/* Main Feed */}
        <main className="center-column">
          {/* Mobile Search: Appears before FeedC only on small screens */}
          <div className="mobile-search-wrapper">
             <LeftBarC onlySearch={true} searchText={searchText} setSearchText={setSearchText} />
          </div>

          <div className="center-content">
            <FeedC searchText={searchText} setSearchText={setSearchText} />
          </div>
        </main>

        {/* Right Sidebar (Desktop) */}
        <aside className="right-column">
          <RightBarC />
        </aside>
      </div>
    </div>
  );
}
