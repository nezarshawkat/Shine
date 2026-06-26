import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function ContentManager({ type, label, titleField = "text" }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    const { data } = await adminRequest("get", `/${type}`, null, { q: query });
    setItems(data.data);
  };

  useEffect(() => { load(); }, [type]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const update = async (id, payload) => {
    await adminRequest("put", `/${type}/${id}`, payload);
    load();
  };

  const remove = async (id) => {
    await adminRequest("delete", `/${type}/${id}`);
    load();
  };

  return (
    <section>
      <h2>{label}</h2>
      <div className="toolbar">
        <input
          value={query}
          placeholder={`Search ${label.toLowerCase()}`}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <button onClick={load}>Search</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Content</th><th>Status</th><th>Engagement</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item[titleField]}</td>
              <td>{item.status}</td>
              <td>{item.engagement}</td>
              <td className="actions">
                <button onClick={() => update(item.id, { featured: !item.featured })}>{item.featured ? "Unfeature" : "Feature"}</button>
                <button className="danger" onClick={() => remove(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4}>No {label.toLowerCase()} found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
