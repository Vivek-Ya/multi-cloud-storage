import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const statusConfig = {
  pending: {
    color: 'var(--accent-primary)',
    label: 'In progress',
  },
  success: {
    color: '#22c55e',
    label: 'Completed',
    icon: <CheckCircleIcon sx={{ fontSize: 34, color: '#22c55e' }} />,
  },
  error: {
    color: '#f87171',
    label: 'Failed',
    icon: <ErrorOutlineIcon sx={{ fontSize: 34, color: '#f87171' }} />,
  },
};

const ProgressModal = ({
  open,
  title,
  message,
  progress,
  status,
  icon,
  onClose,
  closable,
}) => (
  <Dialog
    open={open}
    onClose={(_, reason) => {
      if (!closable && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
        return;
      }
      if (closable) {
        onClose?.();
      }
    }}
    aria-labelledby="progress-dialog-title"
    aria-describedby="progress-dialog-description"
    sx={{
      '& .MuiPaper-root': {
        borderRadius: '20px',
        background: 'var(--surface-1)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
        width: 380,
      },
    }}
  >
    <DialogTitle id="progress-dialog-title" sx={{ pb: 1 }}>
      {title}
    </DialogTitle>
    <DialogContent id="progress-dialog-description">
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          {statusConfig[status]?.icon ?? icon ?? (
            <CircularProgress color="inherit" size={32} thickness={5} sx={{ color: statusConfig[status]?.color }} />
          )}
          <Box>
            <Typography variant="subtitle2" sx={{ color: statusConfig[status]?.color ?? 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {statusConfig[status]?.label}
            </Typography>
            {message && (
              <Typography variant="body2" sx={{ color: 'var(--text-primary)', mt: 0.5 }}>
                {message}
              </Typography>
            )}
          </Box>
        </Stack>

        {typeof progress === 'number' && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(Math.max(progress, 0), 100)}
              sx={{
                height: 10,
                borderRadius: 999,
                backgroundColor: 'rgba(102, 126, 234, 0.18)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                },
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--text-secondary)', textAlign: 'right' }}>
              {Math.ceil(progress)}%
            </Typography>
          </Box>
        )}
      </Stack>
    </DialogContent>
  </Dialog>
);

ProgressModal.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string,
  progress: PropTypes.number,
  status: PropTypes.oneOf(['pending', 'success', 'error']),
  icon: PropTypes.node,
  onClose: PropTypes.func,
  closable: PropTypes.bool,
};

ProgressModal.defaultProps = {
  open: false,
  title: 'Working... ',
  message: '',
  progress: null,
  status: 'pending',
  icon: undefined,
  onClose: undefined,
  closable: false,
};

export default ProgressModal;
