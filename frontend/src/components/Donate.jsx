import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "./Header";
import { BACKEND_URL } from "../api";
import "../styles/Donate.css";

const PAYPAL_BUTTON_CONTAINER_ID = "paypal-donation-button-container";
const presets = [5, 10, 25, 50];

const Donate = () => {
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("");
  const [paypalConfig, setPaypalConfig] = useState(null);
  const paypalButtonsRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id || user?._id || null;

  const finalAmountNumber = useMemo(() => {
    const selectedAmount = customAmount || amount;
    const parsedAmount = Number.parseFloat(selectedAmount);
    return Number.isFinite(parsedAmount) ? parsedAmount : NaN;
  }, [amount, customAmount]);

  useEffect(() => {
    let isMounted = true;

    const loadPaypalConfig = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/paypal/config`);

        if (!isMounted) {
          return;
        }

        setPaypalConfig(response.data);
      } catch (error) {
        console.error("PayPal config error:", error);
        if (isMounted) {
          setStatusMessage("Unable to load PayPal checkout. Please try again later.");
          setStatusType("error");
        }
      }
    };

    loadPaypalConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!paypalConfig?.clientId) {
      return undefined;
    }

    if (window.paypal) {
      setSdkReady(true);
      return undefined;
    }

    const existingScript = document.querySelector('script[data-paypal-sdk="true"]');

    if (existingScript) {
      const handleLoad = () => setSdkReady(true);
      existingScript.addEventListener("load", handleLoad, { once: true });
      return () => existingScript.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    const currency = paypalConfig.currency || "USD";
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=${currency}&intent=capture`;
    script.async = true;
    script.dataset.paypalSdk = "true";
    script.onload = () => setSdkReady(true);
    script.onerror = () => {
      setStatusMessage("Unable to load PayPal checkout. Please refresh and try again.");
      setStatusType("error");
    };
    document.body.appendChild(script);

    return undefined;
  }, [paypalConfig]);

  useEffect(() => {
    const container = document.getElementById(PAYPAL_BUTTON_CONTAINER_ID);

    if (!sdkReady || !window.paypal || !container) {
      return undefined;
    }

    container.innerHTML = "";
    paypalButtonsRef.current?.close?.();
    paypalButtonsRef.current = null;

    const buttons = window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal",
        height: 48,
      },
      createOrder: async () => {
        if (!Number.isFinite(finalAmountNumber) || finalAmountNumber < 1) {
          setStatusMessage("Please enter a valid amount.");
          setStatusType("error");
          throw new Error("Invalid donation amount.");
        }

        try {
          setLoading(true);
          setStatusMessage("");
          setStatusType("");

          const response = await axios.post(`${BACKEND_URL}/api/paypal/create-order`, {
            amount: finalAmountNumber,
            userId,
          });

          if (!response.data?.orderID) {
            throw new Error("PayPal order setup failed.");
          }

          return response.data.orderID;
        } catch (error) {
          const message = error.response?.data?.error || error.message || "PayPal order setup failed.";
          setStatusMessage(message);
          setStatusType("error");
          setLoading(false);
          throw error;
        }
      },
      onApprove: async (data) => {
        try {
          const response = await axios.post(`${BACKEND_URL}/api/paypal/capture-order`, {
            orderID: data.orderID,
            userId,
          });

          setStatusMessage(response.data?.message || "Donation successful");
          setStatusType("success");
        } catch (error) {
          console.error("PayPal capture error:", error);
          setStatusMessage(error.response?.data?.error || "Unable to capture your donation. Please try again.");
          setStatusType("error");
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {
        setStatusMessage("Payment was not completed. If you had trouble, please contact support.");
        setStatusType("error");
        setLoading(false);
      },
      onError: (error) => {
        console.error("PayPal checkout error:", error);
        setStatusMessage("There was an issue connecting to PayPal. Please try again.");
        setStatusType("error");
        setLoading(false);
      },
    });

    paypalButtonsRef.current = buttons;
    buttons.render(`#${PAYPAL_BUTTON_CONTAINER_ID}`).catch((error) => {
      console.error("PayPal button render error:", error);
      setStatusMessage("Unable to initialize PayPal checkout. Please try again.");
      setStatusType("error");
      setLoading(false);
    });

    return () => {
      paypalButtonsRef.current?.close?.();
      paypalButtonsRef.current = null;
      container.innerHTML = "";
    };
  }, [sdkReady, finalAmountNumber, userId]);

  return (
    <div className="donate-page" style={{ fontFamily: "inherit" }}>
      <Header />
      <div className="donate-container" style={{ fontFamily: "inherit" }}>
        {statusMessage && (
          <div className={`status-banner ${statusType || "success"}`}>
            {statusType === "success" ? <h2>🎉 Thank You!</h2> : null}
            <p>{statusMessage}</p>
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
                onClick={() => {
                  setAmount(val);
                  setCustomAmount("");
                }}
                style={{ fontFamily: "inherit" }}
                type="button"
              >
                ${val}
              </button>
            ))}
          </div>

          <input
            type="number"
            placeholder="Custom Amount ($)"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setAmount(null);
            }}
            className="custom-input"
            style={{ fontFamily: "inherit" }}
          />

          <div className={`donate-button-shell ${loading ? "is-loading" : ""} ${sdkReady ? "is-ready" : ""}`}>
            <button
              className="confirm-button"
              disabled={loading || !sdkReady}
              style={{ fontFamily: "inherit" }}
              type="button"
            >
              {loading
                ? "Processing..."
                : !paypalConfig?.clientId
                  ? "Loading PayPal..."
                  : !sdkReady
                    ? "Initializing PayPal..."
                    : `Donate $${Number.isFinite(finalAmountNumber) ? finalAmountNumber : customAmount || amount}`}
            </button>
            <div
              id={PAYPAL_BUTTON_CONTAINER_ID}
              className={`paypal-button-overlay ${sdkReady && !loading ? "is-active" : ""}`}
              aria-hidden="true"
            />
          </div>

          <p className="security-note">
            🔒 Secure transaction via PayPal {paypalConfig?.environment === "live" ? "Live" : "Sandbox"}
          </p>
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
