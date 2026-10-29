import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cricauction_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('cricauction_token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user if token exists
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await apiRequest('/auth/me');
        if (isMounted) {
          if (res.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('cricauction_user', JSON.stringify(res.data.user));
          } else {
            logout();
          }
        }
      } catch (err) {
        // Only log out if server explicitly returned 401 Unauthorized or 403 Forbidden
        if (err.status === 401 || err.status === 403) {
          console.warn('Session expired or invalid, logging out:', err.message);
          if (isMounted) logout();
        } else {
          // If request was aborted during rapid page refresh or network dropped, retain cached session!
          console.warn('Network or transient error during session check; retaining session:', err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
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
      localStorage.setItem('cricauction_user', JSON.stringify(res.data.user));
      return res.data;
    }
  };

  const registerAdmin = async (name, email, password, adminSecretKey) => {
    const res = await apiRequest('/auth/register-admin', {
      method: 'POST',
      body: { name, email, password, adminSecretKey },
    });

    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('cricauction_token', res.data.token);
      localStorage.setItem('cricauction_user', JSON.stringify(res.data.user));
      return res.data;
    }
  };

  const loginWithGoogle = async (credentialOrPayload) => {
    const body =
      typeof credentialOrPayload === 'string'
        ? { credential: credentialOrPayload }
        : credentialOrPayload;

    const res = await apiRequest('/auth/google', {
      method: 'POST',
      body,
    });

    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('cricauction_token', res.data.token);
      localStorage.setItem('cricauction_user', JSON.stringify(res.data.user));
      return res.data;
    }
  };

  const sendSchoolEmailCode = async (email, tournamentId) => {
    return await apiRequest('/auth/school-email/send-code', {
      method: 'POST',
      body: { email, tournamentId },
    });
  };

  const verifySchoolEmailCode = async (email, code, name) => {
    const res = await apiRequest('/auth/school-email/verify-code', {
      method: 'POST',
      body: { email, code, name },
    });

    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('cricauction_token', res.data.token);
      localStorage.setItem('cricauction_user', JSON.stringify(res.data.user));
      return res.data;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cricauction_token');
    localStorage.removeItem('cricauction_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        sendSchoolEmailCode,
        verifySchoolEmailCode,
        registerAdmin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isTeamOwner: user?.role === 'TEAM_OWNER',
        isSpectator: user?.role === 'SPECTATOR',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
