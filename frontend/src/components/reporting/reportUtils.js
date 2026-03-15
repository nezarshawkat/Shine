import API from "../../api";

export async function submitReport(token, payload) {
  return API.post("/reports", payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
