import React, { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

export default function ContentManager({ type, label, titleField = "text" }) {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await adminRequest("get", `/${type}`);
    setItems(data.data);
  };

  useEffect(() => { load(); }, [type]);

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
        </tbody>
      </table>
    </section>
  );
}
