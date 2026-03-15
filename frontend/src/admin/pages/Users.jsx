import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

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
        <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.username}</td><td>{u.email}</td><td>{u.isAuthorized ? "Active" : "Blocked"}</td>
              <td className="actions">
                <button onClick={() => update(u.id, { roleLevel: "Advanced" })}>Promote</button>
                <button onClick={() => toggleBlock(u.id)}>{u.isAuthorized ? "Block" : "Unblock"}</button>
                <button className="danger" onClick={() => remove(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
