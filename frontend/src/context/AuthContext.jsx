import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set default axios authorization headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  // Load user profile on mount or token change
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get('/api/auth/me');
        const profile = response.data;
        const full_name = `${profile.last_name || ''} ${profile.first_name || ''} ${profile.patronymic || ''}`.trim();
        setUser({ ...profile, full_name });
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // Clear token on authentication error
        setToken('');
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  // Login handler
  const login = async (username, password) => {
    // Backend OAuth2 expects form-urlencoded data: username & password
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await axios.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token, role, full_name, id_employee } = response.data;
      
      // Update token state, which triggers axios headers & localStorage write
      setToken(access_token);
      // Immediately set temporary user details (before the get_me request updates it)
      setUser({
        id_employee,
        role,
        full_name
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Не удалось войти в систему. Проверьте сеть.';
      return { success: false, error: errorMsg };
    }
  };

  // Logout handler
  const logout = () => {
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
