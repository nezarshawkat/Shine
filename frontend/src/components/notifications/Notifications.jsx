// src/components/notifications/Notifications.jsx
import React, { useEffect, useState } from "react";
import axios from "../../api";
import { socket } from "../../socket";

export default function Notifications({ userId }) {
  const [notifications, setNotifications] = useState([]);

  // Fetch existing notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`/notifications/${userId}`);
      setNotifications(res.data);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    // Join socket room
    socket.emit("join", userId);

    // Listen to new notifications
    socket.on("notification", (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => socket.off("notification");
  }, [userId]);

  const markAsRead = async (id) => {
    try {
      await axios.post(`/notifications/${userId}/read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ maxHeight: 300, overflowY: "auto" }}>
      {notifications.map(n => (
        <div key={n.id} style={{ padding: 8, background: n.isRead ? "#fff" : "#eef", marginBottom: 4 }}>
          <div>{n.content}</div>
          <button onClick={() => markAsRead(n.id)}>Mark read</button>
        </div>
      ))}
      {notifications.length === 0 && <div>No notifications</div>}
    </div>
  );
}
