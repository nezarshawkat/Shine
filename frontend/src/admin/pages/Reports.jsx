import React, { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [type, setType] = useState("");

  const load = async () => {
    const { data } = await adminRequest("get", "/reports", null, { type: type || undefined, status: "OPEN" });
    setReports(data.data);
  };

  useEffect(() => { load(); }, [type]);

  const sections = useMemo(() => ({
    post: reports.filter((r) => r.type === "POST"),
    community: reports.filter((r) => r.type === "COMMUNITY"),
    profile: reports.filter((r) => r.type === "PROFILE"),
  }), [reports]);

  const resolve = async (report) => {
    await adminRequest("patch", `/reports/${report.id}/resolve`, { resolution: "RESOLVED", action: "resolved" });
    load();
  };

  return (
    <section>
      <h2>Reports</h2>
      <div className="toolbar">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All</option>
          <option value="post">Posts</option>
          <option value="community">Communities</option>
          <option value="profile">Profiles</option>
        </select>
      </div>
      {Object.entries(sections).map(([key, list]) => (
        <div key={key}>
          <h3>Reports on {key}s</h3>
          <table className="admin-table">
            <thead><tr><th>Reporter</th><th>Reason</th><th>Related content</th><th>Action</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.reporter?.username}</td>
                  <td>{r.reason}</td>
                  <td>{r.post?.text || r.community?.name || r.profile?.username}</td>
                  <td><button onClick={() => resolve(r)}>Resolve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p>Articles are intentionally excluded from report workflows.</p>
    </section>
  );
}
