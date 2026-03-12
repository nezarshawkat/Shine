import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../AuthProvider.jsx";
import "/workspaces/Shine/frontend/src/styles/CommunitySettings.css";

const API_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev/api";
const ASSET_URL = "https://studious-robot-r4wpqgpjp572wj5-5000.app.github.dev";

// --- TOAST COMPONENT (Shine Design) ---
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
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success", action = null) => {
    setToast({ message, type, action });
  };

  // Identify Current User's Role
  const myMemberRecord = community?.communityMembers?.find(m => m.userId === userId);
  const myRole = myMemberRecord?.role; 
  const isMainAdmin = myRole === "MAIN_ADMIN";

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
    if (!path) return fallback;
    if (path.startsWith("blob:")) return path;
    return path.startsWith("http") ? path : `${ASSET_URL}${path}`;
  };

  const [previewIcon, setPreviewIcon] = useState(getFullUrl(community?.icon, "/default-comm.png"));
  const [previewBanner, setPreviewBanner] = useState(getFullUrl(community?.banner, "/images/default-banner.jpg"));

  const [members, setMembers] = useState(community?.communityMembers || []);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (activeSection === "Requests") fetchRequests();
  }, [activeSection]);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/communities/${community.id}/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) { console.error("Fetch requests failed"); }
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

  const handleLeaveGroup = async () => {
    if (isMainAdmin) {
      showToast("You must assign a new Main Admin before leaving.", "error", {
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
            <span className="arrow">←</span> Back
          </button>
          <nav className="settings-nav">
            <button className={`nav-item ${activeSection === "General" ? "active" : ""}`} onClick={() => setActiveSection("General")}>
              <span className="nav-icon">⚙️</span> General
            </button>
            <button className={`nav-item ${activeSection === "Members" ? "active" : ""}`} onClick={() => setActiveSection("Members")}>
              <span className="nav-icon">👥</span> Manager
            </button>
            <button className={`nav-item ${activeSection === "Requests" ? "active" : ""}`} onClick={() => setActiveSection("Requests")}>
              <span className="nav-icon">📩</span> Requests
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
                      {!isMainAdmin && m.role === "MEMBER" && (
                        <button className="kick-btn" onClick={() => handleMemberAction('kick', m.userId)}>Kick</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "Requests" && (
              <div className="settings-card-group">
                {requests.length > 0 ? requests.map(r => (
                  <div key={r.id} className="request-row">
                    <div className="info"><label>@{r.user?.username}</label><span>wants to join</span></div>
                    <div className="row-actions">
                      <button className="accept-btn">Accept</button>
                      <button className="decline-btn">Decline</button>
                    </div>
                  </div>
                )) : <div className="empty-state">No pending join requests.</div>}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <style>{`
        .branding-edit-container {
            display: flex;
            gap: 20px;
            background: #fdfdfd;
            padding: 20px;
            border-radius: 16px;
            border: 1px solid #edf2f7;
            margin-bottom: 30px;
            align-items: center;
        }
        .settings-banner-preview {
            width: 280px;
            height: 100px;
            border-radius: 12px;
            object-fit: cover;
            border: 3px solid #1C274C;
        }
        .change-asset-btn {
            background: #1C274C;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 8px;
        }
        .banner-upload { flex: 1; align-items: flex-start !important; }
      `}</style>
    </div>
  );
}