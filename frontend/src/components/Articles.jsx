import React from "react";
import Header from "./Header";
import RightSideBarA from "./articles/rightSideBarA";
import FeedA from "./articles/feedA";
import "/workspaces/Shine/frontend/src/styles/articles.css";

function Articles() {
  return (
    <div className="articles-page">
      <Header />

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