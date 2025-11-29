import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slide,
  TextField,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CopyModal = ({ file, accounts, currentAccountId, onClose, onSubmit }) => {
  const open = Boolean(file);
  const availableAccounts = useMemo(
    () => (accounts || []).filter((account) => account.id !== currentAccountId),
    [accounts, currentAccountId]
  );
  const [targetAccountId, setTargetAccountId] = useState(availableAccounts[0]?.id || '');
  const [targetFolderId, setTargetFolderId] = useState('');

  useEffect(() => {
    if (file) {
      setTargetAccountId(availableAccounts[0]?.id || '');
      setTargetFolderId('');
    }
  }, [file, availableAccounts]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!targetAccountId) {
      return;
    }
    onSubmit?.(targetAccountId, targetFolderId.trim());
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
        onClose?.();
      }}
      aria-labelledby="copy-dialog-title"
      aria-describedby="copy-dialog-description"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '24px',
          background: 'var(--surface-1)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
          width: 460,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="copy-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ContentCopyIcon sx={{ color: 'var(--accent-primary)' }} />
          Copy File
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DialogContentText
            id="copy-dialog-description"
            sx={{
              color: 'var(--text-secondary)',
              '& strong': { color: 'var(--text-primary)' },
            }}
          >
            Choose a destination account for <strong>{file?.fileName}</strong>.
          </DialogContentText>

          {availableAccounts.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '14px' }}>
              Connect at least one additional cloud account to copy files across providers.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth>
                <InputLabel id="copy-target-account-label">Destination account</InputLabel>
                <Select
                  labelId="copy-target-account-label"
                  value={targetAccountId}
                  label="Destination account"
                  onChange={(event) => setTargetAccountId(event.target.value)}
                  sx={{
                    borderRadius: '14px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent-primary)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent-primary)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--accent-primary)',
                      boxShadow: '0 0 0 1px rgba(116, 249, 255, 0.35)',
                    },
                  }}
                >
                  {availableAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.providerName.replace('_', ' ')} &mdash; {account.accountEmail}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Destination folder (optional)"
                value={targetFolderId}
                onChange={(event) => setTargetFolderId(event.target.value)}
                placeholder="Folder ID or path depending on provider"
                helperText="Leave blank to copy into the root of the destination account."
                InputProps={{
                  sx: {
                    borderRadius: '14px',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'var(--surface-2)',
                    '& fieldset': {
                      borderColor: 'var(--accent-primary)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--accent-primary)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--accent-primary)',
                      boxShadow: '0 0 0 1px rgba(116, 249, 255, 0.35)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: 'var(--text-primary)',
                  },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={onClose} variant="text" color="inherit" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px' }}
            disabled={!targetAccountId || availableAccounts.length === 0}
          >
            Copy
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

CopyModal.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    fileName: PropTypes.string,
  }),
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      providerName: PropTypes.string,
      accountEmail: PropTypes.string,
    })
  ),
  currentAccountId: PropTypes.number,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
};

CopyModal.defaultProps = {
  file: null,
  accounts: [],
  currentAccountId: undefined,
  onClose: undefined,
  onSubmit: undefined,
};

export default CopyModal;
