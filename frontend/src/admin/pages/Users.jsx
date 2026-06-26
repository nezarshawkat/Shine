import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

const ROLE_STAGES = ["Starter", "Intermediate", "Proffesional"];

const ROLE_COLORS = {
  Starter: { color: "#8C6A00", backgroundColor: "#FFF3CD" },
  Intermediate: { color: "#0D6EFD", backgroundColor: "#DDEBFF" },
  Proffesional: { color: "#198754", backgroundColor: "#DCF5E4" },
};

const normalizeRole = (roleLevel) => {
  if (ROLE_STAGES.includes(roleLevel)) return roleLevel;
  if (roleLevel === "Advanced") return "Intermediate";
  if (roleLevel === "Professional") return "Proffesional";
  return "Starter";
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    const { data } = await adminRequest("get", "/users", null, { q: query });
    setUsers(data.data);
  };

  useEffect(() => { load(); }, []);

  const update = async (id, payload) => {
    await adminRequest("put", `/users/${id}`, payload);
    load();
  };

  const promote = async (user) => {
    const currentStage = normalizeRole(user.roleLevel);
    const currentIndex = ROLE_STAGES.indexOf(currentStage);
    const nextStage = ROLE_STAGES[Math.min(currentIndex + 1, ROLE_STAGES.length - 1)];
    await update(user.id, { roleLevel: nextStage });
  };

  const toggleBlock = async (id) => {
    await adminRequest("patch", `/users/${id}/block`);
    load();
  };

  const remove = async (id) => {
    await adminRequest("delete", `/users/${id}`);
    load();
  };

  return (
    <section>
      <h2>Users</h2>
      <div className="toolbar">
        <input value={query} placeholder="Search users" onChange={(e) => setQuery(e.target.value)} />
        <button onClick={load}>Search</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Stage</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => {
            const stage = normalizeRole(u.roleLevel);
            const atMaxStage = stage === ROLE_STAGES[ROLE_STAGES.length - 1];
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <span style={{ padding: "4px 10px", borderRadius: 999, fontWeight: 600, ...ROLE_COLORS[stage] }}>
                    {stage}
                  </span>
                </td>
                <td>{u.isAuthorized ? "Active" : "Blocked"}</td>
                <td className="actions">
                  <button onClick={() => promote(u)} disabled={atMaxStage}>
                    {atMaxStage ? "Max Stage" : "Promote"}
                  </button>
                  <button onClick={() => toggleBlock(u.id)}>{u.isAuthorized ? "Block" : "Unblock"}</button>
                  <button className="danger" onClick={() => remove(u.id)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
