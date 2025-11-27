import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import NotificationStack from '../components/shared/Notification';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import ProgressModal from '../components/shared/ProgressModal';

const NotificationContext = createContext(null);

const defaultConfirmation = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  icon: null,
  tone: 'warning',
  onConfirm: null,
  onCancel: null,
};

const defaultProgress = {
  open: false,
  title: '',
  message: '',
  progress: null,
  status: 'pending',
  icon: null,
  closable: false,
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [confirmation, setConfirmation] = useState(defaultConfirmation);
  const [progressState, setProgressState] = useState(defaultProgress);
  const progressTimerRef = useRef(null);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback((message, type = 'info', options = {}) => {
    const id = options.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = options.duration ?? 4000;
    const icon = options.icon ?? null;

    setNotifications((prev) => [
      ...prev,
      {
        id,
        message,
        type,
        duration,
        icon,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      },
    ]);

    return id;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmation(defaultConfirmation);
  }, []);

  const showConfirmation = useCallback((config) => {
    return new Promise((resolve) => {
      setConfirmation({
        open: true,
        title: config.title ?? 'Confirm Action',
        message: config.message ?? '',
        confirmLabel: config.confirmLabel ?? 'Confirm',
        cancelLabel: config.cancelLabel ?? 'Cancel',
        icon: config.icon ?? null,
        tone: config.tone ?? 'warning',
        onConfirm: async () => {
          try {
            if (typeof config.onConfirm === 'function') {
              await config.onConfirm();
            }
            resolve(true);
          } finally {
            hideConfirmation();
          }
        },
        onCancel: () => {
          if (typeof config.onCancel === 'function') {
            config.onCancel();
          }
          resolve(false);
          hideConfirmation();
        },
      });
    });
  }, [hideConfirmation]);

  const showProgress = useCallback((config) => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setProgressState({
      open: true,
      title: config.title ?? 'Working...',
      message: config.message ?? '',
      progress: typeof config.progress === 'number' ? config.progress : null,
      status: config.status ?? 'pending',
      icon: config.icon ?? null,
      closable: config.closable ?? false,
    });
  }, []);

  const updateProgress = useCallback((updates) => {
    setProgressState((prev) => {
      if (!prev.open) {
        return prev;
      }

      const next = { ...prev };

      if (typeof updates.title === 'string') {
        next.title = updates.title;
      }

      if (typeof updates.message === 'string') {
        next.message = updates.message;
      }

      if (typeof updates.progress === 'number') {
        next.progress = updates.progress;
      }

      if (typeof updates.status === 'string') {
        next.status = updates.status;
      }

      if (typeof updates.closable === 'boolean') {
        next.closable = updates.closable;
      }

      if (updates.icon !== undefined) {
        next.icon = updates.icon;
      }

      return next;
    });
  }, []);

  const hideProgress = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setProgressState(defaultProgress);
  }, []);

  const completeProgress = useCallback((options = {}) => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    const { status = 'success', message, autoDismiss = 1500 } = options;

    setProgressState((prev) => {
      if (!prev.open) {
        return prev;
      }

      return {
        ...prev,
        status,
        message: message ?? prev.message,
        closable: true,
      };
    });

    if (autoDismiss && typeof window !== 'undefined') {
      progressTimerRef.current = window.setTimeout(() => {
        hideProgress();
      }, autoDismiss);
    }
  }, [hideProgress]);

  const contextValue = useMemo(() => ({
    showNotification,
    removeNotification,
    clearNotifications,
    showConfirmation,
    hideConfirmation,
    showProgress,
    updateProgress,
    completeProgress,
    hideProgress,
  }), [
    showNotification,
    removeNotification,
    clearNotifications,
    showConfirmation,
    hideConfirmation,
    showProgress,
    updateProgress,
    completeProgress,
    hideProgress,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationStack notifications={notifications} onClose={removeNotification} />
      <ConfirmationModal {...confirmation} />
      <ProgressModal {...progressState} onClose={hideProgress} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
};

export default NotificationContext;
