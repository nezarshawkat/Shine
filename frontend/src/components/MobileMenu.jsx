import React from "react";
import { useNavigate } from "react-router-dom";

const MobileMenu = ({ onClose }) => {
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="mobile-menu-overlay">
      <div className="mobile-menu-card">
        <nav className="mobile-menu-nav">
          <button className="mobile-menu-link" onClick={() => handleNav("/forum")}>Forum</button>
          <button className="mobile-menu-link" onClick={() => handleNav("/communities")}>Communities</button>
          <button className="mobile-menu-link" onClick={() => handleNav("/articles")}>Articles</button>
          <button className="mobile-menu-link" onClick={() => handleNav("/events")}>Events</button>
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
