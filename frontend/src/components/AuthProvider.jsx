import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL, BACKEND_URL } from "../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  
  // Function to refresh user data from the server
  const refreshUser = async (username, currentToken) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/users/${username}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        // Crucial: Keep userId at the top level for easy access in other components
        localStorage.setItem("userId", res.data.id);
        return res.data;
      }
    } catch (err) {
      console.error("User refresh failed:", err);
      if (err.response?.status === 401) logout();
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          
          // Ensure userId is present in localStorage if it was missing
          if (!localStorage.getItem("userId")) {
            localStorage.setItem("userId", parsedUser.id);
          }

          // Fetch fresh data from backend
          await refreshUser(parsedUser.username, storedToken);
        } catch (err) {
          console.error("Session initialization failed:", err);
          logout(); 
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("userId", userData.id);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
  };

  // Helper to manually update user state without a full re-fetch
  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userId: user?.id, // Helper for quick access
      token, 
      login, 
      logout, 
      updateUser, 
      refreshUser, 
      loading 
    }}>
      {!loading ? children : (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem',
          color: '#1C274C'
        }}>
          Loading session...
        </div>
      )}
    </AuthContext.Provider>
  );
};