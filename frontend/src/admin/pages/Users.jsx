import React, { useEffect, useState } from "react";
import adminApi from "../adminApi";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");

  const load = () => adminApi.get("/users", { params: { query } }).then((res) => setUsers(res.data.users || []));

  useEffect(() => { load(); }, []);

  const blockToggle = async (user) => {
    await adminApi.patch(`/users/${user.id}/status`, { blocked: user.isAuthorized });
    load();
  };

  const remove = async (id) => {
    await adminApi.delete(`/users/${id}`);
    load();
  };

  return (
    <div>
      <h2>Users Management</h2>
      <div className="toolbar">
        <input placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="admin-btn" onClick={load}>Search</button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.roleLevel}</td><td>{u.isAuthorized ? "Active" : "Blocked"}</td>
                <td>
                  <button className="admin-btn secondary" onClick={() => blockToggle(u)}>{u.isAuthorized ? "Block" : "Unblock"}</button>
                  <button className="admin-btn danger" onClick={() => remove(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
