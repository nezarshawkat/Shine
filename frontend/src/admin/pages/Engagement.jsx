import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function Engagement() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState(null);

  async function load() {
    try {
      const res = await adminRequest("get", "/engagement");
      setData(res.data.data);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load engagement status");
    }
  }

  async function action(path, after) {
    setBusy(true);
    try {
      const res = await adminRequest("post", path);
      if (after) after(res.data?.data);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="admin-card">
        <h2>Engagement</h2>
        {error && <p className="error-text">{error}</p>}
        <p><strong>Running:</strong> {data?.running ? "Yes" : "No"}</p>
        <p><strong>Admin paused:</strong> {data?.state?.adminStopped ? "Yes" : "No"}</p>
        <p><strong>Mode:</strong> {data?.config?.mode || "-"}</p>
        <p><strong>Pool:</strong> {data?.config?.engagementPool || "-"}</p>
        <p><strong>Comments:</strong> OpenAI only for a small number of related comments. Views, likes and shares use seeded accounts without AI.</p>
        <p><strong>Interval:</strong> {data?.config?.intervalMs || "-"} ms</p>

        <div className="actions">
          <button disabled={busy} onClick={() => action("/engagement/start")}>Start</button>
          <button disabled={busy} onClick={() => action("/engagement/stop")}>Stop</button>
          <button disabled={busy} onClick={() => action("/engagement/run-once", (payload) => setLastRun(payload?.result || null))}>Run Once</button>
          <button disabled={busy} onClick={() => action("/engagement/reset-errors")}>Clear Errors</button>
          <button disabled={busy} onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="cards-grid">
        <div className="metric-card"><span>Runs</span><strong>{data?.state?.runCount || 0}</strong></div>
        <div className="metric-card"><span>Failures</span><strong>{data?.state?.failureCount || 0}</strong></div>
        <div className="metric-card"><span>Last posts</span><strong>{data?.state?.lastResult?.posts || 0}</strong></div>
        <div className="metric-card"><span>Last articles</span><strong>{data?.state?.lastResult?.articles || 0}</strong></div>
      </div>

      <div className="admin-card">
        <h3>Runtime</h3>
        <p><strong>Started at:</strong> {data?.state?.startedAt || "-"}</p>
        <p><strong>Last run at:</strong> {data?.state?.lastRunAt || "-"}</p>
        <p><strong>State loaded at:</strong> {data?.state?.adminStateLoadedAt || "-"}</p>
        <p><strong>Manual run result:</strong> {lastRun ? JSON.stringify(lastRun) : "-"}</p>
      </div>

      <div className="admin-card" style={{ overflowX: "auto" }}>
        <h3>Recent Errors</h3>
        <table className="admin-table" style={{ marginBottom: 0 }}>
          <thead><tr><th>When</th><th>Message</th></tr></thead>
          <tbody>
            {(data?.state?.errors || []).length === 0 ? (
              <tr><td colSpan={2}>No errors logged.</td></tr>
            ) : (
              (data?.state?.errors || []).map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td>{e.at}</td><td>{e.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
