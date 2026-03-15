import React, { useEffect, useState } from "react";
import adminApi from "../adminApi";

const types = ["POST", "COMMUNITY", "PROFILE"];

export default function Reports() {
  const [type, setType] = useState("");
  const [reports, setReports] = useState([]);

  const load = () => adminApi.get("/reports", { params: type ? { type } : {} }).then((res) => setReports(res.data.reports || []));
  useEffect(() => { load(); }, [type]);

  const resolve = async (id) => {
    await adminApi.patch(`/reports/${id}/resolve`, { actionTaken: "resolved_from_dashboard" });
    load();
  };

  return (
    <div>
      <h2>Reports Center</h2>
      <div className="toolbar">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All report types</option>
          {types.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="admin-grid two">
        {types.map((section) => (
          <section key={section} className="admin-card">
            <h3>{section.toLowerCase()} reports</h3>
            {reports.filter((r) => r.type === section).map((r) => (
              <div className="row-item" key={r.id}>
                <strong>{r.reason}</strong>
                <span>Reporter: {r.reporter?.username || r.reporter?.email}</span>
                <span>Target: {r.targetType} #{r.targetId.slice(0, 8)}</span>
                <button className="admin-btn" onClick={() => resolve(r.id)}>Resolve</button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
