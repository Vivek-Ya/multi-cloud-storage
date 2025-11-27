import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slide,
  TextField,
} from '@mui/material';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const RenameModal = ({ file, onClose, onSubmit }) => {
  const open = Boolean(file);
  const [value, setValue] = useState('');
  const currentName = useMemo(() => file?.fileName ?? '', [file]);

  useEffect(() => {
    if (file) {
      setValue(file.fileName);
    } else {
      setValue('');
    }
  }, [file]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed || trimmed === currentName) {
      return;
    }

    onSubmit?.(trimmed);
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
        onClose?.();
      }}
      TransitionComponent={Transition}
      keepMounted
      aria-labelledby="rename-dialog-title"
      aria-describedby="rename-dialog-description"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '24px',
          background: 'var(--surface-1)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
          width: 420,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="rename-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DriveFileRenameOutlineIcon sx={{ color: 'var(--accent-primary)' }} />
          Rename File
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="rename-dialog-description"
            sx={{
              color: 'var(--text-secondary)',
              mb: 2,
              '& strong': { color: 'var(--text-primary)' },
            }}
          >
            Choose a new name for <strong>{currentName}</strong>.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            value={value}
            onChange={(event) => setValue(event.target.value)}
            label="New file name"
            variant="outlined"
            inputProps={{
              'aria-label': 'New file name',
            }}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '14px',
              },
              '& .MuiOutlinedInput-root': {
                background: 'var(--surface-2)',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--accent-primary)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--accent-primary)',
                  boxShadow: '0 0 0 1px rgba(116, 249, 255, 0.35)',
                },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--accent-primary)',
              },
              '& .MuiInputBase-input': {
                color: 'var(--text-primary)',
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-secondary)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'var(--accent-primary)',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={onClose}
            variant="text"
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px' }}
            disabled={!value.trim() || value.trim() === currentName}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

RenameModal.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.string,
    fileName: PropTypes.string,
  }),
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
};

RenameModal.defaultProps = {
  file: null,
  onClose: undefined,
  onSubmit: undefined,
};

export default RenameModal;
