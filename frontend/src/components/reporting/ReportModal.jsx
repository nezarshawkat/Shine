import React, { useState } from "react";

export default function ReportModal({
  title = "Report",
  open,
  onClose,
  onSelect,
  prompt = "Tell us why you are reporting this.",
  placeholder = "Write report reason...",
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onSelect(trimmed);
    setReason("");
  };

  const close = () => {
    setReason("");
    onClose();
  };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,39,76,.25)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 2500,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "92vw",
          background: "white",
          borderRadius: 16,
          padding: 18,
          border: "1px solid rgba(28,39,76,.15)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>{prompt}</p>
        <textarea
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: "10px 12px",
            resize: "vertical",
            color: "#1C274C",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 12,
          }}
        >
          <button
            onClick={close}
            style={{ background: "#f3f4f6", color: "#1C274C" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!reason.trim()}
            style={{ background: "#1C274C", color: "#FFC847" }}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
