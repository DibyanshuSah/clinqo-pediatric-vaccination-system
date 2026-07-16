import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kiddos_token') || null);
  const [loading, setLoading] = useState(true);
  const [activeClinic, setActiveClinic] = useState('all');
  const [clinics, setClinics] = useState([]);

  // Base API URL
  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

  // Configure Axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('kiddos_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('kiddos_token');
    }
  }, [token]);

  // Load user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // Ensure Axios authorization header is set correctly
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const res = await axios.get(`${API_URL}/auth/me`);
        setUser(res.data);
        // Load clinics if user is doctor
        if (res.data.role === 'doctor') {
          const clinicsRes = await axios.get(`${API_URL}/clinics`);
          setClinics(clinicsRes.data);
        }
      } catch (err) {
        console.error('Session restore failed:', err.response?.data || err.message);
        // Clear invalid token
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [token]);

  const loadClinics = async () => {
    if (token && user?.role === 'doctor') {
      try {
        const clinicsRes = await axios.get(`${API_URL}/clinics`);
        setClinics(clinicsRes.data);
      } catch (err) {
        console.error('Failed to load clinics:', err);
      }
    }
  };

  const login = async (credentials) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, credentials);
      const userToken = res.data.token;
      
      // Configure Axios header immediately to avoid race conditions
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      localStorage.setItem('kiddos_token', userToken);
      
      setToken(userToken);
      setUser(res.data);
      if (res.data.role === 'doctor') {
        const clinicsRes = await axios.get(`${API_URL}/clinics`);
        setClinics(clinicsRes.data);
      }
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_URL}/auth/logout`).catch(() => {});
      }
    } finally {
      setToken(null);
      setUser(null);
      setClinics([]);
      setActiveClinic('all');
      localStorage.removeItem('kiddos_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeClinic,
        setActiveClinic,
        clinics,
        setClinics,
        loadClinics,
        login,
        logout,
        API_URL
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
