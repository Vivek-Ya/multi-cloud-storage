import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors on input change
    setLocalError('');
    if (authError) {
      clearError();
    }
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setLocalError('Username is required');
      return false;
    }
    if (!formData.password) {
      setLocalError('Password is required');
      return false;
    }
    if (formData.password.length < 4) {
      setLocalError('Password must be at least 4 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(formData);
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = 
        err.response?.data?.message || 
        err.message || 
        'Login failed. Please check your credentials and try again.';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero-content">
            <div className="auth-brand">Multi-Cloud Storage</div>
            <h1>Welcome back</h1>
            <p>
              Sign in to orchestrate every connected cloud provider from one
              streamlined command center.
            </p>
            <ul className="auth-highlights">
              <li>Monitor usage and costs in real time</li>
              <li>Sync files across AWS, Azure, and GCP instantly</li>
              <li>Enforced zero-trust security for every session</li>
            </ul>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h2>Sign in</h2>
            <p className="auth-subtitle">
              Enter your credentials to access the dashboard.
            </p>
          </div>

          {displayError && <div className="error-message">{displayError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">Session secured with AES-256 encryption.</div>

          <p className="auth-link">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;