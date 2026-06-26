import React, { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../adminApi";

const STATUS_OPTIONS = ["PENDING", "ACCEPTED", "DECLINED"];

export default function ArticleApplications() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selected) || null,
    [items, selected]
  );

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await adminRequest("get", "/article-applications", null, { status });
      setItems(data.data || []);
      if (selected && !data.data?.find((item) => item.id === selected)) {
        setSelected(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const review = async (id, action) => {
    await adminRequest("patch", `/article-applications/${id}`, { action });
    await load();
  };

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2>Article Applications</h2>

      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button onClick={load}>Refresh</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(420px, 1.5fr)", gap: 12 }}>
        <div className="admin-card" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  style={{ cursor: "pointer", background: selected === item.id ? "#eff6ff" : "transparent" }}
                >
                  <td>{item.user?.name || item.user?.username || "Unknown"}</td>
                  <td>{item.status}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && items.length === 0 ? <p style={{ marginTop: 10 }}>No applications found.</p> : null}
        </div>

        <div className="admin-card" style={{ display: "grid", gap: 10 }}>
          {!selectedItem ? (
            <p>Select an application to view details.</p>
          ) : (
            <>
              <h3 style={{ margin: 0 }}>Application Details</h3>
              <p><strong>Name:</strong> {selectedItem.user?.name || "-"}</p>
              <p><strong>Username:</strong> {selectedItem.user?.username || "-"}</p>
              <p><strong>Email:</strong> {selectedItem.user?.email || "-"}</p>
              <p><strong>Status:</strong> {selectedItem.status}</p>

              <div>
                <strong>Introduction</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{selectedItem.introduction}</p>
              </div>

              <div>
                <strong>Work Sample</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{selectedItem.workSample}</p>
              </div>

              <div>
                <strong>Social Link</strong>
                <p>
                  <a href={selectedItem.socialLink} target="_blank" rel="noreferrer">
                    {selectedItem.socialLink}
                  </a>
                </p>
              </div>

              <div className="actions">
                <button onClick={() => review(selectedItem.id, "accept")}>Accept</button>
                <button className="danger" onClick={() => review(selectedItem.id, "decline")}>Decline</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
