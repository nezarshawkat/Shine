import { useEffect } from "react";

export default function GoogleLogin() {

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!window.google) return;

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
        console.error("Login failed");
      }

    } catch (err) {
      console.error("❌ Google login error:", err);
    }
  }

  return <div id="googleBtn"></div>;
}