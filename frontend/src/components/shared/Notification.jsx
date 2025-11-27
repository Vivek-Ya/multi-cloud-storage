import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  AlertTitle,
  Button,
  IconButton,
  Slide,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const typeIconMap = {
  success: <CheckCircleIcon fontSize="inherit" />,
  error: <ErrorOutlineIcon fontSize="inherit" />,
  info: <InfoOutlinedIcon fontSize="inherit" />,
  warning: <WarningAmberIcon fontSize="inherit" />,
};

const typeStyles = {
  success: {
    label: 'Success',
    accent: 'var(--accent-success)',
    borderColor: 'rgba(34, 197, 94, 0.32)',
    iconBackground: 'rgba(34, 197, 94, 0.14)',
    gradient: 'linear-gradient(180deg, rgba(34, 197, 94, 0.85) 0%, rgba(34, 197, 94, 0.32) 100%)',
  },
  error: {
    label: 'Error',
    accent: 'var(--accent-error)',
    borderColor: 'rgba(239, 68, 68, 0.32)',
    iconBackground: 'rgba(239, 68, 68, 0.16)',
    gradient: 'linear-gradient(180deg, rgba(239, 68, 68, 0.85) 0%, rgba(239, 68, 68, 0.3) 100%)',
  },
  info: {
    label: 'Info',
    accent: 'var(--accent-info)',
    borderColor: 'rgba(37, 99, 235, 0.32)',
    iconBackground: 'rgba(37, 99, 235, 0.14)',
    gradient: 'linear-gradient(180deg, rgba(37, 99, 235, 0.85) 0%, rgba(37, 99, 235, 0.32) 100%)',
  },
  warning: {
    label: 'Warning',
    accent: 'var(--accent-warning)',
    borderColor: 'rgba(245, 158, 11, 0.32)',
    iconBackground: 'rgba(245, 158, 11, 0.16)',
    gradient: 'linear-gradient(180deg, rgba(245, 158, 11, 0.9) 0%, rgba(245, 158, 11, 0.34) 100%)',
  },
};

const SlideLeft = (props) => <Slide {...props} direction="left" />;

const baseOffset = 16;
const verticalSpacing = 76;

const NotificationStack = ({ notifications, onClose }) => (
  <>
    {notifications.map((notification, index) => {
      const {
        id,
        message,
        type,
        duration,
        icon,
        actionLabel,
        onAction,
      } = notification;

      const palette = typeStyles[type] ?? typeStyles.info;

      const offset = baseOffset + index * verticalSpacing;

      return (
        <Snackbar
          key={id}
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={duration}
          onClose={(event, reason) => {
            if (reason === 'clickaway') {
              return;
            }
            onClose(id);
          }}
          TransitionComponent={SlideLeft}
          style={{ top: offset }}
          sx={{ zIndex: 1400 + index }}
        >
          <Alert
            elevation={0}
            variant="outlined"
            severity={type}
            icon={icon ?? typeIconMap[type]}
            sx={{
              position: 'relative',
              background: 'var(--surface-1)',
              borderColor: palette.borderColor,
              color: 'var(--text-primary)',
              minWidth: 320,
              maxWidth: 420,
              borderRadius: '18px',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 18px 40px var(--shadow-color)',
              transition: 'all 0.3s ease',
              padding: '16px 18px 16px 20px',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '0 auto 0 0',
                width: '5px',
                borderRadius: '16px 0 0 16px',
                background: palette.gradient,
              },
              '& .MuiAlert-icon': {
                color: palette.accent,
                fontSize: '20px',
                background: palette.iconBackground,
                borderRadius: '50%',
                padding: '6px',
                alignSelf: 'flex-start',
              },
              '& .MuiAlert-message': {
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.45,
              },
              '& .MuiAlert-action': {
                alignItems: 'center',
              },
              '& .MuiAlertTitle-root': {
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--text-primary)',
                opacity: 0.84,
              },
              '& .MuiButton-root': {
                color: palette.accent,
              },
            }}
            action={(
              <>
                {actionLabel && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      if (typeof onAction === 'function') {
                        onAction();
                      }
                      onClose(id);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      letterSpacing: '0.3px',
                      fontSize: '0.78rem',
                    }}
                  >
                    {actionLabel}
                  </Button>
                )}
                <IconButton
                  size="small"
                  aria-label="Dismiss notification"
                  onClick={() => onClose(id)}
                  sx={{ color: palette.accent }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            )}
          >
            <AlertTitle>{palette.label}</AlertTitle>
            {message}
          </Alert>
        </Snackbar>
      );
    })}
  </>
);

NotificationStack.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['success', 'error', 'info', 'warning']).isRequired,
      duration: PropTypes.number,
      icon: PropTypes.node,
      actionLabel: PropTypes.string,
      onAction: PropTypes.func,
    }),
  ),
  onClose: PropTypes.func.isRequired,
};

NotificationStack.defaultProps = {
  notifications: [],
};

export default NotificationStack;
