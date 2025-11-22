import React from 'react';
import { useCloud } from '../../context/CloudContext';
import './CloudAccountCard.css';

const CloudAccountCard = ({ account }) => {
  const { selectedAccount, setSelectedAccount, fetchFiles } = useCloud();

  const handleSelect = () => {
    setSelectedAccount(account);
    fetchFiles(account.id);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    if (!account.totalStorage || !account.usedStorage) return 0;
    return (account.usedStorage / account.totalStorage) * 100;
  };

  const getProviderIcon = () => {
    switch (account.providerName) {
      case 'GOOGLE_DRIVE':
        return '📁';
      case 'ONEDRIVE':
        return '☁️';
      case 'DROPBOX':
        return '📦';
      default:
        return '💾';
    }
  };

  const isSelected = selectedAccount?.id === account.id;

  return (
    <div
      className={`cloud-account-card ${isSelected ? 'selected' : ''}`}
      onClick={handleSelect}
    >
      <div className="account-header">
        <span className="provider-icon">{getProviderIcon()}</span>
        <div className="account-info">
          <h4>{account.providerName.replace('_', ' ')}</h4>
          <p className="account-email">{account.accountEmail}</p>
        </div>
      </div>

      <div className="storage-info">
        <div className="storage-bar">
          <div
            className="storage-used"
            style={{ width: `${getStoragePercentage()}%` }}
          ></div>
        </div>
        <p className="storage-text">
          {formatBytes(account.usedStorage)} / {formatBytes(account.totalStorage)}
        </p>
      </div>
    </div>
  );
};

export default CloudAccountCard;