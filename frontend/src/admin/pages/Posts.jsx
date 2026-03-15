import React from "react";
import ContentManager from "./ContentManager";

export default function Posts() {
  return <ContentManager resource="posts" title="Posts Management" columns={[{ key: "type", label: "Type" }, { key: "text", label: "Content" }, { key: "moderationStatus", label: "Status" }]} />;
}
