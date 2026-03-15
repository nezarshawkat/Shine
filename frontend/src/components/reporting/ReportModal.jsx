import React from "react";

const REASONS = ["Invalid resources", "Inappropriate language", "Spam"];

export default function ReportModal({ title = "Report", open, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", display: "grid", placeItems: "center", zIndex: 2500 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "90vw", background: "white", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>Choose a reason:</p>
        <div style={{ display: "grid", gap: 8 }}>
          {REASONS.map((reason) => (
            <button key={reason} onClick={() => onSelect(reason)} style={{ textAlign: "left", background: "#f3f4f6", color: "#111827" }}>
              {reason}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
