import React, { useEffect, useState, useRef } from "react";
import Header from "./Header";
import axios from "axios";
import "../styles/events.css";
import { API_BASE_URL, buildMediaUrl } from "../api";

const isVideoMedia = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

export default function Events() {
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [textColor, setTextColor] = useState("dark-text");
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/events`)
      .then((res) => {
        const data = Array.isArray(res?.data?.data) 
          ? res.data.data 
          : Array.isArray(res?.data) 
          ? res.data 
          : [];
        setEvents(data);
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
        setEvents([]);
      });
  }, []);

  const activeEvent = events.length > 0 ? events[activeIndex % events.length] : null;

  const handleParticipate = async () => {
    if (!activeEvent?.id) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to participate in events.");
        return;
      }

      const res = await axios.post(
        `${API_BASE_URL}/events/${activeEvent.id}/participate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.alreadyParticipating) {
        alert("You have already requested participation details for this event.");
      } else {
        alert("Participation confirmed. Event details were sent to your notifications.");
      }
    } catch (err) {
      console.error("Event participation failed:", err);
      alert("We could not submit your participation right now. Please try again.");
    }
  };

  useEffect(() => {
    const activeMedia = activeEvent?.image || activeEvent?.imageUrl || activeEvent?.media;
    
    // Skip if no media or if it's a video (canvas can't easily analyze video brightness this way)
    if (!activeEvent || !activeMedia || isVideoMedia(activeMedia)) {
        setTextColor("dark-text"); // Default fallback
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = buildMediaUrl(activeMedia);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
        let colorSum = 0;

        for (let i = 0; i < imageData.length; i += 4) {
          colorSum += (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
        }

        const brightness = colorSum / (img.width * img.height);
        // If brightness is high (light background), use dark text. Otherwise light text.
        setTextColor(brightness > 127 ? "dark-text" : "light-text");
      } catch (err) {
        console.error("Brightness detection failed", err);
        setTextColor("dark-text");
      }
    };
  }, [activeEvent]);

  useEffect(() => {
    if (!isPlaying || events.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length);
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, events.length]);

  if (events.length === 0) {
    return (
      <div className="events-page">
        <Header />
        <div className="events-empty-wrapper">
          <h4 className="events-empty-text">There are no events right now</h4>
        </div>
      </div>
    );
  }

  if (!activeEvent) return <div>Loading events...</div>;

  const activeMedia = activeEvent.image || activeEvent.imageUrl || activeEvent.media || "";
  const mediaUrl = buildMediaUrl(activeMedia);
  const activeIsVideo = isVideoMedia(activeMedia);

  return (
    <div className="events-page">
      <Header />

      <div className="events-intro">
        <h1>Check the upcoming events</h1>
        <p>
          Participate and become a part of these events to help people, learn,
          and think differently.
        </p>
      </div>

      <div className="event-banner">
        {!activeIsVideo && activeMedia && (
          <img
            src={mediaUrl}
            alt={activeEvent.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        )}

        {activeIsVideo && (
          <video
            key={mediaUrl}
            className="event-banner-media"
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                top: 0,
                left: 0,
              }}
          />
        )}

        <button
          className="slideshow-toggle"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? "停" : "▶️"}
        </button>

        <div className="event-dots-vertical">
          {events.map((_, i) => (
            <span
              key={i}
              className={`dot ${i === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>

        <div className={`event-content ${textColor}`}>
          <h2>{activeEvent.title}</h2>
          <p>{activeEvent.description}</p>
        </div>

        <div className="event-footer">
          <span className="info-text">
            * Participation info will be sent to you after pressing this button
          </span>

          <div className="event-actions">
            <button className="btn-primary" onClick={handleParticipate}>
              Participate
            </button>
            <span className="contact-text">Contact for info.</span>
          </div>
        </div>
      </div>
    </div>
  );
}