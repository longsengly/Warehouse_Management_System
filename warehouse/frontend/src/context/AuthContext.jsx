import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync profile when token changes or on startup
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const profile = await api.get('/auth/me');
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  // Listen to global 401 logouts
  useEffect(() => {
    const handleLogoutEvent = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      
      // Let the useEffect load user details from API
      return true;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      login,
      logout,
      hasRole,
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'manager' || user?.role === 'admin',
      isStaff: user?.role === 'staff' || user?.role === 'manager' || user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
