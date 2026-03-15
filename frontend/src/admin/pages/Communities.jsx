import React from "react";
import ContentManager from "./ContentManager";

export default function Communities() {
  return <ContentManager resource="communities" title="Communities Management" columns={[{ key: "name", label: "Name" }, { key: "status", label: "Privacy" }, { key: "moderationStatus", label: "Status" }]} />;
}
