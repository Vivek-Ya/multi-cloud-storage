import React from 'react';
import { providerLogos, appLogo } from '../../assets/logos';
import { useCloud } from '../../context/CloudContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatFileSize, getProviderName } from '../../utils/helpers';
import './CloudAccountCard.css';

const CloudAccountCard = ({ account }) => {
  const { selectedAccount, setSelectedAccount, disconnectAccount } = useCloud();
  const { showNotification } = useNotifications();

  const handleSelect = () => {
    setSelectedAccount(account);
  };

  const handleDisconnect = async (event) => {
    event.stopPropagation();

    const emailLabel = account.accountEmail || 'this account';
    const confirmDisconnect = window.confirm(
      `Disconnect ${getProviderName(account.providerName)} (${emailLabel})?`
    );
    if (!confirmDisconnect) {
      return;
    }

    try {
      await disconnectAccount(account.id);
      showNotification(`${getProviderName(account.providerName)} account disconnected`, 'success');
    } catch (error) {
      showNotification(error?.message || 'Failed to disconnect account', 'error');
    }
  };

  const getStoragePercentage = () => {
    if (!account.totalStorage || !account.usedStorage) return 0;
    const percentage = (account.usedStorage / account.totalStorage) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  const getStorageColor = () => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) return '#f44336'; // Red
    if (percentage >= 75) return '#ff9800'; // Orange
    return '#667eea'; // Blue
  };

  const isSelected = selectedAccount?.id === account.id;

  const providerMap = {
    GOOGLE_DRIVE: 'google',
    ONEDRIVE: 'onedrive',
    DROPBOX: 'dropbox',
  };

  const providerClass = providerMap[account.providerName]
    ? `provider-${providerMap[account.providerName]}`
    : '';

  const logoSrc = providerLogos[account.providerName] ?? appLogo;

  return (
    <div
      className={`cloud-account-card ${providerClass} ${isSelected ? 'selected' : ''}`.trim()}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSelect();
        }
      }}
    >
      <div className="account-header">
        <span className="provider-icon">
          <img
            src={logoSrc}
            alt={`${getProviderName(account.providerName)} logo`}
            className="provider-logo"
          />
        </span>
        <div className="account-info">
          <h4>{getProviderName(account.providerName)}</h4>
          <p className="account-email">
            {account.accountEmail || 'No email'}
          </p>
        </div>
        <button
          type="button"
          className="btn-account-action"
          onClick={handleDisconnect}
          aria-label={`Disconnect ${getProviderName(account.providerName)}`}
        >
          Disconnect
        </button>
      </div>

      {account.totalStorage && (
        <div className="storage-info">
          <div className="storage-bar">
            <div
              className="storage-used"
              style={{ 
                width: `${getStoragePercentage()}%`,
                background: getStorageColor()
              }}
            ></div>
          </div>
          <p className="storage-text">
            {formatFileSize(account.usedStorage || 0)} of {formatFileSize(account.totalStorage)}
            {' '}({Math.round(getStoragePercentage())}%)
          </p>
        </div>
      )}

      {!account.totalStorage && (
        <div className="storage-info">
          <p className="storage-text" style={{ textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Storage info not available
          </p>
        </div>
      )}
    </div>
  );
};

export default CloudAccountCard;