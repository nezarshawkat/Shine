import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    adminRequest("get", "/analytics").then((res) => setAnalytics(res.data.data));
  }, []);

  return (
    <section>
      <h2>Analytics</h2>
      <div className="cards-grid">
        {Object.entries(analytics?.cards || {}).map(([key, value]) => (
          <div className="metric-card" key={key}><span>{key}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="chart-grid">
        <div className="admin-card">
          <h3>Trending Keywords</h3>
          {(analytics?.keywords || []).map((item) => <p key={item.keyword}>{item.keyword}: {item.count}</p>)}
        </div>
        <div className="admin-card">
          <h3>Trending Hashtags</h3>
          {(analytics?.hashtags || []).map((item) => <p key={item.hashtag}>{item.hashtag}: {item.count}</p>)}
        </div>
      </div>
      <div className="admin-card">
        <h3>Nested Trend Timeline</h3>
        <table className="admin-table">
          <thead><tr><th>Bucket</th><th>Engagement</th><th>Trend of trends</th></tr></thead>
          <tbody>
            {(analytics?.trendsOverTime || []).map((t) => (
              <tr key={t.bucket}><td>{t.bucket}</td><td>{t.engagement}</td><td>{t.nestedTrend}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
