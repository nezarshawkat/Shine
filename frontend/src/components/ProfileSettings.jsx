import React, { useState } from "react";
import API from "../api.js";
import { useTheme } from "./ThemeProvider.jsx";
import { useLanguage } from "./LanguageProvider.jsx";

export default function ProfileSettings({ onClose, user, logout, onUserUpdate }) {
  const [activeSection, setActiveSection] = useState("Account");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState(user?.blockedUsers || []);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const showToast = (message, type = "success") => setToast({ message, type });
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const sections = [
    { id: "Account", icon: "👤" },
    { id: "Privacy", icon: "🔒" },
    { id: "Notifications", icon: "🔔" },
    { id: "Appearance", icon: "✨" },
    { id: "Blocked", icon: "🚫" },
  ];

  const handleEmailUpdate = async () => {
    if (!newEmail.includes("@")) return showToast("Invalid email", "error");
    setLoading(true);
    try {
      const res = await API.put(`/users/${user.id || user._id}`, { email: newEmail });
      onUserUpdate(res.data.user);
      setIsEditingEmail(false);
      showToast("Email updated!");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update email.", "error");
    } finally { setLoading(false); }
  };

  const handlePasswordUpdate = async () => {
    if (passwords.next !== passwords.confirm) return showToast("Passwords do not match", "error");
    setLoading(true);
    try {
      await API.put(`/users/${user.id || user._id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.next
      });
      setIsEditingPassword(false);
      setPasswords({ current: "", next: "", confirm: "" });
      showToast("Password updated successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating password.", "error");
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you absolutely sure? This action is permanent.")) {
      try {
        await API.delete(`/users/${user.id || user._id}`);
        logout();
      } catch (err) {
        showToast("Error deleting account.", "error");
      }
    }
  };

  const handleUnblock = async (blockedUserId) => {
    if (!blockedUserId) {
      showToast("Failed to unblock user.", "error");
      return;
    }

    const normalizedBlockedUserId = String(blockedUserId);
    try {
      await API.delete(`/follow/block/${normalizedBlockedUserId}`, {
        headers: getAuthHeaders(),
      });
      const updatedBlockedList = blockedUsers.filter((u) => String(u.id || u._id) !== normalizedBlockedUserId);
      setBlockedUsers(updatedBlockedList);
      onUserUpdate({ ...user, blockedUsers: updatedBlockedList });
      showToast("User unblocked.");
    } catch (err) {
      console.error("Failed to unblock user", err?.response?.data || err);
      showToast("Failed to unblock user.", "error");
    }
  };

  React.useEffect(() => {
    let mounted = true;
    API.get("/follow/blocked", { headers: getAuthHeaders() })
      .then((res) => {
        if (mounted) setBlockedUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (mounted) setBlockedUsers(user?.blockedUsers || []);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id, user?._id]);

  return (
    <div className="full-settings-layer">
      {toast && (
        <div className={`settings-toast ${toast.type || "success"}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}
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
                {blockedUsers?.length > 0 ? (
                    blockedUsers.map(u => (
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


            {activeSection === "Appearance" && (
              <div className="settings-card-group">
                <div className="setting-row">
                  <div className="info">
                    <label>Theme</label>
                    <p>Choose how Shine should look on this device.</p>
                  </div>
                </div>

                <div className="setting-row" style={{ alignItems: "stretch", flexDirection: "column", gap: "12px" }}>
                  {[
                    { id: "system", title: "As system (default)", description: "Automatically follows your device theme." },
                    { id: "light", title: "Light mode", description: "Keep the current bright appearance." },
                    { id: "dark", title: "Dark mode", description: "Use the reversed dark appearance." },
                  ].map((option) => (
                    <button
                      key={option.id}
                      className="action-btn"
                      onClick={() => setTheme(option.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        borderColor: theme === option.id ? "#1C274C" : "#ddd",
                        background: theme === option.id ? "#f0f4ff" : "#fff",
                      }}
                    >
                      <strong>{option.title}</strong>
                      <p style={{ marginTop: "4px", color: "#666", fontWeight: 400 }}>{option.description}</p>
                    </button>
                  ))}
                </div>

                <div className="setting-row" style={{ alignItems: "stretch", flexDirection: "column", gap: "12px" }}>
                  <div className="info">
                    <label>Language</label>
                    <p>Choose the interface language. Post/community content stays original unless translated manually.</p>
                  </div>
                  <select
                    className="shine-input"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{ maxWidth: "100%" }}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="tr">Turkish</option>
                    <option value="ru">Russian</option>
                    <option value="uk">Ukrainian</option>
                    <option value="ar">Arabic (RTL)</option>
                    <option value="he">Hebrew (RTL)</option>
                    <option value="fa">Persian (RTL)</option>
                    <option value="ur">Urdu (RTL)</option>
                    <option value="hi">Hindi</option>
                    <option value="bn">Bengali</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese (Simplified)</option>
                    <option value="id">Indonesian</option>
                    <option value="vi">Vietnamese</option>
                    <option value="th">Thai</option>
                    <option value="sv">Swedish</option>
                    <option value="no">Norwegian</option>
                    <option value="da">Danish</option>
                    <option value="fi">Finnish</option>
                    <option value="el">Greek</option>
                    <option value="cs">Czech</option>
                    <option value="ro">Romanian</option>
                    <option value="hu">Hungarian</option>
                  </select>
                </div>
              </div>
            )}

            {(activeSection !== "Account" && activeSection !== "Blocked" && activeSection !== "Appearance") && (
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
        .settings-toast { position: fixed; right: 20px; top: 20px; z-index: 10001; background: #1C274C; color: #FFC847; border-radius: 10px; padding: 12px 14px; display: flex; gap: 10px; align-items: center; box-shadow: 0 10px 20px rgba(0,0,0,0.12); }
        .settings-toast.error { background: #FF4C4C; color: #fff; }
        .settings-toast button { border: none; background: transparent; color: inherit; cursor: pointer; font-size: 14px; }

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
