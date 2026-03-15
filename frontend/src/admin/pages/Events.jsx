import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", communityId: "", date: "", location: "", mode: "OFFLINE", creatorId: "", image: "" });

  const load = async () => {
    const { data } = await adminRequest("get", "/events");
    setEvents(data.data || []);
  };

  useEffect(() => { load(); }, []);

  const createEvent = async () => {
    await adminRequest("post", "/events", form);
    setForm({ title: "", description: "", communityId: "", date: "", location: "", mode: "OFFLINE", creatorId: "", image: "" });
    load();
  };

  const remove = async (id) => { await adminRequest("delete", `/events/${id}`); load(); };

  return (
    <section>
      <h2>Events</h2>
      <div className="admin-card" style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <input placeholder="Community ID" value={form.communityId} onChange={(e) => setForm((f) => ({ ...f, communityId: e.target.value }))} />
        <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <input placeholder="Location (optional)" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}><option value="ONLINE">ONLINE</option><option value="OFFLINE">OFFLINE</option></select>
        <input placeholder="Creator User ID" value={form.creatorId} onChange={(e) => setForm((f) => ({ ...f, creatorId: e.target.value }))} />
        <button onClick={createEvent}>Create Event</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Title</th><th>Date</th><th>Community</th><th>Mode</th><th>Action</th></tr></thead>
        <tbody>
          {events.map((e) => <tr key={e.id}><td>{e.title}</td><td>{new Date(e.date).toLocaleString()}</td><td>{e.communityId || "-"}</td><td>{e.mode}</td><td><button className="danger" onClick={() => remove(e.id)}>Delete</button></td></tr>)}
        </tbody>
      </table>
    </section>
  );
}
