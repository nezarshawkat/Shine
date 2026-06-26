import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../AuthProvider.jsx";
import "../../styles/CommunitySettings.css";
import { API_BASE_URL, buildMediaUrl } from "../../api";

const API_URL = API_BASE_URL;
// --- TOAST COMPONENT ---
function Toast({ message, type = "success", action, onClose }) {
  useEffect(() => {
    if (!action) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [onClose, action]);

  const bgColor = type === "error" ? "#FF4C4C" : "#1C274C";
  const textColor = type === "error" ? "#FFF" : "#FFC847";

  return (
    <div style={{ 
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", 
      background: bgColor, color: textColor, padding: "12px 24px", borderRadius: "12px", 
      fontWeight: 600, fontSize: "14px", zIndex: 9999, display: "flex", alignItems: "center", 
      gap: "15px", boxShadow: "0 8px 16px rgba(0,0,0,0.2)", border: `1px solid ${type === "error" ? "#ff8080" : "#2d3e75"}`
    }}>
      <span>{message}</span>
      {action ? (
        <button 
          onClick={() => { action.onClick(); onClose(); }}
          style={{
            background: textColor, color: bgColor, border: "none", padding: "4px 12px",
            borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 800, textTransform: "uppercase"
          }}
        >
          {action.label}
        </button>
      ) : (
        <button onClick={onClose} style={{ background: "none", border: "none", color: textColor, cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>&times;</button>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function CommunitySettings({ community, initialSection = "General", onClose, onUpdate }) {
  const { userId, token } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success", action = null) => {
    setToast({ message, type, action });
  };

  // Roles & Permissions
  const myMemberRecord = community?.communityMembers?.find(m => m.userId === userId);
  const myRole = myMemberRecord?.role; 
  const isMainAdmin = myRole === "MAIN_ADMIN";
  const canManage = myRole === "MAIN_ADMIN" || myRole === "ADMIN";

  // State for General Edits
  const [editData, setEditData] = useState({
    name: community?.name || "",
    slogan: community?.slogan || "",
    discription: community?.discription || "",
    status: community?.status || "PUBLIC",
  });

  const [iconFile, setIconFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  
  const getFullUrl = (path, fallback) => {
    return buildMediaUrl(path) || fallback;
  };

  const [previewIcon, setPreviewIcon] = useState(getFullUrl(community?.icon, "/default-comm.png"));
  const [previewBanner, setPreviewBanner] = useState(getFullUrl(community?.banner, "/images/default-banner.jpg"));

  const [members, setMembers] = useState(community?.communityMembers || []);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (activeSection === "Requests") fetchRequests();
  }, [activeSection]);

  const fetchRequests = async () => {
    if (!canManage) return;
    setLoadingRequests(true);
    try {
      const res = await axios.get(`${API_URL}/communities/${community.id}/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) { 
      console.error("Fetch requests failed"); 
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleUpdateGeneral = async () => {
    if (!isMainAdmin) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("slogan", editData.slogan);
      formData.append("discription", editData.discription);
      formData.append("status", editData.status);
      
      if (iconFile) formData.append("icon", iconFile);
      if (bannerFile) formData.append("banner", bannerFile);

      await axios.put(`${API_URL}/communities/${community.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data" 
        }
      });
      showToast("Community settings updated!");
      onUpdate();
    } catch (err) { showToast("Failed to update.", "error"); }
    finally { setLoading(false); }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!isMainAdmin && newRole === "MAIN_ADMIN") return;
    try {
      await axios.put(`${API_URL}/communities/${community.id}/members/${targetUserId}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Role updated to ${newRole.replace("_", " ")}`);
      onUpdate();
    } catch (err) { showToast("Role update failed.", "error"); }
  };

  const handleMemberAction = async (action, targetUserId) => {
    try {
      if (action === 'kick') {
        if (!window.confirm("Remove this member?")) return;
        await axios.delete(`${API_URL}/communities/${community.id}/members/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Member removed from community");
      }
      onUpdate();
    } catch (err) { showToast("Action failed", "error"); }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await axios.post(`${API_URL}/communities/${community.id}/requests/${requestId}`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      showToast(`Request ${action === "ACCEPT" ? "accepted" : "declined"}`);
      onUpdate();
    } catch (err) {
      showToast("Failed to process request.", "error");
    }
  };

  const handleLeaveGroup = async () => {
    if (isMainAdmin) {
      showToast("Assign a new Main Admin before leaving.", "error", {
        label: "Assign Now",
        onClick: () => setActiveSection("Members")
      });
      return;
    }
    if (!window.confirm("Leave this community?")) return;
    try {
      await axios.post(`${API_URL}/communities/${community.id}/leave`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = "/";
    } catch (err) { showToast("Error leaving.", "error"); }
  };

  const handleDeleteCommunity = async () => {
    if (!isMainAdmin) return;
    if (!window.confirm("Permanently delete this community?")) return;
    try {
      await axios.delete(`${API_URL}/communities/${community.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = "/";
    } catch (err) { showToast("Deletion failed", "error"); }
  };

  return (
    <div className="full-settings-layer">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="settings-container">
        <aside className="settings-sidebar">
          <button className="settings-back-btn" onClick={onClose}>
            <span className="arrow">←</span> <span className="btn-text">Back</span>
          </button>
          <nav className="settings-nav">
            <button className={`nav-item ${activeSection === "General" ? "active" : ""}`} onClick={() => setActiveSection("General")}>
              <span className="nav-icon">⚙️</span> <span className="nav-text">General</span>
            </button>
            <button className={`nav-item ${activeSection === "Members" ? "active" : ""}`} onClick={() => setActiveSection("Members")}>
              <span className="nav-icon">👥</span> <span className="nav-text">Manager</span>
            </button>
            <button className={`nav-item ${activeSection === "Requests" ? "active" : ""}`} onClick={() => setActiveSection("Requests")}>
              <span className="nav-icon">📩</span> <span className="nav-text">Requests</span>
            </button>
          </nav>
        </aside>

        <main className="settings-main">
          <header className="settings-view-header">
            <h1>{activeSection} Settings</h1>
            <p>Managing as <strong>{myRole?.replace("_", " ")}</strong></p>
          </header>

          <div className="settings-scroll-area">
            {activeSection === "General" && (
              <div className="settings-card-group">
                {isMainAdmin ? (
                  <>
                    <div className="branding-edit-container">
                      <div className="setting-profile-upload">
                         <img src={previewIcon} alt="Icon Preview" className="settings-icon-preview" />
                         <button className="change-asset-btn" onClick={() => document.getElementById('icon-input').click()}>Logo</button>
                         <input type="file" id="icon-input" hidden onChange={(e) => {
                           const file = e.target.files[0];
                           if(file) { setIconFile(file); setPreviewIcon(URL.createObjectURL(file)); }
                         }} />
                      </div>

                      <div className="setting-profile-upload banner-upload">
                         <img src={previewBanner} alt="Banner Preview" className="settings-banner-preview" />
                         <button className="change-asset-btn" onClick={() => document.getElementById('banner-input').click()}>Banner</button>
                         <input type="file" id="banner-input" hidden onChange={(e) => {
                           const file = e.target.files[0];
                           if(file) { setBannerFile(file); setPreviewBanner(URL.createObjectURL(file)); }
                         }} />
                      </div>
                    </div>

                    <div className="setting-row"><div className="info"><label>Community Name</label>
                      <input className="shine-input" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})}/>
                    </div></div>
                    
                    <div className="setting-row"><div className="info"><label>Slogan</label>
                      <input className="shine-input" value={editData.slogan} onChange={(e) => setEditData({...editData, slogan: e.target.value})}/>
                    </div></div>

                    <div className="setting-row"><div className="info"><label>Description</label>
                      <textarea className="shine-input" style={{minHeight: '80px'}} value={editData.discription} onChange={(e) => setEditData({...editData, discription: e.target.value})}/>
                    </div></div>

                    <div className="setting-row"><div className="info"><label>Privacy Status</label>
                      <select className="shine-input" value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})}>
                        <option value="PUBLIC">Public</option>
                        <option value="PRIVATE">Private</option>
                      </select>
                    </div></div>

                    <button className="save-btn" onClick={handleUpdateGeneral} disabled={loading}>
                      {loading ? "Saving..." : "Update Details"}
                    </button>
                  </>
                ) : (
                  <div className="admin-notice"><p>Only Main Admin can edit these details.</p></div>
                )}

                <div className="danger-zone-v2">
                  <h3>Danger Zone</h3>
                  <div className="danger-box">
                    <div className="danger-text">
                      <label>Leave Community</label>
                      <p>You will lose all administrative privileges.</p>
                    </div>
                    <button className="leave-btn" onClick={handleLeaveGroup}>Leave Group</button>
                  </div>
                  
                  {isMainAdmin && (
                    <div className="danger-box">
                      <div className="danger-text">
                        <label>Delete Community</label>
                        <p>This action is permanent and cannot be undone.</p>
                      </div>
                      <button className="delete-comm-btn" onClick={handleDeleteCommunity}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "Members" && (
              <div className="settings-card-group">
                {members.map(m => (
                  <div key={m.userId} className="member-manage-row">
                    <div className="member-info">
                      <span className="m-name">@{m.user?.username}</span>
                      <span className={`m-badge ${m.role.toLowerCase()}`}>{m.role.replace("_", " ")}</span>
                    </div>
                    <div className="member-actions">
                      {isMainAdmin && m.userId !== userId && (
                        <>
                          <select className="role-select" value={m.role} onChange={(e) => handleRoleChange(m.userId, e.target.value)}>
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                            <option value="MAIN_ADMIN">Main Admin (Transfer)</option>
                          </select>
                          <button className="kick-btn" onClick={() => handleMemberAction('kick', m.userId)}>Kick</button>
                        </>
                      )}
                      {!isMainAdmin && canManage && m.role === "MEMBER" && (
                        <button className="kick-btn" onClick={() => handleMemberAction('kick', m.userId)}>Kick</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "Requests" && (
              <div className="settings-card-group">
                {!canManage ? (
                  <div className="empty-state">Only admins can manage requests.</div>
                ) : loadingRequests ? (
                  <div className="empty-state">Loading requests...</div>
                ) : requests.length > 0 ? requests.map(r => (
                  <div key={r.id} className="member-manage-row">
                    <div className="member-info">
                      <span className="m-name" style={{fontWeight: 700}}>@{r.user?.username}</span>
                      <span style={{fontSize: '12px', color: '#666', marginLeft: '8px'}}>requested to join</span>
                    </div>
                    <div className="member-actions" style={{display: 'flex', gap: '10px'}}>
                      <button className="save-btn" onClick={() => handleRequestAction(r.id, "ACCEPT")}>Accept</button>
                      <button className="cancel-btn" onClick={() => handleRequestAction(r.id, "DECLINE")}>Decline</button>
                    </div>
                  </div>
                )) : <div className="empty-state">No pending join requests.</div>}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <style>{`
        .full-settings-layer { position: fixed; inset: 0; z-index: 9999; background: #f8f9fa; }
        .settings-container { display: flex; width: 100%; max-width: 1200px; margin: 0 auto; height: 100%; background: #fff; }
        .settings-sidebar { width: 280px; border-right: 1px solid #eee; padding: 30px 20px; flex-shrink: 0; }
        .settings-back-btn { background: #1C274C; color: #FFC847; border: none; padding: 12px 16px; border-radius: 10px; font-weight: 700; margin-bottom: 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .nav-item { width: 100%; text-align: left; border: none; background: transparent; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; transition: 0.2s; }
        .nav-item.active { background: #eff3ff; font-weight: 700; color: #1C274C; }
        .nav-icon { margin-right: 10px; }
        .settings-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0; }
        .settings-view-header { padding: 30px 40px 10px; border-bottom: 1px solid #f2f2f2; }
        .settings-view-header h1 { margin: 0; font-size: 24px; color: #1C274C; }
        .settings-scroll-area { flex: 1; overflow-y: auto; padding: 20px 40px 40px; }
        .settings-card-group { border: 1px solid #eee; border-radius: 14px; padding: 20px; background: white; }
        .setting-row { display: flex; flex-direction: column; gap: 8px; padding: 15px 0; border-bottom: 1px solid #f2f2f2; }
        .setting-row .info { display: flex; flex-direction: column; gap: 5px; width: 100%; }
        .setting-row label { font-weight: 700; font-size: 14px; color: #444; }
        .shine-input { width: 100%; max-width: 500px; border: 1px solid #ddd; border-radius: 10px; padding: 10px 14px; font-size: 14px; }
        .branding-edit-container { display: flex; gap: 20px; background: #fdfdfd; padding: 20px; border-radius: 16px; border: 1px solid #edf2f7; margin-bottom: 30px; align-items: center; }
        .settings-icon-preview { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #1C274C; }
        .settings-banner-preview { width: 280px; height: 100px; border-radius: 12px; object-fit: cover; border: 3px solid #1C274C; }
        .change-asset-btn { background: #1C274C; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 8px; display: block; }
        .save-btn { border: none; background: #1C274C; color: #FFC847; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 20px; }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cancel-btn { border: 1px solid #ddd; background: #fff; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-weight: 600; }
        .member-manage-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f1f1f1; }
        .m-badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-left: 8px; text-transform: capitalize; }
        .m-badge.main_admin { background: #FEF3C7; color: #92400E; }
        .m-badge.admin { background: #DBEAFE; color: #1E40AF; }
        .m-badge.member { background: #E2E8F0; color: #334155; }
        .role-select { padding: 6px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 13px; }
        .kick-btn { background: none; border: none; color: #EF4444; font-weight: 700; cursor: pointer; margin-left: 15px; }
        .empty-state { padding: 40px; text-align: center; color: #888; font-style: italic; }

        @media (max-width: 850px) {
          .settings-container { flex-direction: column; }
          .settings-sidebar { width: 100%; height: auto; padding: 10px 15px; flex-direction: row; align-items: center; border-right: none; border-bottom: 1px solid #eee; display: flex; }
          .settings-back-btn { margin-bottom: 0; padding: 8px 15px; }
          .settings-back-btn .btn-text { display: none; }
          .settings-nav { display: flex; flex: 1; justify-content: flex-end; gap: 5px; }
          .nav-item { margin-bottom: 0; padding: 10px; width: auto; }
          .nav-text { display: none; }
          .nav-icon { margin-right: 0; font-size: 18px; }
          .settings-main { padding: 0; }
          .branding-edit-container { flex-direction: column; align-items: flex-start; }
          .settings-banner-preview { width: 100%; }
          .member-manage-row { flex-direction: column; align-items: flex-start; gap: 10px; }
          .member-actions { width: 100%; justify-content: space-between; display: flex; }
        }
      `}</style>
    </div>
  );
}