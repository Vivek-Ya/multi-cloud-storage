import React, { useEffect, useMemo, useRef, useState } from 'react';
import { providerLogos, appLogo } from '../../assets/logos';
import { useCloud } from '../../context/CloudContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatFileSize, getProviderName } from '../../utils/helpers';
import './CloudAccountCard.css';

const CloudAccountCard = ({
  account,
  provider,
  status = 'connected',
  isActive = false,
  onSelect,
  onConnect,
  onSync,
}) => {
  const { setSelectedAccount, disconnectAccount } = useCloud();
  const { showNotification } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const effectiveStatus = status || (account ? 'connected' : 'disconnected');
  const providerName = account?.providerName || provider?.providerName;
  const providerLabel = provider?.label || getProviderName(providerName);
  const logoSrc = provider?.icon || providerLogos[providerName] || appLogo;
  const emailLabel = account?.accountEmail || 'Not connected';
  const lastSync = account?.lastSyncedAt || account?.updatedAt;

  const storageStats = useMemo(() => {
    if (!account?.totalStorage || !account?.usedStorage) {
      return { percentage: 0, label: 'Storage unavailable', tone: 'info' };
    }

    const rawPercentage = (account.usedStorage / account.totalStorage) * 100;
    const percentage = Math.min(rawPercentage, 100);

    let tone = 'normal';
    if (percentage >= 90) {
      tone = 'critical';
    } else if (percentage >= 75) {
      tone = 'warn';
    }

    return {
      percentage,
      label: `${formatFileSize(account.usedStorage || 0)} of ${formatFileSize(account.totalStorage)} (${Math.round(percentage)}%)`,
      tone,
    };
  }, [account]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSelect = () => {
    if (!account) {
      return;
    }

    setSelectedAccount(account);
    onSelect?.(account);
  };

  const handleDisconnect = async () => {
    if (!account) {
      return;
    }

    const confirmation = window.confirm(
      `Disconnect ${providerLabel} (${emailLabel})?`
    );

    if (!confirmation) {
      return;
    }

    try {
      await disconnectAccount(account.id);
      showNotification(`${providerLabel} disconnected`, 'success');
    } catch (error) {
      showNotification(error?.message || 'Failed to disconnect account', 'error');
    } finally {
      setMenuOpen(false);
    }
  };

  const handleConnect = () => {
    onConnect?.();
    setMenuOpen(false);
  };

  const handleSync = () => {
    if (!account) {
      return;
    }

    onSync?.();
    setMenuOpen(false);
  };

  const statusLabelMap = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    syncing: 'Syncing…',
  };

  const statusLabel = statusLabelMap[effectiveStatus] || 'Status';

  const cardClassNames = [
    'cloud-account-card',
    effectiveStatus,
    providerName ? `provider-${providerName.toLowerCase()}` : '',
    isActive ? 'selected' : '',
    menuOpen ? 'menu-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClassNames}
      role={account ? 'button' : 'article'}
      tabIndex={account ? 0 : -1}
      onClick={account ? handleSelect : undefined}
      onKeyPress={(event) => {
        if (!account) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          handleSelect();
        }
      }}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="account-header">
        <div className="account-header__leading">
          <span className="provider-icon">
            <img src={logoSrc} alt="" className="provider-logo" />
          </span>
          <div className="account-info">
            <div className="account-info__row">
              <h4>{providerLabel}</h4>
              {isActive ? (
                <span
                  className="account-active-indicator"
                  title="Currently active connection"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={`status-tag status-${effectiveStatus}`}
                title={`Status: ${statusLabel}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="account-email" title={emailLabel}>
              {emailLabel}
            </p>
          </div>
        </div>

        <div className="account-header__actions" ref={menuRef}>
          <button
            type="button"
            className={`account-menu ${menuOpen ? 'open' : ''}`}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={`${providerLabel} actions`}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
          >
            ⋯
          </button>
          <div className={`account-menu__dropdown ${menuOpen ? 'open' : ''}`} role="menu">
            {effectiveStatus === 'connected' ? (
              <>
                <button type="button" className="account-menu__item" onClick={handleSync} role="menuitem">
                  <span aria-hidden="true">⟳</span>
                  <span>Sync now</span>
                </button>
                <button type="button" className="account-menu__item" onClick={handleSelect} role="menuitem">
                  <span aria-hidden="true">⭐</span>
                  <span>Mark active</span>
                </button>
                <button type="button" className="account-menu__item danger" onClick={handleDisconnect} role="menuitem">
                  <span aria-hidden="true">🗑️</span>
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button type="button" className="account-menu__item" onClick={handleConnect} role="menuitem">
                <span aria-hidden="true">➕</span>
                <span>Connect now</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {effectiveStatus === 'connected' ? (
        <div className="account-body">
          <div className={`storage-bar storage-${storageStats.tone}`}>
            <div className="storage-bar__progress" style={{ width: `${storageStats.percentage}%` }}>
              <span className="storage-bar__shine" />
            </div>
          </div>
          <div className="account-meta">
            <span className="account-meta__stat">{storageStats.label}</span>
            <span
              className="account-meta__sync"
              title={lastSync ? `Last synced on ${new Date(lastSync).toLocaleString()}` : 'Automatic sync is active'}
            >
              <span
                className={`sync-indicator ${lastSync ? 'sync-indicator--calm' : ''}`}
                aria-hidden="true"
              />
              {lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : 'Sync schedule active'}
            </span>
          </div>
        </div>
      ) : (
        <div className="account-body account-body--empty">
          <p>{provider?.description || 'Connect to start syncing files securely.'}</p>
          <button type="button" className="connect-inline" onClick={handleConnect}>
            <span aria-hidden="true">➕</span>
            <span>Connect {providerLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CloudAccountCard;