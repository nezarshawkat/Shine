import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import Header from "./Header";
import { BACKEND_URL } from "../api";
import "../styles/Donate.css";

const Donate = () => {
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Access logged-in user
  const user = JSON.parse(localStorage.getItem("user"));

  // Check URL for status messages from Stripe
  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";

  const presets = [5, 10, 25, 50];

  const handleDonate = async () => {
    const finalAmount = customAmount || amount;
    
    if (!finalAmount || finalAmount < 1) {
      alert("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/donate`, {
        amount: finalAmount,
        userId: user?.id || user?._id || null 
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error("Donation error:", err);
      alert("There was an issue connecting to the payment gateway. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donate-page">
      <Header />
      <div className="donate-container">
        
        {/* Success Message Banner */}
        {isSuccess && (
          <div className="status-banner success">
            <h2>🎉 Thank You!</h2>
            <p>Your support helps keep Shine running. Check your email for a receipt.</p>
          </div>
        )}

        {/* Cancel Message Banner */}
        {isCanceled && (
          <div className="status-banner error">
            <p>Payment was not completed. If you had trouble, please contact support.</p>
          </div>
        )}

        <h1>Support Shine</h1>
        <p className="subtitle">Help us keep the community running and growing.</p>
        
        <div className="donation-card">
          <h3>Choose an amount</h3>
          <div className="preset-grid">
            {presets.map((val) => (
              <button 
                key={val} 
                className={amount === val ? "active" : ""} 
                onClick={() => {setAmount(val); setCustomAmount("");}}
              >
                ${val}
              </button>
            ))}
          </div>
          
          <input 
            type="number" 
            placeholder="Custom Amount ($)" 
            value={customAmount}
            onChange={(e) => {setCustomAmount(e.target.value); setAmount(null);}}
            className="custom-input"
          />

          <button 
            className="confirm-button" 
            onClick={handleDonate}
            disabled={loading}
          >
            {loading ? "Processing..." : `Donate $${customAmount || amount}`}
          </button>

          <p className="security-note">🔒 Secure transaction via Stripe</p>
        </div>

        <div className="impact-section">
          <h3>Where your money goes</h3>
          <ul>
            <li><strong>Servers:</strong> Keeping the site fast and online 24/7.</li>
            <li><strong>Security:</strong> Protecting your data and privacy.</li>
            <li><strong>Growth:</strong> Adding new features suggested by you.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Donate;