import React from "react";
import ContentManager from "./ContentManager";

export default function Events() {
  return <ContentManager resource="events" title="Events Management" columns={[{ key: "title", label: "Title" }, { key: "date", label: "Date" }, { key: "moderationStatus", label: "Status" }]} />;
}
