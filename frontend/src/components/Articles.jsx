import React, { useState } from "react";
import Header from "./Header";
import RightSideBarA from "./articles/rightSideBarA";
import FeedA from "./articles/feedA";
import MobileArrowIcon from "../assets/Adobe-Express-file.svg";
import "../styles/articles.css";

function Articles() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  React.useEffect(() => {
    const onScroll = () => setShowScrollTop(window.innerWidth <= 768 && window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="articles-page">
      <Header />
      
      {/* Mobile Top Bar */}
      <div className="forum-mobile-topbar">
        <button className="forum-mobile-menu-btn" onClick={() => setMobileNavOpen(true)}>
          <span className="forum-mobile-menu-hamburger" aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>
        {showScrollTop && (
          <button
            className="forum-mobile-scroll-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
          >
            <img src={MobileArrowIcon} alt="" aria-hidden="true" className="forum-mobile-scroll-top-icon" />
          </button>
        )}
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
