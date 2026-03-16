import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";
import API, { BACKEND_URL } from "../../api";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", image: "" });
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
      fd.append("image", file);
      const { data } = await API.post("/upload/event-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, image: data.image || "" }));
      setImagePreview(data.image ? `${BACKEND_URL}${data.image}` : "");
    } catch (err) {
      setError(err?.response?.data?.error || "Image upload failed");
      setForm((f) => ({ ...f, image: "" }));
      setImagePreview("");
    } finally {
      setUploading(false);
    }
  };

  const createEvent = async () => {
    if (!form.title || !form.description || !form.image || uploading) {
      return;
    }

    setError("");
    await adminRequest("post", "/events", form);
    setForm({ title: "", description: "", image: "" });
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
        <label style={{ fontWeight: 600 }}>Upload Event Image</label>
        <input type="file" accept="image/*" onChange={onFileChange} />
        <input
          placeholder="Or paste image URL"
          value={form.image.startsWith("data:") ? "" : form.image}
          onChange={(e) => {
            setForm((f) => ({ ...f, image: e.target.value }));
            setImagePreview(e.target.value);
          }}
        />
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Event preview"
            style={{ maxWidth: 260, borderRadius: 8 }}
          />
        )}
        {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        <button
          onClick={createEvent}
          disabled={
            !form.title || !form.description || !form.image || uploading
          }
        >
          {uploading ? "Uploading image..." : "Create Event"}
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Title</th>
            <th>Description</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((eventItem) => (
            <tr key={eventItem.id}>
              <td>
                {eventItem.image ? (
                  <img
                    src={
                      eventItem.image.startsWith("http")
                        ? eventItem.image
                        : `${BACKEND_URL}${eventItem.image}`
                    }
                    alt={eventItem.title}
                    style={{
                      width: 72,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  "-"
                )}
              </td>
              <td>{eventItem.title}</td>
              <td>{eventItem.description}</td>
              <td>
                <button className="danger" onClick={() => remove(eventItem.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={4}>No events found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
