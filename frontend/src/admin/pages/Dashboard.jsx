import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminRequest("get", "/dashboard").then((res) => setData(res.data.data));
  }, []);

  const cards = data?.analytics?.overview || {};

  return (
    <section>
      <h2>Dashboard Overview</h2>
      <div className="cards-grid">
        {Object.entries(cards).map(([key, value]) => (
          <div className="metric-card" key={key}>
            <span>{key}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <div className="admin-card">
          <h3>Recent Reports</h3>
          {(data?.recentReports || []).map((r) => <p key={r.id}>{r.type} • {r.reason}</p>)}
        </div>
        <div className="admin-card">
          <h3>Recent Users</h3>
          {(data?.recentUsers || []).map((u) => <p key={u.id}>{u.username}</p>)}
        </div>
        <div className="admin-card">
          <h3>Recent Posts</h3>
          {(data?.recentPosts || []).map((p) => <p key={p.id}>{String(p.text || "").slice(0, 60)}</p>)}
        </div>
        <div className="admin-card">
          <h3>Recent Communities</h3>
          {(data?.recentCommunities || []).map((c) => <p key={c.id}>{c.name}</p>)}
        </div>
      </div>
    </section>
  );
}
