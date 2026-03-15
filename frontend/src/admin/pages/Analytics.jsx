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
        {Object.entries(analytics?.overview || {}).map(([key, value]) => (
          <div className="metric-card" key={key}><span>{key}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="chart-grid">
        <div className="admin-card"><h3>Platform Growth</h3><p>DAU: {analytics?.growth?.dailyActiveUsers}</p><p>WAU: {analytics?.growth?.weeklyActiveUsers}</p></div>
        <div className="admin-card"><h3>Engagement</h3><p>Avg posts/user: {analytics?.engagement?.averagePostsPerUser}</p><p>Comments/post: {analytics?.engagement?.commentsPerPost}</p><p>Poll participation: {analytics?.engagement?.pollParticipation}</p></div>
      </div>
      <div className="chart-grid">
        <div className="admin-card"><h3>Trending Keywords</h3>{(analytics?.trending?.keywords || []).map((k) => <p key={k.keyword}>{k.keyword}: {k.count}</p>)}</div>
        <div className="admin-card"><h3>Trending Hashtags</h3>{(analytics?.trending?.hashtags || []).map((k) => <p key={k.hashtag}>{k.hashtag}: {k.count}</p>)}</div>
      </div>
      <div className="admin-card">
        <h3>Posts and Reports per Day</h3>
        <table className="admin-table"><thead><tr><th>Day</th><th>Posts</th><th>Reports</th></tr></thead><tbody>{(analytics?.contentMetrics?.postsPerDay || []).map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.posts}</td><td>{d.reports}</td></tr>)}</tbody></table>
      </div>
    </section>
  );
}
