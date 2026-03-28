import React from "react";
import { Navigate, useParams } from "react-router-dom";

const allowedTypes = new Set(["post", "article", "community", "event", "profile"]);

export default function ShareRedirect() {
  const { type, id } = useParams();

  if (!id || !allowedTypes.has(type)) {
    return <Navigate to="/" replace />;
  }

  const destination = type === "event" ? `/events/${id}` : `/${type}/${id}`;
  return <Navigate to={destination} replace />;
}
