import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Support() {
  const [items, setItems] = useState([]);
  const [reply, setReply] = useState({});

  const load = async () => {
    const { data } = await adminRequest("get", "/support");
    setItems(data.data || []);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    await adminRequest("patch", `/support/${id}`, { reply: reply[id], status: "RESOLVED" });
    load();
  };

  return (
    <section>
      <h2>Support / Contacts</h2>
      <table className="admin-table">
        <thead><tr><th>User</th><th>Subject</th><th>Message</th><th>Status</th><th>Reply</th><th>Action</th></tr></thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.user?.username}</td><td>{row.subject}</td><td>{row.message}</td><td>{row.status}</td>
              <td><input value={reply[row.id] || ""} onChange={(e) => setReply((prev) => ({ ...prev, [row.id]: e.target.value }))} /></td>
              <td><button onClick={() => resolve(row.id)}>Mark Resolved</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
