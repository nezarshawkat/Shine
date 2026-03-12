import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import feather from "../../assets/feather.png";
import profileDefault from "../../assets/profileDefault.svg"; 

const RightSidebar = () => {
  const [eventsData, setEventsData] = useState([]);
  const [friends, setFriends] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const activeEvent =
    eventsData.length > 0
      ? eventsData[currentIndex % eventsData.length]
      : null;

  /* ==============================
      FETCH EVENTS + FOLLOWING
  ============================== */
  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Events
        const eventRes = await fetch(
          "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/events"
        );
        const eventJson = await eventRes.json();
        setEventsData(Array.isArray(eventJson?.data) ? eventJson.data : []);

        // 2. Fetch Following (Labelled as Friends)
        if (user?.username) {
          const friendRes = await fetch(
            `https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/users/${user.username}/following`
          );
          const friendJson = await friendRes.json();
          // Backend returns flattened user objects
          setFriends(Array.isArray(friendJson) ? friendJson : []);
        }
      } catch (err) {
        console.error("Data fetch error:", err);
        setEventsData([]);
        setFriends([]);
      }
    }

    fetchData();
  }, [user?.username]);

  /* ==============================
      AUTO SLIDESHOW
  ============================== */
  useEffect(() => {
    if (!eventsData.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % eventsData.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [eventsData]);

  /* ==============================
      CLICK OUTSIDE POPUP
  ============================== */
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

  const handleCreateClick = (route) => {
    if (!user) {
      navigate("/signup");
    } else {
      navigate(route);
    }
    setShowPopup(false);
  };

  const truncateWords = (text = "", maxWords) => {
    const words = text.toString().split(" ");
    return words.length <= maxWords
      ? text
      : words.slice(0, maxWords).join(" ") + "...";
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
      {/* Overlay */}
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

      {/* ================= EVENT BANNER ================= */}
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
          <div style={{ fontSize: "14px", color: "#000", opacity: 0.8 }}>
            There are no events right now
          </div>
        ) : (
          <>
            {activeEvent.image && (
              <img
                src={activeEvent.image}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                }}
              />
            )}
            <div style={{ position: "absolute", top: "21px", right: "14px", display: "flex", gap: "4px", zIndex: 4 }}>
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
            <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px", zIndex: 3 }}>
              <div style={{ fontSize: "19px", fontWeight: 700, color: "#1C274C" }}>
                {truncateWords(activeEvent.title, 9)}
              </div>
              <div style={{ fontSize: "17px", color: "#1C274C" }}>
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

      {/* ================= POST BUTTON ================= */}
      <div style={{ width: "100%", position: "relative" }} ref={popupRef}>
        <button
          onClick={() => setShowPopup(!showPopup)}
          style={{
            width: "100%",
            height: "57px",
            borderRadius: "1.4rem",
            backgroundColor: "#1c274c",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            zIndex: 10
          }}
        >
          <img src={feather} alt="" style={{ width: 20 }} />
          <span style={{ fontSize: "19px", fontWeight: 600, color: "#FFC847" }}>Post</span>
        </button>

        {showPopup && (
          <div
            style={{
              position: "absolute",
              bottom: "70px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "270px",
              backgroundColor: "#FFFFFF",
              borderRadius: "23px",
              border: "0.5px solid #1c274c",
              padding: "20px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 9,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.1)"
            }}
          >
            {[
              { label: "Opinion", route: "/opinion-create" },
              { label: "Analysis", route: "/analysis-create" },
              { label: "Critique", route: "/critique-create" },
              { label: "Poll", route: "/poll-create" },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => handleCreateClick(item.route)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#1C274C",
                    margin: "6px 0",
                    cursor: "pointer",
                    width: "100%"
                  }}
                >
                  {item.label}
                </button>
                {i < 3 && <div style={{ width: "80%", height: "0.5px", backgroundColor: "rgba(0,0,0,0.1)", margin: "5px 0" }} />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;