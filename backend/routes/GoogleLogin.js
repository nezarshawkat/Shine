import { useEffect } from "react";

export default function GoogleLogin() {

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

    const res = await fetch("/api/auth/google", {
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
    }

  }

  return <div id="googleBtn"></div>;
}
