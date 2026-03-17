import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";

export default function CommunitySettings({ community, initialSection = "General", onClose, onUpdate }) {
  const currentUserId = localStorage.getItem("userId");
  const [activeSection, setActiveSection] = useState(initialSection);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requests, setRequests] = useState([]);

  const [generalForm, setGeneralForm] = useState({
    name: community?.name || "",
    slogan: community?.slogan || "",
    discription: community?.discription || "",
    status: community?.status || "PUBLIC",
  });

  useEffect(() => {
    setActiveSection(initialSection || "General");
  }, [initialSection]);

  useEffect(() => {
    setGeneralForm({
      name: community?.name || "",
      slogan: community?.slogan || "",
      discription: community?.discription || "",
      status: community?.status || "PUBLIC",
    });
  }, [community]);

  const myMembership = useMemo(
    () => community?.communityMembers?.find((m) => m.userId === currentUserId),
    [community, currentUserId]
  );
  const canManage = myMembership?.role === "MAIN_ADMIN" || myMembership?.role === "ADMIN";
  const canDeleteOrTransfer = myMembership?.role === "MAIN_ADMIN";

  const fetchRequests = async () => {
    if (!community?.id || !canManage) return;
    setLoadingRequests(true);
    try {
      const res = await API.get(`/communities/${community.id}/requests`);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Requests load failed", err);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeSection === "Requests") fetchRequests();
  }, [activeSection, community?.id, canManage]);

  const saveGeneral = async () => {
    if (!community?.id) return;
    setSavingGeneral(true);
    try {
      await API.put(`/communities/${community.id}`, generalForm);
      alert("Community settings updated.");
      onUpdate?.();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update community settings.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const updateMemberRole = async (targetUserId, role) => {
    try {
      await API.put(`/communities/${community.id}/members/${targetUserId}/role`, { role });
      onUpdate?.();
    } catch (err) {
      alert("Failed to update role.");
    }
  };

  const removeMember = async (targetUserId) => {
    if (!window.confirm("Remove this member from community?")) return;
    try {
      await API.delete(`/communities/${community.id}/members/${targetUserId}`);
      onUpdate?.();
    } catch (err) {
      alert("Failed to remove member.");
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await API.post(`/communities/${community.id}/requests/${requestId}`, { action });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      onUpdate?.();
    } catch (err) {
      alert("Failed to process request.");
    }
  };

  const sections = [
    { id: "General", icon: "⚙️" },
    { id: "Members", icon: "👥" },
    { id: "Requests", icon: "📩" },
  ];

  return (
    <div className="full-settings-layer">
      <div className="settings-container">
        <aside className="settings-sidebar">
          <button className="settings-back-btn" onClick={onClose}>← <span className="btn-text">Back to Community</span></button>
          <nav className="settings-nav">
            {sections.map((s) => (
              <button key={s.id} className={`nav-item ${activeSection === s.id ? "active" : ""}`} onClick={() => setActiveSection(s.id)}>
                <span className="nav-icon">{s.icon}</span> <span className="nav-text">{s.id}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-main">
          <div className="settings-view-header">
            <h1>{activeSection}</h1>
          </div>

          {activeSection === "General" && (
            <div className="settings-card-group">
              <div className="setting-row"><div className="info"><label>Name</label></div><input className="shine-input" value={generalForm.name} onChange={(e) => setGeneralForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="setting-row"><div className="info"><label>Slogan</label></div><input className="shine-input" value={generalForm.slogan} onChange={(e) => setGeneralForm((p) => ({ ...p, slogan: e.target.value }))} /></div>
              <div className="setting-row"><div className="info"><label>Description</label></div><textarea className="shine-input" value={generalForm.discription} onChange={(e) => setGeneralForm((p) => ({ ...p, discription: e.target.value }))} /></div>
              <div className="setting-row no-border"><div className="info"><label>Privacy</label></div>
                <select className="shine-input" value={generalForm.status} onChange={(e) => setGeneralForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>
              <button className="save-btn" onClick={saveGeneral} disabled={savingGeneral}>{savingGeneral ? "Saving..." : "Save Changes"}</button>
            </div>
          )}

          {activeSection === "Members" && (
            <div className="settings-card-group">
              {(community?.communityMembers || []).map((member) => (
                <div className="member-manage-row" key={member.userId}>
                  <div>
                    <strong>{member.user?.name || member.user?.username || member.userId}</strong>
                    <span className={`m-badge ${String(member.role || "").toLowerCase()}`}>{member.role}</span>
                  </div>
                  {canManage && member.userId !== currentUserId ? (
                    <div>
                      <select className="role-select" value={member.role} onChange={(e) => updateMemberRole(member.userId, e.target.value)}>
                        <option value="MEMBER">MEMBER</option>
                        <option value="ADMIN">ADMIN</option>
                        {canDeleteOrTransfer && <option value="MAIN_ADMIN">MAIN_ADMIN</option>}
                      </select>
                      <button className="kick-btn" onClick={() => removeMember(member.userId)}>Kick</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {activeSection === "Requests" && (
            <div className="settings-card-group">
              {!canManage ? (
                <p>Only admins can manage requests.</p>
              ) : loadingRequests ? (
                <p>Loading requests...</p>
              ) : requests.length === 0 ? (
                <p>No pending requests.</p>
              ) : (
                requests.map((req) => (
                  <div className="member-manage-row" key={req.id}>
                    <div>
                      <strong>{req.user?.name || req.user?.username || req.userId}</strong>
                      <p style={{ margin: 0, color: "#666" }}>@{req.user?.username || "user"}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="save-btn" onClick={() => handleRequestAction(req.id, "ACCEPT")}>Accept</button>
                      <button className="cancel-btn" onClick={() => handleRequestAction(req.id, "DECLINE")}>Decline</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        .full-settings-layer { position: fixed; inset: 0; z-index: 9999; background: #f8f9fa; }
        .settings-container { display: flex; width: 100%; max-width: 1200px; margin: 0 auto; height: 100%; background: #fff; }
        .settings-sidebar { width: 280px; border-right: 1px solid #eee; padding: 30px 20px; }
        .settings-back-btn { background: #1C274C; color: #FFC847; border: none; padding: 12px 16px; border-radius: 10px; font-weight: 700; margin-bottom: 20px; cursor: pointer; }
        .nav-item { width: 100%; text-align: left; border: none; background: transparent; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; }
        .nav-item.active { background: #eff3ff; font-weight: 700; color: #1C274C; }
        .settings-main { flex: 1; overflow: auto; padding: 30px 40px; }
        .settings-card-group { border: 1px solid #eee; border-radius: 14px; padding: 20px; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f2f2f2; }
        .setting-row.no-border { border-bottom: none; }
        .shine-input { width: min(420px, 100%); border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; }
        textarea.shine-input { min-height: 90px; }
        .save-btn { border: none; background: #1C274C; color: #FFC847; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
        .cancel-btn { border: 1px solid #ddd; background: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
        .member-manage-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f1f1; }
        .m-badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-left: 8px; }
        .m-badge.main_admin { background: #FEF3C7; color: #92400E; }
        .m-badge.admin { background: #DBEAFE; color: #1E40AF; }
        .m-badge.member { background: #E2E8F0; color: #334155; }
        .role-select { padding: 4px 8px; border-radius: 6px; border: 1px solid #CBD5E1; }
        .kick-btn { background: none; border: none; color: #EF4444; font-weight: 600; cursor: pointer; margin-left: 10px; }


        @media (max-width: 850px) {
          .settings-container { flex-direction: column; }
          .settings-sidebar {
            width: 100%;
            height: auto;
            padding: 10px 15px;
            display: flex;
            flex-direction: row;
            align-items: center;
            border-right: none;
            border-bottom: 1px solid #eee;
            gap: 10px;
          }
          .settings-back-btn { margin-bottom: 0; padding: 8px 12px; }
          .settings-back-btn .btn-text { display: none; }
          .settings-nav { display: flex; flex: 1; justify-content: flex-end; gap: 6px; }
          .nav-item { margin-bottom: 0; width: auto; padding: 10px; }
          .nav-text { display: none; }
          .nav-icon { margin-right: 0; }
          .settings-main { padding: 20px; }
          .setting-row { flex-direction: column; align-items: flex-start; }
          .shine-input { width: 100%; }
          .member-manage-row { align-items: flex-start; flex-direction: column; gap: 8px; }
        }
      `}</style>
    </div>
  );
}
