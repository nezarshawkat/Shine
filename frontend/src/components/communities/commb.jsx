import React, { useRef, useState, useEffect } from "react";
import { BASE_W, BASE_H, R, communityData } from "/workspaces/Shine/backend/models/commConfig.js";

export default function Commb({ feedWidth = BASE_W, onKeywordClick }) {
  const {
    communityIcon,
    communityName,
    bannerTitle,
    descriptionText,
    keywords,
    imageUrl,
    membersCountText,
    imageAvatars,
    memberReferenceText,
  } = communityData;

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

  // Resize community name
  useEffect(() => {
    const fitName = () => {
      const maxWidth = leftContentWidthPx - R.avatarSizePx * scale - R.avatarTextGapPx * scale;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let fontSize = R.communityNameSizePx * scale;
      ctx.font = `${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(communityName).width;
      setNameFontSize(textWidth > maxWidth * 2 ? fontSize * (maxWidth * 2 / textWidth) : fontSize);
    };
    fitName();
    window.addEventListener("resize", fitName);
    return () => window.removeEventListener("resize", fitName);
  }, [communityName, width]);

  // Check description overflow
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const check = () => setDescOverflow(el.scrollHeight > el.clientHeight + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [descriptionText, width, height]);

  // Dynamic text color based on image brightness
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < imgData.data.length; i += 4 * 50) {
        r += imgData.data[i];
        g += imgData.data[i + 1];
        b += imgData.data[i + 2];
        count++;
      }
      const brightness = ((r/count)*299 + (g/count)*587 + (b/count)*114)/1000;
      setMembersColor(brightness < 140 ? "#fff" : "#000");
    };
  }, [imageUrl]);

  // Styles
  const containerStyle = {
    width,
    maxWidth: "100%",
    height,
    display: "flex",
    justifyContent: "center",
    background: "#fff",
    borderRadius: 8 * scale,
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  };

  const leftStyle = {
    width: leftContentWidthPx,
    paddingLeft: R.leftPaddingPx * scale,
    paddingRight: 20 * scale,
    paddingTop: 20 * scale,
    paddingBottom: 20 * scale,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  const communityIconStyle = {
    width: R.avatarSizePx * scale,
    height: R.avatarSizePx * scale,
    borderRadius: 0,
    objectFit: "cover",
  };

  const descriptionStyle = {
    width: descriptionWidthPx,
    maxHeight: expanded ? "none" : descriptionHeightPx,
    overflow: "hidden",
    fontSize: R.descriptionSizePx * scale,
    lineHeight: 1.4,
    color: "#000",
    marginTop: R.titleToDescGapPx * scale,
  };

  const keywordsContainerStyle = {
    display: "flex",
    gap: 8 * scale,
    flexWrap: "wrap",
    marginTop: 10 * scale,
  };

  const renderOverlappingAvatars = () => {
    const smallAvatarSize = R.smallAvatarPx * scale;
    const overlapOffset = smallAvatarSize - R.smallAvatarGapPx * scale;
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          {imageAvatars.slice(0, 3).map((a, idx) => (
            <img
              key={idx}
              src={a}
              style={{
                width: smallAvatarSize,
                height: smallAvatarSize,
                borderRadius: "50%",
                border: "1px solid #000",
                marginLeft: idx === 0 ? 0 : -overlapOffset,
                objectFit: "cover",
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 14 * scale, fontWeight: 500, marginLeft: R.smallAvatarTextGapPx * scale, color: membersColor }}>
          {memberReferenceText}
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={leftStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: R.avatarTextGapPx * scale }}>
            <img src={communityIcon} style={communityIconStyle} />
            <div style={{ fontSize: nameFontSize, fontWeight: 500, lineHeight: 1.2, maxHeight: 2 * 1.2 * nameFontSize, overflow: "hidden" }}>
              {communityName}
            </div>
          </div>

          <div style={{ marginTop: R.nameToTitleGapPx * scale, fontSize: R.titleSizePx * scale, fontWeight: 600, lineHeight: 1.05 }}>
            {bannerTitle}
          </div>

          <div>
            <div ref={descRef} style={descriptionStyle}>
              {descriptionText}
            </div>
            {descOverflow && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                style={{
                  marginTop: 8 * scale,
                  background: "#FFD600",
                  border: "none",
                  padding: `${8 * scale}px ${12 * scale}px`,
                  borderRadius: 6 * scale,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14 * scale,
                }}
              >
                Read more
              </button>
            )}
          </div>
        </div>

        <div style={keywordsContainerStyle}>
          {keywords.map((k, idx) => (
            <button
              key={idx}
              onClick={() => onKeywordClick && onKeywordClick(k)}
              style={{
                padding: `${6 * scale}px ${12 * scale}px`,
                background: "#ECF2F6",
                border: "1px solid #1C274C",
                borderRadius: 0.5 * scale + "rem",
                fontSize: 14 * scale,
                color: "#1C274C",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: imageWidthPx, height, position: "relative" }}>
        <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: R.membersTextPaddingPx * scale, right: R.membersTextPaddingPx * scale, fontSize: R.membersCountSizePx * scale, fontWeight: 600, color: membersColor }}>
          {membersCountText}
        </div>
        <div style={{ position: "absolute", bottom: R.imageAvatarsBottomPadPx * scale, left: R.imageAvatarsLeftPadPx * scale }}>
          {renderOverlappingAvatars()}
        </div>
      </div>
    </div>
  );
}
