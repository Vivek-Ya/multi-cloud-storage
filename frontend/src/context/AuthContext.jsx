import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const currentUser = authService.getCurrentUser();
        const authenticated = authService.isAuthenticated();
        
        if (authenticated && currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          // Clear invalid auth data
          authService.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(credentials);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.signup(userData);
      
      // Note: After signup, user typically needs to login
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Signup failed. Please try again.';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedUser = await authService.updateProfile(userData);
      
      setUser(prev => ({ ...prev, ...updatedUser }));
      
      return updatedUser;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update profile.';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.changePassword(currentPassword, newPassword);
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to change password.';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if token is about to expire and refresh if needed
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiration = async () => {
      const expiration = authService.getTokenExpiration();
      if (!expiration) return;

      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = expiration - currentTime;

      // If token expires in less than 5 minutes, try to refresh
      if (timeUntilExpiry < 300) {
        try {
          await authService.refreshToken();
        } catch (error) {
          console.error('Token refresh failed:', error);
          logout();
        }
      }
    };

    // Check token expiration every minute
    const interval = setInterval(checkTokenExpiration, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
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