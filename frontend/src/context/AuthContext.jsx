import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setHasSurvey(false);
      setLoading(false);
      return;
    }

    try {
      const me = await api.getMe();
      setUser(me);
      // Check if user has taken the survey
      const profile = await api.getProfile();
      if (profile && Array.isArray(profile.favorite_movies) && profile.favorite_movies.length > 0) {
        setHasSurvey(true);
      } else {
        setHasSurvey(false);
      }
    } catch (err) {
      console.warn('Auth check failed:', err.message);
      api.logout();
      setUser(null);
      setHasSurvey(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    // Check profile
    try {
      const profile = await api.getProfile();
      const surveyed = Boolean(
        profile && Array.isArray(profile.favorite_movies) && profile.favorite_movies.length > 0
      );
      setHasSurvey(surveyed);
      return { user: data.user, hasSurvey: surveyed };
    } catch {
      setHasSurvey(false);
      return { user: data.user, hasSurvey: false };
    }
  };

  const register = async (email, password) => {
    await api.register(email, password);
    // Automatically log in after registration
    const data = await api.login(email, password);
    setUser(data.user);
    setHasSurvey(false); // Brand new user has not taken survey yet
    return { user: data.user, hasSurvey: false };
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setHasSurvey(false);
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getProfile();
      const surveyed = Boolean(
        profile && Array.isArray(profile.favorite_movies) && profile.favorite_movies.length > 0
      );
      setHasSurvey(surveyed);
      return surveyed;
    } catch {
      setHasSurvey(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        hasSurvey,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        setHasSurvey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
