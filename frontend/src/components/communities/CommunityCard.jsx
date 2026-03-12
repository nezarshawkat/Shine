import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import { BASE_W, BASE_H, R } from "/workspaces/Shine/backend/models/commConfig.js";

const ASSET_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev";

export default function CommunityCard({ community, feedWidth = BASE_W, onintrestClick }) {
  const navigate = useNavigate();
  
  // Destructure dynamic data
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

  // Accept interests from any backend naming
  const rawInterests = intrests ?? interests ?? keywords ?? [];

  const getFullUrl = (path) => {
    if (!path) return "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600";
    return path.startsWith("http") ? path : `${ASSET_URL}${path}`;
  };

  const width = feedWidth;
  const scale = width / BASE_W;
  const height = BASE_H * scale;
  const imageWidthPx = width * R.imageWidthRatio;
  const leftContentWidthPx = width - imageWidthPx;

  const descriptionWidthPx = (R.descriptionWidthPx / BASE_W) * width;
  const descriptionHeightPx = (R.descriptionHeightPx / BASE_H) * height;

  const descRef = useRef(null);
  const [descOverflow, setDescOverflow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nameFontSize, setNameFontSize] = useState(R.communityNameSizePx * scale);
  const [membersColor, setMembersColor] = useState("#000");

  // Normalize interests
  const interestList = Array.isArray(rawInterests)
    ? rawInterests
    : typeof rawInterests === "string"
      ? rawInterests.split(",").map(k => k.trim()).filter(Boolean)
      : [];

  useEffect(() => {
    const fitName = () => {
      const maxWidth = leftContentWidthPx - R.avatarSizePx * scale - R.avatarTextGapPx * scale;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let fontSize = R.communityNameSizePx * scale;
      ctx.font = `${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(communityName || "").width;
      setNameFontSize(textWidth > maxWidth * 2 ? fontSize * (maxWidth * 2 / textWidth) : fontSize);
    };
    fitName();
  }, [communityName, width, leftContentWidthPx, scale]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflow(el.scrollHeight > el.clientHeight + 1);
  }, [descriptionText, width, height]);

  useEffect(() => {
    const finalUrl = getFullUrl(imageUrl);
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.src = finalUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 10; canvas.height = 10;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 10, 10);
      try {
        const data = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i+1]; b += data[i+2];
        }
        const avg = ((r/25)*299 + (g/25)*587 + (b/25)*114)/1000;
        setMembersColor(avg < 140 ? "#fff" : "#000");
      } catch (e) {
        setMembersColor("#000");
      }
    };
  }, [imageUrl]);

  const renderOverlappingAvatars = () => {
    const smallAvatarSize = R.smallAvatarPx * scale;
    const overlapOffset = smallAvatarSize - R.smallAvatarGapPx * scale;
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          {imageAvatars.slice(0, 3).map((a, idx) => (
            <img
              key={idx}
              src={getFullUrl(a)}
              style={{
                width: smallAvatarSize,
                height: smallAvatarSize,
                borderRadius: "50%",
                border: `1px solid ${membersColor}`,
                marginLeft: idx === 0 ? 0 : -overlapOffset,
                objectFit: "cover",
                background: "#eee"
              }}
              alt=""
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 14 * scale,
            fontWeight: 500,
            marginLeft: R.smallAvatarTextGapPx * scale,
            color: membersColor
          }}
        >
          {memberReferenceText}
        </div>
      </div>
    );
  };

  // Main Navigation Handler
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
        background: "#fff",
        borderRadius: 12 * scale,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        marginBottom: "24px",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      }}
    >
      {/* Left Content Section */}
      <div
        style={{
          width: leftContentWidthPx,
          padding: `${28 * scale}px ${36 * scale}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
          {/* Icon + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: R.avatarTextGapPx * scale }}>
            <img
              src={getFullUrl(communityIcon)}
              style={{
                width: R.avatarSizePx * scale,
                height: R.avatarSizePx * scale,
                borderRadius: 6 * scale,
                objectFit: "cover",
                background: "#f0f0f0"
              }}
              alt="icon"
            />
            <div style={{ fontSize: nameFontSize, fontWeight: 700, color: "#1C274C" }}>
              {communityName}
            </div>
          </div>

          {/* Slogan */}
          <div
            style={{
              marginTop: R.nameToTitleGapPx * scale,
              fontSize: R.titleSizePx * scale,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#1C274C"
            }}
          >
            {bannerTitle}
          </div>

          {/* Description */}
          <div style={{ marginTop: R.titleToDescGapPx * scale }}>
            <div
              ref={descRef}
              style={{
                width: descriptionWidthPx,
                maxHeight: expanded ? "none" : descriptionHeightPx,
                overflow: "hidden",
                fontSize: R.descriptionSizePx * scale,
                lineHeight: 1.6,
                color: "#4A5568"
              }}
            >
              {descriptionText}
            </div>

            {descOverflow && !expanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
                style={{
                  marginTop: 8 * scale,
                  background: "#FFD600",
                  border: "none",
                  padding: `${6 * scale}px ${12 * scale}px`,
                  borderRadius: 6 * scale,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13 * scale,
                  color: "#1C274C"
                }}
              >
                Show More
              </button>
            )}
          </div>
        </div>

        {/* Interests */}
        <div
          style={{
            display: "flex",
            gap: 10 * scale,
            flexWrap: "wrap",
            marginTop: 20 * scale
          }}
        >
          {interestList.map((interest, idx) => (
            <button
              key={`${id}-int-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                onintrestClick?.(interest);
              }}
              style={{
                padding: `${8 * scale}px ${16 * scale}px`,
                background: "#ECF2F6",
                border: `1.5px solid #1C274C`,
                borderRadius: "1px",
                fontSize: 14 * scale,
                cursor: "pointer",
                color: "#1C274C",
                fontWeight: 600,
                zIndex: 2
              }}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Right Banner */}
      <div style={{ width: imageWidthPx, height, position: "relative" }}>
        <img
          src={getFullUrl(imageUrl)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          alt="banner"
        />

        <div
          style={{
            position: "absolute",
            top: R.membersTextPaddingPx * scale,
            right: R.membersTextPaddingPx * scale,
            fontSize: R.membersCountSizePx * scale,
            fontWeight: 800,
            color: membersColor,
            textShadow:
              membersColor === "#fff"
                ? "0 2px 8px rgba(0,0,0,0.4)"
                : "none"
          }}
        >
          {membersCountText}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: R.imageAvatarsBottomPadPx * scale,
            left: R.imageAvatarsLeftPadPx * scale
          }}
        >
          {renderOverlappingAvatars()}
        </div>
      </div>
    </div>
  );
}
