import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCloud } from '../../context/CloudContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CloudAccountCard from './CloudAccountCard';
import FileManager from '../files/FileManager';
import './Dashboard.css';
import { useNotifications } from '../../context/NotificationContext';
import { providerLogos, appLogo, homeScreenLogo } from '../../assets/logos';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { cloudAccounts, fetchCloudAccounts, connectGoogleDrive, connectOneDrive, connectDropbox } = useCloud();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { showNotification } = useNotifications();
  const [isNightMode, setIsNightMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const storedPreference = localStorage.getItem('night-mode');
    if (storedPreference !== null) {
      return storedPreference === 'true';
    }

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchCloudAccounts();
  }, [fetchCloudAccounts]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('night-mode', isNightMode);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('night-mode', JSON.stringify(isNightMode));
    }
  }, [isNightMode]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    document.body.classList.toggle('sidebar-open', isSidebarOpen);

    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    // Check if returning from OAuth
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      const providerNames = {
        google: 'Google Drive',
        onedrive: 'OneDrive',
        dropbox: 'Dropbox',
      };
      const providerName = providerNames[connected] ?? connected;
      const successText = `Successfully connected to ${providerName}!`;
      setSuccessMessage(successText);
      setShowSuccess(true);
      showNotification(successText, 'success');
      fetchCloudAccounts();
      setTimeout(() => setShowSuccess(false), 5000);
      window.history.replaceState({}, '', '/dashboard');
    }

    if (error) {
      showNotification(`Error connecting to cloud: ${error}`, 'error');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams, fetchCloudAccounts, showNotification]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleNightMode = () => {
    setIsNightMode((prev) => !prev);
  };

  const handleConnectGoogle = () => {
    showNotification('Redirecting to Google Drive authorization...', 'info');
    setIsSidebarOpen(false);
    connectGoogleDrive();
  };

  const handleConnectOneDrive = () => {
    showNotification('Redirecting to OneDrive authorization...', 'info');
    setIsSidebarOpen(false);
    connectOneDrive();
  };

  const handleConnectDropbox = () => {
    showNotification('Redirecting to Dropbox authorization...', 'info');
    setIsSidebarOpen(false);
    connectDropbox();
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <button
          type="button"
          className={`btn-sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
          onClick={handleToggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-controls="dashboard-sidebar"
          aria-label="Toggle sidebar"
        >
          <span className="btn-sidebar-toggle__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="dashboard-brand">
          <img src={appLogo} alt="Multi-Cloud Storage logo" className="dashboard-brand__logo" />
          <div className="dashboard-brand__text">
            <h1>Multi-Cloud Storage</h1>
            <span className="dashboard-brand__subtitle">Unified workspace for your files</span>
          </div>
        </div>
        <div className="user-info">
          <span className="user-info__welcome">Welcome, {user?.username}!</span>
          <button
            type="button"
            onClick={toggleNightMode}
            className={`btn-night-toggle ${isNightMode ? 'active' : ''}`}
            aria-pressed={isNightMode}
          >
            <span className="btn-night-toggle__icon" aria-hidden="true">
              {isNightMode ? '☀️' : '🌙'}
            </span>
            {isNightMode ? 'Light Mode' : 'Night Mode'}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      {showSuccess && (
        <div className="success-banner">
          ✓ {successMessage}
        </div>
      )}

      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="dashboard-container">
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} id="dashboard-sidebar">
          <button
            type="button"
            className="btn-close-sidebar"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            X
          </button>
          <div className="sidebar-section">
            <h3>Cloud Accounts</h3>
            
            <div className="connect-buttons">
              <button
                className="btn-connect-cloud google"
                onClick={handleConnectGoogle}
              >
                <span className="icon" aria-hidden="true">
                  <img src={providerLogos.GOOGLE_DRIVE} alt="" className="cloud-logo" />
                </span>
                <span className="btn-label">Connect Google Drive</span>
              </button>

              <button
                className="btn-connect-cloud onedrive"
                onClick={handleConnectOneDrive}
              >
                <span className="icon" aria-hidden="true">
                  <img src={providerLogos.ONEDRIVE} alt="" className="cloud-logo" />
                </span>
                <span className="btn-label">Connect OneDrive</span>
              </button>

              <button
                className="btn-connect-cloud dropbox"
                onClick={handleConnectDropbox}
              >
                <span className="icon" aria-hidden="true">
                  <img src={providerLogos.DROPBOX} alt="" className="cloud-logo" />
                </span>
                <span className="btn-label">Connect Dropbox</span>
              </button>
            </div>

            <div className="cloud-accounts-list">
              {cloudAccounts.length === 0 ? (
                <p className="no-accounts">No cloud accounts connected</p>
              ) : (
                cloudAccounts.map((account) => (
                  <CloudAccountCard key={account.id} account={account} />
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="main-content">
          {cloudAccounts.length > 0 ? (
            <FileManager />
          ) : (
            <div className="empty-state">
              <img
                src={homeScreenLogo}
                alt="Multi-Cloud workspace illustration"
                className="empty-state__illustration"
              />
              <h2>Welcome to Multi-Cloud Storage!</h2>
              <p>Connect your cloud accounts to get started.</p>
              <div className="empty-state-buttons">
                <button
                  className="btn-primary google-btn btn-with-icon"
                  onClick={handleConnectGoogle}
                >
                  <span className="icon" aria-hidden="true">
                    <img src={providerLogos.GOOGLE_DRIVE} alt="" className="cloud-logo" />
                  </span>
                  <span className="btn-label">Connect Google Drive</span>
                </button>
                <button
                  className="btn-primary onedrive-btn btn-with-icon"
                  onClick={handleConnectOneDrive}
                >
                  <span className="icon" aria-hidden="true">
                    <img src={providerLogos.ONEDRIVE} alt="" className="cloud-logo" />
                  </span>
                  <span className="btn-label">Connect OneDrive</span>
                </button>
                <button
                  className="btn-primary dropbox-btn btn-with-icon"
                  onClick={handleConnectDropbox}
                >
                  <span className="icon" aria-hidden="true">
                    <img src={providerLogos.DROPBOX} alt="" className="cloud-logo" />
                  </span>
                  <span className="btn-label">Connect Dropbox</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} Crafted by Vivek Yadav</p>
      </footer>
    </div>
  );
};

export default Dashboard;