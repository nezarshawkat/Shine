import React, { useState } from "react";
import Header from "./Header";
import RightSideBarA from "./articles/rightSideBarA";
import FeedA from "./articles/feedA";
import "../styles/articles.css";

function Articles() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="articles-page">
      <Header />
      
      {/* Mobile Top Bar */}
      <div className="forum-mobile-topbar">
        <button className="forum-mobile-menu-btn" onClick={() => setMobileNavOpen(true)}>
          ☰ Menu
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)} />
          <aside className="mobile-left-drawer">
            <button className="mobile-drawer-close" onClick={() => setMobileNavOpen(false)}>✕</button>
            
            <div className="mobile-drawer-content">
              {/* This container will hold the Trending list and the Yellow Button */}
              <div className="drawer-sidebar-wrapper">
                <RightSideBarA />
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="articles-container">
        <main className="center-column">
          {/* On Mobile: This shows the Search + Topics. 
             On Desktop: This is hidden via CSS. 
          */}
          <div className="mobile-only-search-wrapper">
             <RightSideBarA /> 
          </div>
          
          <FeedA />
        </main>

        {/* Right Sidebar (Desktop) */}
        <aside className="right-column">
          <RightSideBarA />
        </aside>
      </div>
    </div>
  );
}

export default Articles;