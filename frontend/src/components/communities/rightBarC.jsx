import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import addf from "../../assets/addf.png";
import profileDefault from "../../assets/profileDefault.svg";

const RightSidebar = () => {
  const [eventsData, setEventsData] = useState([]);
  const [friends, setFriends] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDarkImage, setIsDarkImage] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const activeEvent =
    eventsData.length > 0
      ? eventsData[currentIndex % eventsData.length]
      : null;

  /* ================= FETCH DATA (EVENTS + FRIENDS) ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Events
        const eventRes = await fetch(
          "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/events"
        );
        const eventJson = await eventRes.json();
        setEventsData(Array.isArray(eventJson?.data) ? eventJson.data : []);

        // 2. Fetch Friends (Following)
        if (user?.username) {
          const friendRes = await fetch(
            `https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/users/${user.username}/following`
          );
          const friendJson = await friendRes.json();
          setFriends(Array.isArray(friendJson) ? friendJson : []);
        }
      } catch (err) {
        console.error("Data fetch error:", err);
      }
    };

    fetchData();
  }, [user?.username]);

  /* ================= AUTO SLIDESHOW ================= */
  useEffect(() => {
    if (!eventsData.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % eventsData.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [eventsData]);

  /* ================= CLICK OUTSIDE POPUP ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= IMAGE BRIGHTNESS ================= */
  useEffect(() => {
    if (!activeEvent?.image) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeEvent.image;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const w = 100;
      const h = Math.round((img.height / img.width) * w) || 100;

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      let colorSum = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        colorSum += avg;
      }

      const brightness = colorSum / (imageData.data.length / 4);
      setIsDarkImage(brightness < 160);
    };

    img.onerror = () => setIsDarkImage(false);
  }, [currentIndex, activeEvent]);

  const truncateWords = (text, maxWords) => {
    const words = text?.split(" ") || [];
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        position: "relative",
      }}
    >
      {/* Blur overlay */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            zIndex: 8,
          }}
        />
      )}

      {/* ================= EVENT SQUARE ================= */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "266px",
          borderRadius: "1.4rem",
          border: "0.5px solid #1C274C",
          overflow: "hidden",
          backgroundColor: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!activeEvent ? (
          <div style={{ fontSize: "14px", fontWeight: 300, color: "#000", opacity: 0.8 }}>
            There are no events right now
          </div>
        ) : (
          <>
            {activeEvent.image && (
              <img
                src={activeEvent.image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute" }}
              />
            )}

            {/* Dots */}
            <div style={{ position: "absolute", top: "21px", right: "14px", display: "flex", gap: "3px", zIndex: 4 }}>
              {eventsData.map((_, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    border: "1px solid #1C274C",
                    backgroundColor: index === currentIndex ? "#FFC847" : "transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>

            {/* Text */}
            <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px", zIndex: 3 }}>
              <div style={{ fontSize: "19px", fontWeight: 700, color: isDarkImage ? "#FFF" : "#1C274C", marginBottom: "4px" }}>
                {truncateWords(activeEvent.title, 9)}
              </div>
              <div style={{ fontSize: "17px", fontWeight: 500, color: isDarkImage ? "#FFF" : "#1C274C" }}>
                {truncateWords(activeEvent.description, 9)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= FRIENDS SECTION ================= */}
            <div
              style={{
                width: "100%",
                minHeight: "475px",
                borderRadius: "1.4rem",
                border: "0.5px solid #1C274C",
                backgroundColor: "#FFFFFF",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.15rem" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 500, color: "#1C274C" }}>Friends</span>
                <span 
                  style={{ fontSize: "1rem", color: "#FFC847", cursor: "pointer" }}
                  onClick={() => navigate(`/${user?.username}/friends`)}
                >
                  View all
                </span>
              </div>
      
              <div style={{ height: "0.5px", backgroundColor: "#1C274C", marginBottom: "1.15rem" }} />
      
              {friends.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {friends.slice(0, 8).map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => navigate(`/profile/${friend.username}`)}
                      style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                    >
                      <img
                        src={friend.image || profileDefault}
                        alt=""
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "0.5px solid #ddd" }}
                        onError={(e) => { e.target.src = profileDefault; }}
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                         <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "#1C274C" }}>
                          {friend.name || friend.username}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "#666" }}>@{friend.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontWeight: 300, color: "#000", fontSize: "14px", textAlign: "center" }}>
                    {user ? "No friends yet." : "Sign in to see your friends."}
                  </div>
                </div>
              )}
            </div>
    </div>
  );
};

export default RightSidebar;