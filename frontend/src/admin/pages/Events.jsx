import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";
import API, { buildMediaUrl } from "../../api";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", actionType: "MESSAGE", detailsMessage: "", externalLink: "", image: "" });
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await adminRequest("get", "/events");
    setEvents(data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, image: "" }));
      setImagePreview("");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("media", file);
      const { data } = await API.post("/upload/event-media", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const mediaPath = data.media || data.image || "";
      setForm((f) => ({ ...f, image: mediaPath }));
      setImagePreview(buildMediaUrl(mediaPath));
    } catch (err) {
      setError(err?.response?.data?.error || "Media upload failed");
      setForm((f) => ({ ...f, image: "" }));
      setImagePreview("");
    } finally {
      setUploading(false);
    }
  };

  const createEvent = async () => {
    const missingAction = form.actionType === "LINK" ? !form.externalLink : !form.detailsMessage;
    if (!form.title || !form.description || missingAction || !form.image || uploading) {
      return;
    }

    setError("");
    await adminRequest("post", "/events", form);
    setForm({ title: "", description: "", actionType: "MESSAGE", detailsMessage: "", externalLink: "", image: "" });
    setImagePreview("");
    load();
  };

  const remove = async (id) => {
    await adminRequest("delete", `/events/${id}`);
    load();
  };

  return (
    <section>
      <h2>Events</h2>
      <div
        className="admin-card"
        style={{ display: "grid", gap: 8, marginBottom: 14 }}
      >
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <label style={{ fontWeight: 600 }}>Participation action</label>
        <select
          value={form.actionType}
          onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}
        >
          <option value="MESSAGE">Send a Messenger notification</option>
          <option value="LINK">Open an external link</option>
        </select>
        {form.actionType === "MESSAGE" ? (
          <textarea
            placeholder="Details message sent automatically to participants"
            value={form.detailsMessage}
            onChange={(e) => setForm((f) => ({ ...f, detailsMessage: e.target.value }))}
          />
        ) : (
          <input
            type="url"
            placeholder="https://example.com/register"
            value={form.externalLink}
            onChange={(e) => setForm((f) => ({ ...f, externalLink: e.target.value }))}
          />
        )}
        <label style={{ fontWeight: 600 }}>Upload Event Image or Video</label>
        <input type="file" accept="image/*,video/*" onChange={onFileChange} />
        <input
          placeholder="Or paste image/video URL"
          value={form.image.startsWith("data:") ? "" : form.image}
          onChange={(e) => {
            setForm((f) => ({ ...f, image: e.target.value }));
            setImagePreview(e.target.value);
          }}
        />
        {imagePreview && (
          imagePreview.match(/\.(mp4|webm|ogg)$/i) ? (
            <video src={imagePreview} controls style={{ maxWidth: 260, borderRadius: 8 }} />
          ) : (
            <img src={imagePreview} alt="Event preview" style={{ maxWidth: 260, borderRadius: 8 }} />
          )
        )}
        {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        <button
          onClick={createEvent}
          disabled={
            !form.title || !form.description || !form.image || uploading ||
            (form.actionType === "MESSAGE" ? !form.detailsMessage : !form.externalLink)
          }
        >
          {uploading ? "Uploading media..." : "Create Event"}
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Title</th>
            <th>Description</th>
            <th>Action</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((eventItem) => (
            <tr key={eventItem.id}>
              <td>
                {eventItem.image ? (
                  (eventItem.image.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                    src={
                      buildMediaUrl(eventItem.image)
                    }
                    style={{
                      width: 72,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                    controls
                  />
                  ) : (
                  <img
                    src={
                      buildMediaUrl(eventItem.image)
                    }
                    style={{
                      width: 72,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                  ))
                ) : (
                  "-"
                )}
              </td>
              <td>{eventItem.title}</td>
              <td>{eventItem.description}</td>
              <td style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                {eventItem.actionType === "LINK" ? eventItem.externalLink : eventItem.detailsMessage || "-"}
              </td>
              <td style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    const isLink = eventItem.actionType === "LINK";
                    const nextValue = window.prompt(
                      isLink ? "Edit external participation link" : "Edit participation details message",
                      isLink ? eventItem.externalLink || "" : eventItem.detailsMessage || ""
                    );
                    if (nextValue === null) return;
                    await adminRequest("put", `/events/${eventItem.id}`, isLink ? { externalLink: nextValue } : { detailsMessage: nextValue });
                    load();
                  }}
                >
                  Edit Action
                </button>
                <button className="danger" onClick={() => remove(eventItem.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={5}>No events found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
