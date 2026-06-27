import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function AutoActivity() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await adminRequest("get", "/auto-activity");
      setData(res.data.data);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load auto-activity status");
    }
  }

  async function action(path) {
    setBusy(true);
    try {
      await adminRequest("post", path);
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
        <h2>Auto Feed System</h2>
        {error && <p className="error-text">{error}</p>}
        <p><strong>Running:</strong> {data?.running ? "Yes" : "No"}</p>
        <p><strong>Enabled by env:</strong> {String(data?.config?.enabled)}</p>
        <p><strong>OpenAI web search ready:</strong> {data?.config?.ready ? "Yes" : "No"}</p>
        <p><strong>Source provider:</strong> {data?.config?.sourceProvider || "-"}</p>
        <p><strong>Post interval:</strong> {data?.config?.intervalMs} ms</p>
        <p><strong>Article interval:</strong> {data?.config?.articleIntervalMs} ms</p>
        <div className="actions">
          <button disabled={busy} onClick={() => action("/auto-activity/start")}>Start</button>
          <button disabled={busy} onClick={() => action("/auto-activity/stop")}>Stop</button>
          <button disabled={busy} onClick={() => action("/auto-activity/trigger-post")}>Trigger 1 Post</button>
          <button disabled={busy} onClick={() => action("/auto-activity/trigger-article")}>Trigger 1 Article</button>
          <button disabled={busy} onClick={() => action("/auto-activity/reset-errors")}>Clear Errors</button>
          <button disabled={busy} onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="cards-grid">
        <div className="metric-card"><span>Post runs</span><strong>{data?.state?.postRuns || 0}</strong></div>
        <div className="metric-card"><span>Article runs</span><strong>{data?.state?.articleRuns || 0}</strong></div>
        <div className="metric-card"><span>Post failures</span><strong>{data?.state?.postFailures || 0}</strong></div>
        <div className="metric-card"><span>Article failures</span><strong>{data?.state?.articleFailures || 0}</strong></div>
      </div>

      <div className="admin-card">
        <h3>Runtime</h3>
        <p><strong>Started at:</strong> {data?.state?.startedAt || "-"}</p>
        <p><strong>Last post at:</strong> {data?.state?.lastPostAt || "-"}</p>
        <p><strong>Last article at:</strong> {data?.state?.lastArticleAt || "-"}</p>
        <p><strong>Last error at:</strong> {data?.state?.lastErrorAt || "-"}</p>
      </div>

      <div className="admin-card" style={{ overflowX: "auto" }}>
        <h3>Recent Errors</h3>
        <table className="admin-table" style={{ marginBottom: 0 }}>
          <thead><tr><th>When</th><th>Scope</th><th>Message</th></tr></thead>
          <tbody>
            {(data?.state?.errors || []).length === 0 ? (
              <tr><td colSpan={3}>No errors logged.</td></tr>
            ) : (
              (data?.state?.errors || []).map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td>{e.at}</td><td>{e.scope}</td><td>{e.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
