import { useEffect } from "react";

export default function GoogleLogin() {
  /**
   * FIX 1: Variable Name Mismatch
   * Your .env uses VITE_BACKEND_URL, not VITE_API_URL.
   */
  const API_URL = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    // Check if the google script is loaded to prevent crashes
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        // Using 'popup' is more reliable for Vercel/Render cross-domain setups
        ux_mode: "popup" 
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        {
          theme: "outline",
          size: "large",
          width: "300"
        }
      );
    }
  }, []);

  async function handleCredentialResponse(response) {
    try {
      // Ensure there's no double slash if API_URL ends with /
      const cleanBaseUrl = API_URL.replace(/\/$/, "");
      
      const res = await fetch(`${cleanBaseUrl}/api/auth/google`, {
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
        /**
         * FIX 2: Persistence
         * You must save the user data to localStorage so your 
         * AuthProvider/Header can see the user is logged in.
         */
        localStorage.setItem("user", JSON.stringify(data.user));

        /**
         * FIX 3: Route Redirect
         * Redirect to home or profile (adjust based on your App.jsx routes)
         */
        window.location.href = "/"; 
      } else {
        console.error("Google login failed on backend:", data);
        alert("Login failed. Check backend environment variables.");
      }
    } catch (err) {
      console.error("Network or server error:", err);
      alert("Cannot reach the backend server. Is it running?");
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
      <div id="googleBtn"></div>
    </div>
  );
}