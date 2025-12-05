import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const {
    cloudAccounts,
    fetchCloudAccounts,
    connectGoogleDrive,
    connectOneDrive,
    connectDropbox,
    selectedAccount,
    setSelectedAccount,
    syncAccount,
  } = useCloud();
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isConnectMenuOpen, setIsConnectMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const connectMenuRef = useRef(null);

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
    setIsUserMenuOpen(false);
  };

  const handleConnectGoogle = () => {
    showNotification('Redirecting to Google Drive authorization...', 'info');
    setIsSidebarOpen(false);
    setIsConnectMenuOpen(false);
    connectGoogleDrive();
  };

  const handleConnectOneDrive = () => {
    showNotification('Redirecting to OneDrive authorization...', 'info');
    setIsSidebarOpen(false);
    setIsConnectMenuOpen(false);
    connectOneDrive();
  };

  const handleConnectDropbox = () => {
    showNotification('Redirecting to Dropbox authorization...', 'info');
    setIsSidebarOpen(false);
    setIsConnectMenuOpen(false);
    connectDropbox();
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const providerCatalog = useMemo(() => ([
    {
      providerName: 'GOOGLE_DRIVE',
      label: 'Google Drive',
      description: 'Shared docs, spreadsheets, and slides.',
      icon: providerLogos.GOOGLE_DRIVE,
      connect: handleConnectGoogle,
    },
    {
      providerName: 'ONEDRIVE',
      label: 'OneDrive',
      description: 'Projects synced across Microsoft 365.',
      icon: providerLogos.ONEDRIVE,
      connect: handleConnectOneDrive,
    },
    {
      providerName: 'DROPBOX',
      label: 'Dropbox',
      description: 'Creative assets and shared folders.',
      icon: providerLogos.DROPBOX,
      connect: handleConnectDropbox,
    },
  ]), [handleConnectGoogle, handleConnectOneDrive, handleConnectDropbox]);

  const accountEntries = useMemo(() => (
    providerCatalog.flatMap((provider) => {
      const accountsForProvider = cloudAccounts.filter((account) => account.providerName === provider.providerName);

      if (accountsForProvider.length === 0) {
        return [{
          key: `${provider.providerName}-disconnected`,
          account: null,
          provider,
          status: 'disconnected',
        }];
      }

      return accountsForProvider.map((account) => ({
        key: account.id,
        account,
        provider,
        status: 'connected',
      }));
    })
  ), [cloudAccounts, providerCatalog]);

  const handleSelectAccount = (account) => {
    if (!account) {
      return;
    }
    setSelectedAccount(account);
    setIsSidebarOpen(false);
  };

  const handleSyncAccount = async (accountId, providerLabel) => {
    try {
      showNotification(`Syncing ${providerLabel}…`, 'info');
      await syncAccount(accountId);
      showNotification(`${providerLabel} synced successfully`, 'success');
    } catch (error) {
      console.error('Sync failed', error);
      showNotification(error?.message || 'Failed to sync account', 'error');
    }
  };

  const formattedUsername = user?.username
    ? `${user.username.charAt(0).toUpperCase()}${user.username.slice(1).toLowerCase()}`
    : 'User';
  const userInitial = formattedUsername.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isConnectMenuOpen) {
      return;
    }

    const handleClick = (event) => {
      if (connectMenuRef.current && !connectMenuRef.current.contains(event.target)) {
        setIsConnectMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isConnectMenuOpen]);

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="dashboard-nav__left">
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
        </div>

        <div className="dashboard-nav__right">
          <div className="user-welcome">
            <span className="user-welcome__label">Welcome back,</span>
            <span className="user-welcome__name">{formattedUsername}</span>
          </div>
          <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className={`user-avatar ${isUserMenuOpen ? 'open' : ''}`}
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
              aria-label="Open user actions"
            >
              <span>{userInitial}</span>
            </button>
            <div className={`user-menu__dropdown ${isUserMenuOpen ? 'open' : ''}`} role="menu">
              <button
                type="button"
                className={`user-menu__item theme ${isNightMode ? 'active' : ''}`}
                onClick={toggleNightMode}
                role="menuitem"
              >
                <span className="user-menu__icon" aria-hidden="true">{isNightMode ? '☀️' : '🌙'}</span>
                <div>
                  <span className="user-menu__item-title">{isNightMode ? 'Switch to Light Mode' : 'Switch to Night Mode'}</span>
                  <span className="user-menu__item-sub">Instant theme toggle</span>
                </div>
              </button>
              <button
                type="button"
                className="user-menu__item logout"
                onClick={handleLogout}
                role="menuitem"
              >
                <span className="user-menu__icon" aria-hidden="true">⎋</span>
                <div>
                  <span className="user-menu__item-title">Logout</span>
                  <span className="user-menu__item-sub">Sign out securely</span>
                </div>
              </button>
            </div>
          </div>
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
            <div className="sidebar-header">
              <h3>Connections</h3>
              <div className="sidebar-primary" ref={connectMenuRef}>
                <button
                  type="button"
                  className={`sidebar-primary__trigger ${isConnectMenuOpen ? 'open' : ''}`}
                  onClick={() => setIsConnectMenuOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isConnectMenuOpen}
                >
                  <span className="sidebar-primary__icon" aria-hidden="true">+</span>
                  <span>Add New Cloud</span>
                </button>
                <div className={`sidebar-primary__menu ${isConnectMenuOpen ? 'open' : ''}`} role="menu">
                  <button type="button" className="sidebar-primary__item" onClick={handleConnectGoogle} role="menuitem">
                    <img src={providerLogos.GOOGLE_DRIVE} alt="" aria-hidden="true" />
                    <div>
                      <span>Google Drive</span>
                      <small>Docs, Sheets, Slides</small>
                    </div>
                  </button>
                  <button type="button" className="sidebar-primary__item" onClick={handleConnectOneDrive} role="menuitem">
                    <img src={providerLogos.ONEDRIVE} alt="" aria-hidden="true" />
                    <div>
                      <span>OneDrive</span>
                      <small>SharePoint &amp; Office files</small>
                    </div>
                  </button>
                  <button type="button" className="sidebar-primary__item" onClick={handleConnectDropbox} role="menuitem">
                    <img src={providerLogos.DROPBOX} alt="" aria-hidden="true" />
                    <div>
                      <span>Dropbox</span>
                      <small>Creative team assets</small>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="sidebar-security">
              <span className="sidebar-security__badge">Secured by OAuth 2.0</span>
              <span className="sidebar-security__meta">Tokens rotate every 60 minutes.</span>
            </div>

            <div className="cloud-accounts-list">
              {accountEntries.map(({ key, account, provider, status }) => (
                <CloudAccountCard
                  key={key}
                  account={account}
                  provider={provider}
                  status={status}
                  isActive={Boolean(account && selectedAccount?.id === account.id)}
                  onSelect={() => handleSelectAccount(account)}
                  onConnect={provider.connect}
                  onSync={() => account && handleSyncAccount(account.id, provider.label)}
                />
              ))}
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