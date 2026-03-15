import React, { useEffect, useState } from "react";
import adminApi from "../adminApi";

function TrendBars({ items = [] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="trend-bars">
      {items.slice(0, 8).map((item) => (
        <div key={`${item.key}-${item.label}`} className="trend-row">
          <label>{item.label}</label>
          <div className="bar"><span style={{ width: `${(item.value / max) * 100}%` }} /></div>
          <em>{Math.round(item.value)}</em>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState({ grouped: {} });
  useEffect(() => { adminApi.get("/analytics").then((res) => setData(res.data)); }, []);

  return (
    <div>
      <h2>Analytics & Trends</h2>
      <div className="admin-grid two">
        {Object.entries(data.grouped || {}).map(([group, items]) => (
          <section className="admin-card" key={group}>
            <h3>{group.replaceAll("_", " ")}</h3>
            <TrendBars items={items} />
          </section>
        ))}
      </div>
    </div>
  );
}
