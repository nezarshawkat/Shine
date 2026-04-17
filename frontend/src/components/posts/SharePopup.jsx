import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "../../api";

/**
 * @param {string} id - The ID of the content
 * @param {string} type - One of 'post', 'community', 'article', or 'profile'
 * @param {function} onClose - Function to close the popup
 */
export default function SharePopup({ id, type = "article", title = "", description = "", image = "", onClose }) {
  const shareType = (type || "article").toLowerCase();
  const previewOrigin = BACKEND_URL || window.location.origin;
  const shareUrl = `${previewOrigin}/share/${shareType}/${id}`;
  const [showToast, setShowToast] = useState(false);
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const readableType = shareType.charAt(0).toUpperCase() + shareType.slice(1);
  const isCommunityShare = shareType === "community";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const iconBox = (bg, content, label, onClick) => (
    <div
      onClick={onClick}
      style={{
        width: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: isDarkMode ? "#000" : bg,
          border: isDarkMode ? "1px solid #fff" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {content}
      </div>
      <div style={{ fontSize: 14, color: isDarkMode ? "#fff" : "#6B7280" }}>{label}</div>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(6px)",
          zIndex: 999,
        }}
      />

      {/* Popup */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 620,
          background: isDarkMode ? "#1d1d1d" : "#fff",
          border: isDarkMode ? "1px solid #fff" : "none",
          borderRadius: 16,
          padding: 24,
          zIndex: 1000,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, color: isDarkMode ? "#fff" : "#1C274C" }}>
            Share {readableType}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 28,
              cursor: "pointer",
              color: isDarkMode ? "#fff" : "#6B7280"
            }}
          >
            ×
          </button>
        </div>

        {/* Share options */}
        {isCommunityShare && (
          <button
            onClick={copyLink}
            style={{
              width: "100%",
              marginBottom: 18,
              padding: "12px 14px",
              borderRadius: 10,
              border: isDarkMode ? "1px solid #fff" : "1px solid #e5e7eb",
              background: isDarkMode ? "#000" : "#f9fafb",
              color: isDarkMode ? "#fff" : "#1C274C",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Share community
            {(title || description) && (
              <div style={{ marginTop: 6, fontWeight: 500, color: isDarkMode ? "#fff" : "#6B7280", fontSize: 13 }}>
                {[title, description].filter(Boolean).join(" • ")}
              </div>
            )}
            {image && (
              <div style={{ marginTop: 6, fontWeight: 500, color: isDarkMode ? "#fff" : "#9CA3AF", fontSize: 12 }}>
                Community icon included in preview
              </div>
            )}
          </button>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: 28,
          }}
        >
          {iconBox("#FEF3C7", "</>", "Embed", copyLink)}

          {iconBox("#E8F0FE", "f", "Facebook", () =>
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
              "_blank"
            )
          )}

          {iconBox("#E5E7EB", "X", "X", () =>
            window.open(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
              "_blank"
            )
          )}

          {iconBox("#E0F2FE", "in", "LinkedIn", () =>
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
              "_blank"
            )
          )}

          {iconBox("#DCFCE7", "✉", "Email", () => {
            window.location.href = `mailto:?subject=Check out this ${type}&body=${shareUrl}`;
          })}
        </div>

        {/* Copy link button */}
        <button
          onClick={copyLink}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 10,
            background: isDarkMode ? "#000" : "#F9FAFB",
            border: isDarkMode ? "1px solid #fff" : "none",
            color: "#FBBF24",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            gap: 10,
          }}
        >
          🔗 Copy {readableType.toLowerCase()} link
        </button>
      </div>

      {/* Custom Toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1C274C",
            color: "#FFC847",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            zIndex: 1100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            animation: "slideUp 0.3s ease",
          }}
        >
          {readableType} Link Copied
        </div>
      )}

      {/* Toast animation */}
      <style>
        {`
          @keyframes slideUp {
            0% { transform: translate(-50%, 100%); opacity: 0; }
            100% { transform: translate(-50%, 0); opacity: 1; }
          }
        `}
      </style>
    </>
  );
}
