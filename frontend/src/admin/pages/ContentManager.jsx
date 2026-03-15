import React, { useEffect, useState } from "react";
import adminApi from "../adminApi";

export default function ContentManager({ resource, title, columns }) {
  const [items, setItems] = useState([]);

  const load = () => adminApi.get(`/${resource}`).then((res) => setItems(res.data.items || []));
  useEffect(() => { load(); }, [resource]);

  const feature = async (id, isFeatured) => {
    await adminApi.patch(`/${resource}/${id}/feature`, { isFeatured: !isFeatured });
    load();
  };

  const remove = async (id) => {
    await adminApi.delete(`/${resource}/${id}`);
    load();
  };

  return (
    <div>
      <h2>{title}</h2>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((c) => <td key={c.key}>{item[c.key] ?? "-"}</td>)}
                <td>
                  <button className="admin-btn secondary" onClick={() => feature(item.id, item.isFeatured)}>{item.isFeatured ? "Unfeature" : "Feature"}</button>
                  <button className="admin-btn danger" onClick={() => remove(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
