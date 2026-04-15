// src/components/posts/SkeletonPost.jsx
import React from "react";
import { useTheme } from "../ThemeProvider.jsx";

export default function SkeletonPost() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      style={{
        width: "100%",
        padding: "20px",
        marginBottom: "12px",
        backgroundColor: isDark ? "#1d1d1d" : "#f0f0f0",
        border: isDark ? "1px solid rgba(255,255,255,0.22)" : "none",
        borderRadius: "8px",
        animation: "pulse 1.5s infinite",
      }}
    >
      <div style={{ height: "20px", width: "40%", backgroundColor: isDark ? "#2c2c2c" : "#e0e0e0", marginBottom: "10px", borderRadius: "4px" }} />
      <div style={{ height: "15px", width: "80%", backgroundColor: isDark ? "#2c2c2c" : "#e0e0e0", marginBottom: "6px", borderRadius: "4px" }} />
      <div style={{ height: "15px", width: "60%", backgroundColor: isDark ? "#2c2c2c" : "#e0e0e0", borderRadius: "4px" }} />
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
