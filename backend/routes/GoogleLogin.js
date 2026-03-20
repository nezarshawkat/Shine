import { useEffect } from "react";

export default function GoogleLogin() {
  // The API URL from env (Render backend)
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });

    window.google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      {
        theme: "outline",
        size: "large",
        width: "300"
      }
    );
  }, []);

  async function handleCredentialResponse(response) {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: response.credential
        })
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        console.error("Google login failed:", data);
        alert("Login failed. Check console for details.");
      }
    } catch (err) {
      console.error("Network or server error:", err);
      alert("Server error. Try again later.");
    }
  }

  return <div id="googleBtn"></div>;
}