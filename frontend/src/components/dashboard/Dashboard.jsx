import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCloud } from '../../context/CloudContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CloudAccountCard from './CloudAccountCard';
import FileManager from '../files/FileManager';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { cloudAccounts, fetchCloudAccounts, connectGoogleDrive } = useCloud();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check if returning from OAuth
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'google') {
      setShowSuccess(true);
      fetchCloudAccounts();
      setTimeout(() => setShowSuccess(false), 5000);
    }

    if (error) {
      alert('Error connecting to cloud: ' + error);
    }
  }, [searchParams]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <h1>Multi-Cloud Storage</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}!</span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      {showSuccess && (
        <div className="success-banner">
          ✓ Successfully connected to Google Drive!
        </div>
      )}

      <div className="dashboard-container">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Cloud Accounts</h3>
            <button
              className="btn-connect-cloud"
              onClick={connectGoogleDrive}
            >
              + Connect Google Drive
            </button>

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
              <h2>Welcome to Multi-Cloud Storage!</h2>
              <p>Connect your cloud accounts to get started.</p>
              <button
                className="btn-primary"
                onClick={connectGoogleDrive}
              >
                Connect Google Drive
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;