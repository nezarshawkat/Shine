import React, { useState } from "react";
import API from "../api";
import "../styles/LandingPage.css";

export default function ContactPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      await API.post("/support", { subject, message }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      setSubject("");
      setMessage("");
      setStatus("Your message was sent. Shine support will get back to you soon.");
    } catch (error) {
      setStatus("We could not send your message right now. Please try again.");
    }
  };

  return (
    <div className="landing-page" style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
      <section className="banner-hero" style={{ maxWidth: 760, margin: "0 auto" }}>
        <h2>Contact Shine Support</h2>
        <p>Send a message directly to the Shine admin support team.</p>
      </section>

      <form onSubmit={submit} className="banner-do" style={{ maxWidth: 760, margin: "1rem auto", display: "grid", gap: 10 }}>
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          style={{ padding: "0.85rem", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <textarea
          placeholder="How can we help you?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={8}
          style={{ padding: "0.85rem", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ width: "fit-content", padding: "0.7rem 1.2rem" }}>
          Send Message
        </button>
        {status && <p style={{ marginTop: 6 }}>{status}</p>}
      </form>
    </div>
  );
}
