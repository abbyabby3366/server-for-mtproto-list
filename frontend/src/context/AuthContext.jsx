import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('jwt'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  });

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('jwt', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    setToken(null);
    setUser({});
    window.location.href = '/login';
  }, []);

  // Custom authenticated fetch wrapper that handles token injection and 401s
  const authFetch = useCallback(async (url, options = {}) => {
    if (!options.headers) {
      options.headers = {};
    }
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, options);
      if (response.status === 401) {
        logout();
      }
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }, [token, logout]);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, authFetch, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
