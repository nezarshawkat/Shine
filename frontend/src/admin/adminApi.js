import API from "../api";

export function getAdminToken() {
  return localStorage.getItem("adminToken");
}

export function setAdminToken(token) {
  if (!token) localStorage.removeItem("adminToken");
  else localStorage.setItem("adminToken", token);
}

export async function adminRequest(method, url, data, params) {
  const token = getAdminToken();
  return API({
    method,
    url: `/admin${url}`,
    data,
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
