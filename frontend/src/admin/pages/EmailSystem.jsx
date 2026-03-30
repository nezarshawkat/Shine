import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

const initialForm = {
  to: "",
  subject: "",
  headline: "",
  message: "",
  ctaLabel: "",
  ctaUrl: "",
};

export default function EmailSystem() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminRequest("get", "/email-system");
      setData(res.data.data);
      setStatus("");
    } catch (error) {
      setStatus(error?.response?.data?.error || "Failed to load email system status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const triggerDigest = async () => {
    setStatus("");
    try {
      const res = await adminRequest("post", "/email-system/trigger-digest");
      setStatus(res.data.message || "Digest started.");
    } catch (error) {
      setStatus(error?.response?.data?.error || "Could not trigger digest");
    }
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus("");
    try {
      await adminRequest("post", "/email-system/send", form);
      setStatus("Email sent successfully.");
      setForm(initialForm);
      await load();
    } catch (error) {
      setStatus(error?.response?.data?.error || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p>Loading email system...</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Email Control Center</h2>
        <p style={{ marginBottom: 8 }}>{data?.statusText}</p>
        <div className="cards-grid">
          <div className="metric-card"><span>Total Sent</span><strong>{data?.counters?.totalSent || 0}</strong></div>
          <div className="metric-card"><span>Total Failed</span><strong>{data?.counters?.totalFailed || 0}</strong></div>
          <div className="metric-card"><span>24h Success Rate</span><strong>{data?.counters?.successRate24h || 0}%</strong></div>
          <div className="metric-card"><span>Pending Digest Users</span><strong>{data?.digest?.pendingUsers || 0}</strong></div>
          <div className="metric-card"><span>Digest Subscribers</span><strong>{data?.digest?.activePreferenceCount || 0}</strong></div>
          <div className="metric-card"><span>7d Failed</span><strong>{data?.counters?.failed7d || 0}</strong></div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load}>Refresh Live Status</button>
          <button onClick={triggerDigest}>Run Digest Now</button>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>SMTP & Digest Configuration Health</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Provider: <strong>{data?.smtpHealth?.provider}</strong></li>
          <li>SMTP verified: <strong>{String(data?.smtpHealth?.transporterVerified)}</strong></li>
          <li>Digest enabled: <strong>{String(data?.smtpHealth?.digestEnabled)}</strong></li>
          <li>Weekly recommendation enabled: <strong>{String(data?.smtpHealth?.weeklyRecommendationEnabled)}</strong></li>
          <li>API fallback enabled: <strong>{String(data?.smtpHealth?.apiFallbackEnabled)}</strong></li>
          <li>Digest interval: <strong>{data?.smtpHealth?.digestIntervalMinutes} minutes</strong></li>
          {Object.entries(data?.smtpHealth?.required || {}).map(([k, v]) => (
            <li key={k}>{k}: <strong>{v ? "set" : "missing"}</strong></li>
          ))}
          {Object.entries(data?.smtpHealth?.apiFallbackRequired || {}).map(([k, v]) => (
            <li key={k}>{k} (API): <strong>{v ? "set" : "missing"}</strong></li>
          ))}
        </ul>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>API Fallback Variables</h3>
        <p style={{ marginTop: 0 }}>
          Add these values to your backend environment to enable fallback when SMTP fails.
        </p>
        <table className="admin-table" style={{ marginBottom: 0 }}>
          <thead>
            <tr><th>Variable</th><th>Suggested Value</th></tr>
          </thead>
          <tbody>
            {Object.entries(data?.smtpHealth?.apiFallbackVariables || {}).map(([key, value]) => (
              <tr key={key}>
                <td><code>{key}</code></td>
                <td><code>{String(value)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Send Manual Email</h3>
        <form onSubmit={sendEmail} style={{ display: "grid", gap: 10 }}>
          <input placeholder="Recipient email" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
          <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <input placeholder="Headline (optional)" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          <textarea placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={6} style={{ borderRadius: 8, border: "1px solid #d1d5db", padding: 10 }} />
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <input placeholder="CTA label (optional)" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
            <input placeholder="CTA URL (optional)" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
          </div>
          <button type="submit" disabled={sending}>{sending ? "Sending..." : "Send Email"}</button>
        </form>
      </div>

      <div className="admin-card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Recent Delivery Log</h3>
        <table className="admin-table" style={{ marginBottom: 0 }}>
          <thead>
            <tr><th>Time</th><th>Status</th><th>Category</th><th>To</th><th>Subject</th><th>Error</th></tr>
          </thead>
          <tbody>
            {(data?.recentLogs || []).map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.status}</td>
                <td>{log.category}</td>
                <td>{log.toEmail}</td>
                <td>{log.subject || "-"}</td>
                <td>{log.errorMessage || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {status ? <p>{status}</p> : null}
    </div>
  );
}
