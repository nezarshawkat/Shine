import React, { useEffect, useState, useRef } from "react";
import Header from "./Header";
import axios from "axios";
import "/workspaces/Shine/frontend/src/styles/events.css";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [textColor, setTextColor] = useState("dark-text");
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef(null);

  /* ======================================
     FETCH EVENTS
  ====================================== */
  useEffect(() => {
    axios
      .get("https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api/events")
      .then((res) => {
        const data = res?.data?.data;

        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
        setEvents([]);
      });
  }, []);

  const activeEvent =
    events.length > 0 ? events[activeIndex % events.length] : null;

  /* ======================================
     IMAGE TEXT COLOR DETECTION
  ====================================== */
  useEffect(() => {
    if (!activeEvent || !activeEvent.image) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = activeEvent.image;

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

  /* ======================================
     AUTO SLIDESHOW
  ====================================== */
  useEffect(() => {
    if (!isPlaying || events.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length);
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, events.length]);

  /* ======================================
     EMPTY STATE (TOP CENTER FIXED)
  ====================================== */
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

  /* ======================================
     MAIN UI
  ====================================== */
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
        style={{
          backgroundImage: `url(${activeEvent.image})`,
        }}
      >
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
            <button className="btn-primary">Participate</button>
            <span className="contact-text">Contact for info.</span>
          </div>
        </div>
      </div>
    </div>
  );
}