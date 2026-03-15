import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminRequest("get", "/dashboard").then((res) => setData(res.data.data));
  }, []);

  const cards = data?.analytics?.cards || {};

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
      <h3>Recent Reports</h3>
      <table className="admin-table">
        <thead><tr><th>Type</th><th>Reason</th><th>Reporter</th><th>Status</th></tr></thead>
        <tbody>
          {(data?.recentReports || []).map((report) => (
            <tr key={report.id}>
              <td>{report.type}</td><td>{report.reason}</td><td>{report.reporter?.username}</td><td>{report.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
