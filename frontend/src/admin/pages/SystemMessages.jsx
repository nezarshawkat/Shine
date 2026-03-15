import React, { useState } from "react";
import { adminRequest } from "../adminApi";

const filters = ["all", "community", "following", "notFollowingAnyone", "notInCommunity", "newUsers", "inactiveUsers", "selected"];

export default function SystemMessages() {
  const [form, setForm] = useState({ title: "", message: "", link: "", filter: "all", communityId: "", userId: "", userIds: "" });
  const [result, setResult] = useState(null);

  const submit = async () => {
    const payload = {
      ...form,
      userIds: form.userIds ? form.userIds.split(",").map((i) => i.trim()).filter(Boolean) : [],
    };
    const { data } = await adminRequest("post", "/messages/system", payload);
    setResult(data.data);
  };

  return (
    <section>
      <h2>System Notifications</h2>
      <div className="admin-card" style={{ display: "grid", gap: 10 }}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <textarea placeholder="Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={5} />
        <input placeholder="Optional link" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
        <select value={form.filter} onChange={(e) => setForm((f) => ({ ...f, filter: e.target.value }))}>
          {filters.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input placeholder="Community ID (for community filter)" value={form.communityId} onChange={(e) => setForm((f) => ({ ...f, communityId: e.target.value }))} />
        <input placeholder="User ID (for following filter)" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
        <input placeholder="Comma separated user IDs (selected filter)" value={form.userIds} onChange={(e) => setForm((f) => ({ ...f, userIds: e.target.value }))} />
        <button onClick={submit}>Send</button>
        {result && <p>Message sent to {result.recipients} users.</p>}
      </div>
    </section>
  );
}
