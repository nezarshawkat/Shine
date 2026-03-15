import React, { useEffect, useState } from "react";
import adminApi from "../adminApi";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.get("/dashboard").then((res) => setData(res.data)).catch(() => setData({ summary: {} }));
  }, []);

  const cards = data?.summary
    ? [
        ["Total Users", data.summary.totalUsers],
        ["Active Users", data.summary.activeUsers],
        ["Blocked Users", data.summary.blockedUsers],
        ["Total Posts", data.summary.totalPosts],
        ["Open Reports", data.summary.openReports],
      ]
    : [];

  return (
    <div>
      <h2>Overview Dashboard</h2>
      <div className="admin-grid cards">
        {cards.map(([label, value]) => (
          <div key={label} className="admin-card metric">
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
          </div>
        ))}
      </div>
      <div className="admin-grid two">
        <section className="admin-card">
          <h3>Recent Reports</h3>
          {(data?.recentReports || []).map((report) => (
            <div key={report.id} className="row-item">
              <strong>{report.type}</strong>
              <span>{report.reason}</span>
              <small>{report.reporter?.username || report.reporter?.email}</small>
            </div>
          ))}
        </section>
        <section className="admin-card">
          <h3>Trending Posts</h3>
          {(data?.trendingPosts || []).map((item) => (
            <div key={item.id} className="row-item"><strong>{item.metricLabel}</strong><span>{item.metricValue}</span></div>
          ))}
          <h3 style={{ marginTop: 16 }}>Trending Communities</h3>
          {(data?.trendingCommunities || []).map((item) => (
            <div key={item.id} className="row-item"><strong>{item.metricLabel}</strong><span>{item.metricValue}</span></div>
          ))}
        </section>
      </div>
    </div>
  );
}
