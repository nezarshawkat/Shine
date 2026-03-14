import React, { useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider.jsx";
import { API_BASE_URL } from "../api";

/**
 * GoogleLogin Component
 * This uses the official Google Identity Services SDK to render a secure login button.
 */
export default function GoogleLogin() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google) {
        // 1. Initialize the Google client
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        // 2. Render the official Google button
        // The SDK will inject an iframe into the #googleBtn element
        window.google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          {
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "signin_with",
          }
        );

        // After rendering, force the iframe to full width
        setTimeout(() => {
          const iframe = document.querySelector('#googleBtn iframe');
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.borderRadius = '30px';
          }
        }, 100);
      }
    };

    // Load the Google Script dynamically
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      // Cleanup to prevent duplicate script tags on re-renders
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  /**
   * Success handler for Google Login
   * Sends the ID Token to your backend for verification
   */
  async function handleCredentialResponse(response) {
    try {
      const res = await axios.post(`${API_BASE_URL}/users/google`, {
        token: response.credential,
      });

      // Assuming your backend returns { success: true, user: {...}, token: "..." }
      if (res.data.success) {
        login(res.data.user, res.data.token);
        navigate("/forum");
      }
    } catch (err) {
      console.error("Google Auth Failed:", err);
      alert("Google Sign-In failed. Please try again.");
    }
  }

  return (
    /* This div is the target for Google's button rendering.
       The styling is largely controlled by the options object in renderButton,
       but the wrapper in your CSS handles its position in the form.
    */
    <div 
      id="googleBtn" 
      className="google-auth-container" 
      style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
    ></div>
  );
}