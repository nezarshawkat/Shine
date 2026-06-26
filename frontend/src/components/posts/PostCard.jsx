import React, { forwardRef } from "react";

const PostCard = forwardRef(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`post-card-shell ${className || ""}`.trim()}
      {...props}
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "#fff",
        borderRadius: 18,
        border: "0.5px solid #1C274C",
        padding: 18,
        boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...props.style, // Merges custom styles if passed
      }}
    >
      {children}
    </div>
  );
});


PostCard.displayName = "PostCard";

export default PostCard;
