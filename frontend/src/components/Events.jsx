import React, { useEffect, useState, useRef } from "react";
import Header from "./Header";
import axios from "axios";
import "/workspaces/Shine/frontend/src/styles/events.css";
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
        const data = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
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
    if (!activeEvent || !activeEvent.image || isVideoMedia(activeEvent.image)) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = buildMediaUrl(activeEvent.image);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      let colorSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        colorSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }

      const brightness = colorSum / (img.width * img.height);
      setTextColor(brightness > 127 ? "dark-text" : "light-text");
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
          <h4 className="events-empty-text">
            There are no events right now
          </h4>
        </div>
      </div>
    );
  }

  if (!activeEvent) return <div>Loading events...</div>;

  const mediaUrl = buildMediaUrl(activeEvent.image);
  const activeIsVideo = isVideoMedia(activeEvent.image);

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

      <div
        className="event-banner"
        style={!activeIsVideo ? { backgroundImage: `url(${mediaUrl})` } : undefined}
      >
        {activeIsVideo && (
          <video
            key={mediaUrl}
            className="event-banner-media"
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        )}

        <button
          className="slideshow-toggle"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? "⏸️" : "▶️"}
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
            <button className="btn-primary" onClick={handleParticipate}>Participate</button>
            <span className="contact-text">Contact for info.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
