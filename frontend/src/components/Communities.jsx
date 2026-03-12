import React from "react";
import Header from "./Header";


import FeedC from "/workspaces/Shine/frontend/src/components/communities/feedC.jsx";
import LeftBarC from "./communities/LeftBarC.jsx";
import RightBarC from "./communities/rightBarC.jsx";

import "../styles/comm.css"; // Make sure this path is correct

export default function Communities() {
  return (
    <div className="communities-page">
      <Header />

      <div className="communities-container">
        {/* Left Sidebar */}
        <aside className="left-column">
          <LeftBarC />
        </aside>

        {/* Main Feed */}
        <main className="center-column">
          <div className="center-content">
            <FeedC />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="right-column">
          <RightBarC />
        </aside>
      </div>
    </div>
  );
}
