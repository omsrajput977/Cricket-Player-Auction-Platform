import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cricauction_token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest('/auth/me');
        if (res.success && res.data.user) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Session restoration failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('cricauction_token', res.data.token);
      return res.data;
    }
  };

  const registerAdmin = async (name, email, password) => {
    const res = await apiRequest('/auth/register-admin', {
      method: 'POST',
      body: { name, email, password },
    });

    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('cricauction_token', res.data.token);
      return res.data;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cricauction_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerAdmin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isTeamOwner: user?.role === 'TEAM_OWNER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
