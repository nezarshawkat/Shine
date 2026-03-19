import React, { useState } from "react";
import API from "../api.js";


export default function ProfileSettings({ onClose, user, logout, onUserUpdate }) {
  const [activeSection, setActiveSection] = useState("Account");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const sections = [
    { id: "Account", icon: "👤" },
    { id: "Privacy", icon: "🔒" },
    { id: "Notifications", icon: "🔔" },
    { id: "Appearance", icon: "✨" },
    { id: "Blocked", icon: "🚫" },
  ];

  const handleEmailUpdate = async () => {
    if (!newEmail.includes("@")) return alert("Invalid email");
    setLoading(true);
    try {
      const res = await API.put(`/users/${user.id || user._id}`, { email: newEmail });
      onUserUpdate(res.data.user);
      setIsEditingEmail(false);
      alert("Email updated!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update email.");
    } finally { setLoading(false); }
  };

  const handlePasswordUpdate = async () => {
    if (passwords.next !== passwords.confirm) return alert("Passwords do not match");
    setLoading(true);
    try {
      await API.put(`/users/${user.id || user._id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.next
      });
      setIsEditingPassword(false);
      setPasswords({ current: "", next: "", confirm: "" });
      alert("Password updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Error updating password.");
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you absolutely sure? This action is permanent.")) {
      try {
        await API.delete(`/users/${user.id || user._id}`);
        logout();
      } catch (err) {
        alert("Error deleting account.");
      }
    }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      await API.delete(`/follow/block/${blockedUserId}`);
      const updatedBlockedList = user.blockedUsers.filter(u => (u.id || u._id) !== blockedUserId);
      onUserUpdate({ ...user, blockedUsers: updatedBlockedList });
      alert("User unblocked.");
    } catch (err) {
      alert("Failed to unblock user.");
    }
  };

  return (
    <div className="full-settings-layer">
      <div className="settings-container">
        <aside className="settings-sidebar">
          <button className="settings-back-btn" onClick={onClose}>
            <span className="arrow">←</span> <span className="btn-text">Back to Profile</span>
          </button>
          <nav className="settings-nav">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`nav-item ${activeSection === s.id ? "active" : ""}`}
                onClick={() => {
                    setActiveSection(s.id);
                    setIsEditingEmail(false);
                    setIsEditingPassword(false);
                }}
              >
                <span className="nav-icon">{s.icon}</span> <span className="nav-text">{s.id}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-button" onClick={logout}>Logout</button>
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-view-header">
            <h1>{activeSection} Settings</h1>
            <p>Manage your {activeSection.toLowerCase()} preferences.</p>
          </div>

          <div className="settings-scroll-area">
            {activeSection === "Account" && (
              <div className="settings-card-group">
                <div className="setting-row">
                  <div className="info">
                    <label>Email Address</label>
                    {isEditingEmail ? (
                      <div className="edit-input-wrapper">
                        <input className="shine-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" />
                      </div>
                    ) : (
                      <p>{user?.email || "user@shine.com"}</p>
                    )}
                  </div>
                  <div className="row-actions">
                    {isEditingEmail ? (
                      <>
                        <button className="save-btn" onClick={handleEmailUpdate} disabled={loading}>Save</button>
                        <button className="cancel-btn" onClick={() => setIsEditingEmail(false)}>Cancel</button>
                      </>
                    ) : (
                      <button className="action-btn" onClick={() => setIsEditingEmail(true)}>Change</button>
                    )}
                  </div>
                </div>

                <div className="setting-row" style={{ flexDirection: isEditingPassword ? 'column' : 'row', alignItems: isEditingPassword ? 'flex-start' : 'center' }}>
                  <div className="info">
                    <label>Password</label>
                    {isEditingPassword ? (
                      <div className="password-form">
                        <input type="password" className="shine-input" placeholder="Current Password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} />
                        <input type="password" className="shine-input" placeholder="New Password" value={passwords.next} onChange={(e) => setPasswords({...passwords, next: e.target.value})} />
                        <input type="password" className="shine-input" placeholder="Confirm New Password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} />
                      </div>
                    ) : (
                      <p>Keep your password strong for security.</p>
                    )}
                  </div>
                  <div className="row-actions" style={{ marginTop: isEditingPassword ? '15px' : '0' }}>
                    {isEditingPassword ? (
                      <>
                        <button className="save-btn" onClick={handlePasswordUpdate} disabled={loading}>Update</button>
                        <button className="cancel-btn" onClick={() => setIsEditingPassword(false)}>Cancel</button>
                      </>
                    ) : (
                      <button className="action-btn" onClick={() => setIsEditingPassword(true)}>Update</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "Blocked" && (
              <div className="settings-card-group">
                {user?.blockedUsers?.length > 0 ? (
                    user.blockedUsers.map(u => (
                        <div key={u.id || u._id} className="setting-row">
                             <p>@{u.username}</p>
                             <button className="action-btn" onClick={() => handleUnblock(u.id || u._id)}>Unblock</button>
                        </div>
                    ))
                ) : (
                    <div className="empty-settings-state">
                        <span className="big-icon">🚫</span>
                        <p>You haven't blocked anyone yet.</p>
                    </div>
                )}
              </div>
            )}

            {activeSection === "Account" && (
              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <div className="setting-row no-border">
                  <div className="info">
                    <label style={{color: '#ff4d4d'}}>Delete Account</label>
                    <p>This action is permanent.</p>
                  </div>
                  <button className="danger-action-btn" onClick={handleDeleteAccount}>Delete</button>
                </div>
              </div>
            )}

            {(activeSection !== "Account" && activeSection !== "Blocked") && (
              <div className="empty-settings-state">
                <span className="big-icon">⏳</span>
                <h3>Coming Soon</h3>
                <p>We're working on {activeSection.toLowerCase()} controls.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        .full-settings-layer { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #f8f9fa; z-index: 9999; display: flex; animation: pageFadeIn 0.3s ease; }
        .settings-container { display: flex; width: 100%; max-width: 1200px; margin: 0 auto; background: #fff; height: 100%; }
        .settings-sidebar { width: 280px; border-right: 1px solid #eee; padding: 40px 20px; display: flex; flex-direction: column; }
        .settings-back-btn { background: #1C274C; color: #FFC847; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-bottom: 40px; text-align: left; transition: transform 0.2s; display: flex; align-items: center; gap: 8px; }
        .settings-nav { flex: 1; }
        .nav-item { display: flex; align-items: center; width: 100%; padding: 14px 15px; border: none; background: none; border-radius: 10px; color: #555; font-size: 16px; font-weight: 500; cursor: pointer; margin-bottom: 5px; transition: 0.2s; }
        .nav-item.active { background: #f0f4ff; color: #1C274C; font-weight: 700; }
        .nav-icon { margin-right: 12px; font-size: 18px; }
        .settings-main { flex: 1; padding: 60px 80px; display: flex; flex-direction: column; background: #fff; overflow-y: auto; }
        .settings-view-header h1 { font-size: 32px; color: #1C274C; margin-bottom: 10px; }
        .settings-view-header p { color: #888; margin-bottom: 40px; }
        .settings-card-group { background: #fcfcfc; border: 1px solid #eee; border-radius: 16px; padding: 10px 25px; margin-bottom: 30px; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .setting-row.no-border { border-bottom: none; }
        .setting-row label { display: block; font-weight: 700; color: #1C274C; margin-bottom: 4px; }
        .shine-input { padding: 12px 15px; border-radius: 10px; border: 1.5px solid #eee; background: #fff; width: 100%; max-width: 300px; outline: none; margin-top: 8px; }
        .action-btn, .save-btn, .cancel-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid #ddd; background: #fff; font-weight: 600; cursor: pointer; }
        .save-btn { background: #1C274C; color: #FFC847; border: none; }
        .danger-zone { margin-top: 20px; border: 1px solid #ffebeb; border-radius: 16px; padding: 25px; }
        .danger-action-btn { padding: 10px 20px; background: #ff4d4d; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .sidebar-footer { padding-top: 20px; border-top: 1px solid #eee; }
        .logout-button { width: 100%; padding: 12px; border: 1px solid #eee; background: #fff; border-radius: 10px; color: #ff4d4d; font-weight: 700; cursor: pointer; }

        /* RESPONSIVE OVERRIDES */
        @media (max-width: 850px) {
          .settings-container { flex-direction: column; }
          .settings-sidebar { 
            width: 100%; 
            height: auto; 
            padding: 10px 15px; 
            flex-direction: row; 
            align-items: center;
            border-right: none;
            border-bottom: 1px solid #eee;
          }
          .settings-back-btn { margin-bottom: 0; padding: 8px 12px; }
          .settings-back-btn .btn-text { display: none; }
          .settings-nav { 
            display: flex; 
            flex: 1; 
            justify-content: flex-end; 
            gap: 5px; 
          }
          .nav-item { margin-bottom: 0; padding: 10px; width: auto; }
          .nav-text { display: none; }
          .nav-icon { margin-right: 0; }
          .sidebar-footer { display: none; } /* Hide footer on mobile sidebar */
          .settings-main { padding: 20px; }
          .setting-row { flex-direction: column; align-items: flex-start; gap: 15px; }
          .row-actions { width: 100%; display: flex; justify-content: flex-end; }
          .shine-input { max-width: 100%; }
          .password-form { width: 100%; }
        }

        @keyframes pageFadeIn { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}