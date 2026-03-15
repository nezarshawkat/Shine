import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", image: "" });
  const [imagePreview, setImagePreview] = useState("");

  const load = async () => {
    const { data } = await adminRequest("get", "/events");
    setEvents(data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, image: "" }));
      setImagePreview("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((f) => ({ ...f, image: result }));
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const createEvent = async () => {
    if (!form.title || !form.description || !form.image) {
      return;
    }

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
      <div className="admin-card" style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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
        {imagePreview && <img src={imagePreview} alt="Event preview" style={{ maxWidth: 260, borderRadius: 8 }} />}
        <button onClick={createEvent} disabled={!form.title || !form.description || !form.image}>Create Event</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Image</th><th>Title</th><th>Description</th><th>Action</th></tr></thead>
        <tbody>
          {events.map((eventItem) => (
            <tr key={eventItem.id}>
              <td>{eventItem.image ? <img src={eventItem.image} alt={eventItem.title} style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6 }} /> : "-"}</td>
              <td>{eventItem.title}</td>
              <td>{eventItem.description}</td>
              <td><button className="danger" onClick={() => remove(eventItem.id)}>Delete</button></td>
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
