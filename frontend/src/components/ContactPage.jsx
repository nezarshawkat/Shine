import React, { useState } from "react";
import API from "../api";

export default function ContactPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/support/public", { subject, message });
      setSubject("");
      setMessage("");
      setStatus("✅ Your message was sent. Shine support will get back to you soon.");
    } catch (error) {
      setStatus("⚠️ We could not send your message right now. Please try again.");
    }
  };

  // ---------- STYLES ----------
  const styles = {
    page: {
      minHeight: "100vh",
      padding: "2rem 1rem",
      paddingTop: 90,
      backgroundColor: "#f5f7ff",
      color: "#1C274C",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    container: {
      width: "100%",
      maxWidth: 760,
      backgroundColor: "#fff",
      padding: "2rem",
      borderRadius: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    },
    banner: {
      textAlign: "center",
      marginBottom: "1rem",
    },
    heading: {
      fontSize: "1.8rem",
      marginBottom: "0.5rem",
      fontWeight: 600,
    },
    subheading: {
      fontSize: "1rem",
      color: "#4b4b7d",
    },
    form: {
      display: "grid",
      gap: "1rem",
    },
    input: {
      padding: "0.85rem 1rem",
      borderRadius: 8,
      border: "1px solid #ddd",
      fontSize: "1rem",
      width: "100%",
      boxSizing: "border-box",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    },
    textarea: {
      padding: "0.85rem 1rem",
      borderRadius: 8,
      border: "1px solid #ddd",
      fontSize: "1rem",
      width: "100%",
      resize: "vertical",
      boxSizing: "border-box",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    },
    button: {
      width: "fit-content",
      padding: "0.75rem 1.5rem",
      backgroundColor: "#1C274C",
      color: "#fff",
      fontWeight: 600,
      fontSize: "1rem",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      transition: "background 0.2s",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    },
    status: {
      marginTop: 6,
      fontSize: "0.95rem",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.banner}>
          <h2 style={styles.heading}>Contact Shine Support</h2>
          <p style={styles.subheading}>
            Send a message directly to the Shine admin support team.
          </p>
        </section>

        <form onSubmit={submit} style={styles.form}>
          <input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            style={styles.input}
          />
          <textarea
            placeholder="How can we help you?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            style={styles.textarea}
          />
          <button
            type="submit"
            style={styles.button}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2f38b0")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1C274C")}
          >
            Send Message
          </button>
          {status && <p style={styles.status}>{status}</p>}
        </form>
      </div>
    </div>
  );
}