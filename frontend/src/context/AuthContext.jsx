import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const accessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);
  const expiresAtRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Show toast notification
  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Schedule token refresh before expiry
  const scheduleRefresh = useCallback((expiresIn) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60 seconds before expiry
    const refreshMs = Math.max((expiresIn - 60) * 1000, 10000);
    refreshTimerRef.current = setTimeout(async () => {
      if (!refreshTokenRef.current) return;
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshTokenRef.current }),
        });
        if (res.ok) {
          const data = await res.json();
          accessTokenRef.current = data.access_token;
          refreshTokenRef.current = data.refresh_token;
          expiresAtRef.current = Date.now() + data.expires_in * 1000;
          scheduleRefresh(data.expires_in);
        } else {
          logout();
          showToast('Session expired, please log in again');
        }
      } catch {
        logout();
        showToast('Session expired, please log in again');
      }
    }, refreshMs);
  }, []);

  // Login
  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Login failed');
      }

      const data = await res.json();
      accessTokenRef.current = data.access_token;
      refreshTokenRef.current = data.refresh_token;
      expiresAtRef.current = Date.now() + data.expires_in * 1000;
      setUser(data.user);
      scheduleRefresh(data.expires_in);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [scheduleRefresh]);

  // Logout
  const logout = useCallback(() => {
    if (accessTokenRef.current) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessTokenRef.current}` },
      }).catch(() => { });
    }
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    expiresAtRef.current = null;
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
  }, []);

  // Authenticated fetch wrapper
  const authFetch = useCallback(async (url, options = {}) => {
    const token = accessTokenRef.current;
    if (!token) {
      logout();
      showToast('Session expired, please log in again');
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch(url.startsWith('http') ? url : `${API_BASE}${url}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      logout();
      showToast('Session expired, please log in again');
      throw new Error('Unauthorized');
    }

    return res;
  }, [logout, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, authFetch, showToast, toast, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
