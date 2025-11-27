import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Slide,
  Stack,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ConfirmationModal = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  icon,
  tone,
}) => (
  <Dialog
    open={open}
    TransitionComponent={Transition}
    keepMounted
    onClose={(_, reason) => {
      if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
        return;
      }
      onCancel?.();
    }}
    aria-labelledby="confirmation-dialog-title"
    aria-describedby="confirmation-dialog-description"
    sx={{
      '& .MuiPaper-root': {
        borderRadius: '24px',
        background: 'var(--surface-1)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
        minWidth: 360,
      },
    }}
  >
    <DialogTitle id="confirmation-dialog-title">
      <Stack direction="row" spacing={1.5} alignItems="center">
        {icon ?? (
          <WarningAmberIcon
            fontSize="large"
            sx={{ color: tone === 'danger' ? '#ff6b6b' : 'var(--accent-primary)' }}
          />
        )}
        {title}
      </Stack>
    </DialogTitle>
    <DialogContent>
      <DialogContentText
        id="confirmation-dialog-description"
        sx={{
          color: 'var(--text-secondary)',
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        {message}
      </DialogContentText>
    </DialogContent>
    <DialogActions sx={{ padding: '0 24px 20px', gap: 1 }}>
      <Button
        onClick={onCancel}
        variant="outlined"
        color="inherit"
        sx={{ borderRadius: '12px', borderColor: 'var(--border-color)' }}
      >
        {cancelLabel}
      </Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        color={tone === 'danger' ? 'error' : 'primary'}
        sx={{
          borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(102, 126, 234, 0.35)',
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

ConfirmationModal.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  icon: PropTypes.node,
  tone: PropTypes.oneOf(['default', 'warning', 'danger']),
};

ConfirmationModal.defaultProps = {
  open: false,
  title: 'Confirm Action',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  onConfirm: undefined,
  onCancel: undefined,
  icon: undefined,
  tone: 'warning',
};

export default ConfirmationModal;
