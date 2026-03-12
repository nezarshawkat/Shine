import React from "react";
import { useNavigate } from "react-router-dom";

const MobileMenu = ({ onClose }) => {
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="absolute top-16 left-0 w-full bg-white shadow-lg flex flex-col items-center py-6 gap-6 text-lg font-medium text-[#1C274C] z-50">
      <nav className="flex flex-col items-center gap-4">
        <button onClick={() => handleNav("/forum")}>Forum</button>
        <button onClick={() => handleNav("/communities")}>Communities</button>
        <button onClick={() => handleNav("/articles")}>Articles</button>
        <button onClick={() => handleNav("/events")}>Events</button>
      </nav>
    </div>
  );
};

export default MobileMenu;
