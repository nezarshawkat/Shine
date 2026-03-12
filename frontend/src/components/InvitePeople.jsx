import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "/workspaces/Shine/frontend/src/assets/shine-logo.png";
import { AuthContext } from "/workspaces/Shine/frontend/src/components/AuthProvider.jsx";

const PRIMARY = "#1C274C";
const ACCENT = "#FFC847";
const BORDER = "#D8DDE6";
const BG = "#F7F9FC";
const LIGHT = "#ECF2F6";

function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      background: type === "error" ? "#FF4C4C" : PRIMARY, color: "#FFF",
      padding: "12px 24px", borderRadius: 12, fontWeight: 600, zIndex: 3000,
    }}>
      {message}
    </div>
  );
}

export default function InvitePeople() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const [friendInput, setFriendInput] = useState("");
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]); // Search results
  const [toast, setToast] = useState(null);
  
  const communityName = location.state?.communityName;
  const communityId = location.state?.communityId;

  // Search logic: Trigger when friendInput changes
  useEffect(() => {
    const searchUsers = async () => {
      if (friendInput.length < 1) {
        setSuggestions([]);
        return;
      }

      try {
        // Updated to use the correct Codespace URL pattern
        const res = await fetch(`https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/users/search?q=${friendInput}`);
        const data = await res.json();
        
        // Filter out people already in the 'friends' list and the user themselves
        const filtered = data.filter(u => 
          !friends.includes(u.username) && 
          u.username.toLowerCase() !== user?.username?.toLowerCase()
        );
        setSuggestions(filtered);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    const debounce = setTimeout(searchUsers, 300); // Wait 300ms after typing
    return () => clearTimeout(debounce);
  }, [friendInput, friends, user]);

  const addFriend = (username) => {
    if (!friends.includes(username)) {
      setFriends([...friends, username]);
    }
    setFriendInput("");
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Backspace" && !friendInput && friends.length) {
      setFriends(friends.slice(0, -1));
    }
  };

  const handleInviteAction = () => {
    if (friends.length === 0) return setToast("Add at least one friend");
    // Navigate to community page
    navigate(`/community/${communityId || ""}`, { state: { communityName } });
  };

  if (!communityName) return null;

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div style={{ display: "flex", alignItems: "center", padding: "24px 40px", gap: 20 }}>
        <img src={Logo} width={220} alt="Logo" />
        <div style={{ width: 1, height: 40, background: BORDER }}></div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: PRIMARY }}>Invite people</h1>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <label style={{ fontSize: 24, fontWeight: 600, color: PRIMARY, marginBottom: 20 }}>
          Invite your friends to <span style={{ color: ACCENT }}>{communityName}</span>
        </label>
        
        <div style={{ position: "relative" }}>
          <div 
            style={{
              width: "600px", minHeight: "60px", background: "#FFF", border: `1px solid ${PRIMARY}`,
              borderRadius: "15px", padding: "10px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8
            }}
            onClick={() => document.getElementById("invite-input").focus()}
          >
            {friends.map((friend, i) => (
              <div key={i} style={{ background: LIGHT, border: `1px solid ${PRIMARY}`, borderRadius: 8, padding: "4px 10px", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {friend}
                <span onClick={() => setFriends(friends.filter((_, idx) => idx !== i))} style={{ cursor: "pointer" }}>✕</span>
              </div>
            ))}
            <input 
              id="invite-input"
              autoComplete="off"
              style={{ border: "none", outline: "none", fontSize: 18, flex: 1, minWidth: "150px" }}
              placeholder={friends.length === 0 ? "Search by username..." : ""}
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* SUGGESTIONS DROPDOWN */}
          {suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "110%", left: 0, width: "100%", 
              background: "#FFF", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              zIndex: 10, overflow: "hidden", border: `1px solid ${BORDER}`
            }}>
              {suggestions.map((u) => (
                <div 
                  key={u.id}
                  onClick={() => addFriend(u.username)}
                  style={{ padding: "12px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${BG}` }}
                  onMouseOver={(e) => e.currentTarget.style.background = LIGHT}
                  onMouseOut={(e) => e.currentTarget.style.background = "#FFF"}
                >
                  <img src={u.image || "/default-avatar.png"} width={30} height={30} style={{ borderRadius: "50%" }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 50, right: 50, display: "flex", alignItems: "center", gap: 32 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: 18, fontWeight: 600, color: PRIMARY, cursor: "pointer" }}>Skip</button>
        <button onClick={handleInviteAction} style={{ padding: "12px 48px", background: PRIMARY, color: ACCENT, borderRadius: "12px", border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>Invite</button>
      </div>
    </div>
  );
}