import React, { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../adminApi";

const EMAIL_ICON_URL =
  "https://nhgtxkwmobdjruaslbie.supabase.co/storage/v1/object/public/shine-media/communities/1774437529347-6c74acd3-8d7c-43f7-8cfb-6edd25ae8420-whatsapp-image-2026-03-25-at-1-15-09-pm.jpeg";

const initialForm = {
  to: "",
  sectionKeys: [],
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
  const [liveLog, setLiveLog] = useState([]);
  const [adminPreviewHtml, setAdminPreviewHtml] = useState("");

  const pushLog = (text, level = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setLiveLog((prev) => [{ id, text, level, createdAt: Date.now() }, ...prev].slice(0, 60));
    window.setTimeout(() => {
      setLiveLog((prev) => prev.filter((item) => item.id !== id));
    }, 35000);
  };

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminRequest("get", "/email-system");
      setData(res.data.data);
      if (!silent) setStatus("");
    } catch (error) {
      const message = error?.response?.data?.error || "Failed to load email system status";
      setStatus(message);
      pushLog(`Load error: ${message}`, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const res = await adminRequest("post", "/email-system/preview", {
          headline: form.headline,
          message: form.message,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl,
        });
        setAdminPreviewHtml(res.data?.data?.html || "");
      } catch (error) {
        setAdminPreviewHtml("");
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [form.headline, form.message, form.ctaLabel, form.ctaUrl]);

  const triggerDigest = async () => {
    setStatus("");
    try {
      const res = await adminRequest("post", "/email-system/trigger-digest");
      setStatus(res.data.message || "Digest started.");
      pushLog("Digest triggered manually", "success");
      await load({ silent: true });
    } catch (error) {
      const message = error?.response?.data?.error || "Could not trigger digest";
      setStatus(message);
      pushLog(`Digest trigger failed: ${message}`, "error");
    }
  };

  const toggleScheduler = async (action) => {
    try {
      await adminRequest("post", "/email-system/scheduler", { action });
      pushLog(`Digest scheduler ${action}d by admin`, "warn");
      await load({ silent: true });
    } catch (error) {
      pushLog(`Scheduler ${action} failed`, "error");
    }
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus("");
    try {
      const res = await adminRequest("post", "/email-system/send", form);
      setStatus(`Email sent successfully to ${res.data?.sent || 0} recipients.`);
      pushLog(`Manual email sent (${res.data?.sent || 0} recipients)`, "success");
      setForm(initialForm);
      await load({ silent: true });
    } catch (error) {
      const message = error?.response?.data?.error || "Failed to send email";
      setStatus(message);
      pushLog(`Manual email failed: ${message}`, "error");
    } finally {
      setSending(false);
    }
  };

  const categoryRows = useMemo(() => {
    const stats = data?.categoryStats || [];
    const map = new Map();
    stats.forEach((row) => {
      const category = row.category || "unknown";
      if (!map.has(category)) map.set(category, { category, sent: 0, failed: 0 });
      if (row.status === "sent") map.get(category).sent += row._count;
      if (row.status === "failed") map.get(category).failed += row._count;
    });
    return Array.from(map.values());
  }, [data]);

  if (loading) return <p>Loading email system...</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="admin-card">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={EMAIL_ICON_URL} alt="Email" style={{ width: 50, height: 50, borderRadius: 12, objectFit: "cover" }} />
          <div>
            <h2 style={{ margin: 0 }}>Email Control Center</h2>
            <p style={{ margin: "4px 0 8px" }}>{data?.statusText}</p>
          </div>
        </div>
        <div className="cards-grid">
          <div className="metric-card"><span>Total Sent</span><strong>{data?.counters?.totalSent || 0}</strong></div>
          <div className="metric-card"><span>Total Failed</span><strong>{data?.counters?.totalFailed || 0}</strong></div>
          <div className="metric-card"><span>24h Success Rate</span><strong>{data?.counters?.successRate24h || 0}%</strong></div>
          <div className="metric-card"><span>Pending Digest Users</span><strong>{data?.digest?.pendingUsers || 0}</strong></div>
          <div className="metric-card"><span>Digest Subscribers</span><strong>{data?.digest?.activePreferenceCount || 0}</strong></div>
          <div className="metric-card"><span>Queue Size</span><strong>{data?.digest?.runtime?.queuedUserCount || 0}</strong></div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => load()}>Refresh Live Status</button>
          <button onClick={triggerDigest}>Run Digest Now</button>
          {data?.digest?.runtime?.paused ? (
            <button onClick={() => toggleScheduler("resume")}>Resume Scheduler</button>
          ) : (
            <button onClick={() => toggleScheduler("pause")}>Pause Scheduler</button>
          )}
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>SMTP, Runtime & Algorithm Tracking</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Provider: <strong>{data?.smtpHealth?.provider}</strong></li>
          <li>SMTP verified: <strong>{String(data?.smtpHealth?.transporterVerified)}</strong></li>
          <li>Digest enabled: <strong>{String(data?.smtpHealth?.digestEnabled)}</strong></li>
          <li>Digest paused: <strong>{String(data?.digest?.runtime?.paused)}</strong></li>
          <li>Digest interval: <strong>{data?.smtpHealth?.digestIntervalMinutes} minutes</strong></li>
          <li>Last digest status: <strong>{data?.digest?.runtime?.lastRunStatus || "idle"}</strong></li>
          <li>Algorithm satisfied (24h) new messages emails: <strong>{data?.digest?.algorithmSatisfied24h?.messages || 0}</strong></li>
          <li>Algorithm satisfied (24h) followed users posts emails: <strong>{data?.digest?.algorithmSatisfied24h?.followingPosts || 0}</strong></li>
          <li>Algorithm satisfied (24h) community posts emails: <strong>{data?.digest?.algorithmSatisfied24h?.communityPosts || 0}</strong></li>
          <li>Algorithm satisfied (24h) articles emails: <strong>{data?.digest?.algorithmSatisfied24h?.articles || 0}</strong></li>
          <li>Algorithm satisfied (24h) polls emails: <strong>{data?.digest?.algorithmSatisfied24h?.polls || 0}</strong></li>
          {Object.entries(data?.smtpHealth?.required || {}).map(([k, v]) => (
            <li key={k}>{k}: <strong>{v ? "set" : "missing"}</strong></li>
          ))}
        </ul>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Send Manual Email (multi-recipient + sections)</h3>
        <form onSubmit={sendEmail} style={{ display: "grid", gap: 10 }}>
          <textarea
            placeholder="Recipients (comma/new line separated emails)"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            rows={3}
            style={{ borderRadius: 8, border: "1px solid #d1d5db", padding: 10 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
            {(data?.sections || []).map((section) => {
              const active = form.sectionKeys.includes(section.key);
              return (
                <label key={section.key} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", padding: 8, borderRadius: 8 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.sectionKeys, section.key]
                        : form.sectionKeys.filter((key) => key !== section.key);
                      setForm({ ...form, sectionKeys: next });
                    }}
                  />
                  <span>{section.label} ({section.userCount})</span>
                </label>
              );
            })}
          </div>
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

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Email Templates Preview</h3>
        <p style={{ marginTop: 0 }}>Current email types + live preview of the email you are writing.</p>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <h4 style={{ margin: "0 0 6px" }}>Digest Template</h4>
            <iframe title="digest-preview" srcDoc={data?.templatePreviews?.digest || ""} style={{ width: "100%", height: 240, border: "1px solid #d1d5db", borderRadius: 10 }} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 6px" }}>Weekly Recommendation Template</h4>
            <iframe title="weekly-preview" srcDoc={data?.templatePreviews?.weekly || ""} style={{ width: "100%", height: 240, border: "1px solid #d1d5db", borderRadius: 10 }} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 6px" }}>Admin Email (Live)</h4>
            <iframe title="admin-preview" srcDoc={adminPreviewHtml || data?.templatePreviews?.admin || ""} style={{ width: "100%", height: 280, border: "1px solid #d1d5db", borderRadius: 10 }} />
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Live Email & Digest Log (temporary feed)</h3>
        <div style={{ marginBottom: 12, display: "grid", gap: 6 }}>
          {liveLog.map((item) => (
            <div key={item.id} style={{ fontSize: 13, color: item.level === "error" ? "#b91c1c" : item.level === "success" ? "#166534" : "#334155" }}>
              {new Date(item.createdAt).toLocaleTimeString()} · {item.text}
            </div>
          ))}
        </div>
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

      <div className="admin-card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Category Performance</h3>
        <table className="admin-table" style={{ marginBottom: 0 }}>
          <thead>
            <tr><th>Category</th><th>Sent</th><th>Failed</th></tr>
          </thead>
          <tbody>
            {categoryRows.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.sent}</td>
                <td>{row.failed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {status ? <p>{status}</p> : null}
    </div>
  );
}
