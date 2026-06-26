import React, { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../adminApi";

const tabs = ["POST", "COMMUNITY", "PROFILE"];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [type, setType] = useState("POST");

  const load = async () => {
    const { data } = await adminRequest("get", "/reports", null, { status: "OPEN" });
    setReports(data.data || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => reports.filter((r) => r.type === type), [reports, type]);

  const takeAction = async (report, action) => {
    const payload = { resolution: action === "ignore" ? "DISMISSED" : "RESOLVED", action };

    if (action === "deletePost") Object.assign(payload, { deleteType: "POST", deleteId: report.post?.id });
    if (action === "deleteCommunity") Object.assign(payload, { deleteType: "COMMUNITY", deleteId: report.community?.id });
    if (action === "banUser") Object.assign(payload, { blockUserId: report.profile?.id || report.post?.author?.id || report.community?.creator?.id });
    if (action === "warnOwner") Object.assign(payload, { warnOwnerId: report.community?.creator?.id });

    await adminRequest("patch", `/reports/${report.id}/resolve`, payload);
    load();
  };

  return (
    <section>
      <h2>Reports</h2>
      <div className="toolbar">
        {tabs.map((tab) => <button key={tab} onClick={() => setType(tab)}>{tab === "PROFILE" ? "Users" : `${tab.charAt(0)}${tab.slice(1).toLowerCase()}s`}</button>)}
      </div>
      <table className="admin-table">
        <thead><tr><th>Reported Item</th><th>Reporter</th><th>Reason</th><th>Timestamp</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>{r.post?.text || r.community?.name || r.profile?.username}</td>
              <td>{r.reporter?.username}</td>
              <td>{r.reason}</td>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td className="actions">
                {r.type === "POST" && <button onClick={() => takeAction(r, "deletePost")}>Delete Post</button>}
                {r.type === "COMMUNITY" && <button onClick={() => takeAction(r, "deleteCommunity")}>Delete Community</button>}
                {r.type === "COMMUNITY" && <button onClick={() => takeAction(r, "warnOwner")}>Warn Owner</button>}
                <button onClick={() => takeAction(r, "banUser")}>Ban User</button>
                <button onClick={() => takeAction(r, "ignore")}>Ignore</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
