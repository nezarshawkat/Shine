import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_W, BASE_H, R } from "/workspaces/Shine/backend/models/commConfig.js";

const ASSET_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev";

export default function CommunityCard({ community, feedWidth = BASE_W, onintrestClick }) {
  const navigate = useNavigate();

  const {
    id,
    communityIcon,
    communityName,
    bannerTitle,
    descriptionText,
    intrests,
    interests,
    keywords,
    imageUrl,
    membersCountText,
    imageAvatars = [],
    memberReferenceText,
  } = community;

  const rawInterests = intrests ?? interests ?? keywords ?? [];

  const getFullUrl = (path) => {
    if (!path) return "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600";
    return path.startsWith("http") ? path : `${ASSET_URL}${path}`;
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const width = isMobile ? Math.min(feedWidth || BASE_W, window.innerWidth - 24) : feedWidth;
  const scale = width / BASE_W;
  const height = isMobile ? "auto" : BASE_H * scale;

  const imageWidthPx = width * R.imageWidthRatio;
  const leftContentWidthPx = width - imageWidthPx;

  const [expanded, setExpanded] = useState(false);
  const [nameFontSize, setNameFontSize] = useState(R.communityNameSizePx * scale);

  const interestList = Array.isArray(rawInterests)
    ? rawInterests
    : typeof rawInterests === "string"
      ? rawInterests.split(",").map(k => k.trim()).filter(Boolean)
      : [];

  useEffect(() => {
    const fitName = () => {
      const maxWidth = isMobile ? width * 0.5 : leftContentWidthPx - R.avatarSizePx * scale;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      // Use original R scale for mobile to keep it large
      let fontSize = (isMobile ? R.communityNameSizePx : R.communityNameSizePx) * scale;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(communityName || "").width;
      setNameFontSize(textWidth > maxWidth ? fontSize * (maxWidth / textWidth) : fontSize);
    };
    fitName();
  }, [communityName, width, isMobile, scale, leftContentWidthPx]);

  const handleCardClick = () => {
    navigate(`/community/${id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        width,
        height,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        background: "#fff",
        borderRadius: isMobile ? "20px" : 12 * scale,
        overflow: "hidden",
        boxShadow: isMobile ? "0 10px 30px rgba(0,0,0,0.1)" : "0 4px 20px rgba(0,0,0,0.06)",
        marginBottom: isMobile ? "20px" : "24px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {/* Mobile Header: Restored Logo size + Members Count (No Dividers) */}
      {isMobile && (
        <div style={{ 
          padding: "20px 20px 10px 20px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src={getFullUrl(communityIcon)}
              style={{ 
                width: R.avatarSizePx * scale, 
                height: R.avatarSizePx * scale, 
                borderRadius: "10px", 
                objectFit: "cover" 
              }}
              alt="icon"
            />
            <div style={{ fontSize: nameFontSize, fontWeight: 700, color: "#1C274C" }}>
              {communityName}
            </div>
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#1C274C" }}>
            {membersCountText}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        style={{
          width: isMobile ? "100%" : leftContentWidthPx,
          padding: isMobile ? "10px 20px 20px 20px" : `${28 * scale}px ${36 * scale}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: isMobile ? "flex-start" : "space-between"
        }}
      >
        <div>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: R.avatarTextGapPx * scale }}>
              <img
                src={getFullUrl(communityIcon)}
                style={{
                  width: R.avatarSizePx * scale,
                  height: R.avatarSizePx * scale,
                  borderRadius: 6 * scale,
                  objectFit: "cover"
                }}
                alt="icon"
              />
              <div style={{ fontSize: nameFontSize, fontWeight: 700, color: "#1C274C" }}>
                {communityName}
              </div>
            </div>
          )}

          <div style={{
            marginTop: isMobile ? "8px" : R.nameToTitleGapPx * scale,
            fontSize: isMobile ? "24px" : R.titleSizePx * scale,
            fontWeight: 800,
            lineHeight: 1.1,
            color: "#1C274C"
          }}>
            {bannerTitle}
          </div>

          <div style={{ 
            marginTop: "12px",
            fontSize: isMobile ? "16px" : R.descriptionSizePx * scale,
            lineHeight: 1.6,
            color: "#4A5568",
            display: "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : "3",
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {descriptionText}
          </div>
        </div>

        {/* Mobile Banner: Positioned between Description and Keywords */}
        {isMobile && (
          <div style={{ margin: "18px 0", borderRadius: "15px", overflow: "hidden", height: "200px" }}>
            <img
              src={getFullUrl(imageUrl)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt="banner"
            />
          </div>
        )}

        {/* Keywords: Pill shape, No # prefix, larger mobile font */}
        <div style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: isMobile ? "5px" : "20px"
        }}>
          {interestList.map((interest, idx) => (
            <span
              key={`${id}-int-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                onintrestClick?.(interest);
              }}
              style={{
                padding: isMobile ? "8px 16px" : `${8 * scale}px ${16 * scale}px`,
                background: "#F0F4F8",
                borderRadius: "100px",
                fontSize: isMobile ? "14px" : 14 * scale,
                color: "#1C274C",
                fontWeight: 600,
                border: "1px solid #D1D9E0",
                whiteSpace: "nowrap"
              }}
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Desktop Banner: Remains exactly as original design */}
      {!isMobile && (
        <div style={{ width: imageWidthPx, height: height, position: "relative" }}>
          <img
            src={getFullUrl(imageUrl)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt="banner"
          />
          <div style={{
            position: "absolute",
            top: R.membersTextPaddingPx * scale,
            right: R.membersTextPaddingPx * scale,
            fontSize: R.membersCountSizePx * scale,
            fontWeight: 800,
            color: "#fff",
            textShadow: "0 2px 8px rgba(0,0,0,0.4)"
          }}>
            {membersCountText}
          </div>
        </div>
      )}
    </div>
  );
}