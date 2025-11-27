import React, { useState } from 'react';
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
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { useCloud } from '../../context/CloudContext';
import { useNotifications } from '../../context/NotificationContext';
import './FolderCreate.css';

const FolderDialogTransition = React.forwardRef(function FolderDialogTransition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const FolderCreate = () => {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const { selectedAccount, createFolder } = useCloud();
  const { showNotification, showProgress, completeProgress } = useNotifications();

  const handleOpen = () => {
    if (!selectedAccount) {
      showNotification('Select a cloud account before creating folders.', 'warning');
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFolderName('');
  };

  const handleCreate = async () => {
    const trimmed = folderName.trim();

    if (!trimmed) {
      showNotification('Folder name cannot be empty.', 'warning');
      return;
    }

    try {
      showProgress({
        title: 'Creating folder...',
        message: trimmed,
        status: 'pending',
      });

      await createFolder(selectedAccount.id, trimmed);
      handleClose();
      completeProgress({ status: 'success', message: 'Folder created successfully.' });
      showNotification('Folder created successfully!', 'success');
    } catch (error) {
      console.error('Failed to create folder', error);
      completeProgress({ status: 'error', message: error?.message || 'Failed to create folder.' });
      showNotification(error?.message || 'Failed to create folder.', 'error');
    }
  };

  return (
    <>
      <button
        className="btn-create-folder"
        onClick={handleOpen}
      >
        📁 New Folder
      </button>

      <Dialog
        open={open}
        TransitionComponent={FolderDialogTransition}
        keepMounted
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return;
          }
          handleClose();
        }}
        aria-labelledby="create-folder-dialog-title"
        aria-describedby="create-folder-dialog-description"
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '24px',
            background: 'var(--surface-1)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
            width: 420,
          },
        }}
      >
        <DialogTitle id="create-folder-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CreateNewFolderIcon sx={{ color: 'var(--accent-primary)' }} />
          Create New Folder
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="create-folder-dialog-description"
            sx={{ color: 'var(--text-secondary)', mb: 2 }}
          >
            Enter a name for the new folder in {selectedAccount?.providerName?.replace('_', ' ')}.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            label="Folder name"
            variant="outlined"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreate();
              }
            }}
            inputProps={{ 'aria-label': 'Folder name' }}
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
            onClick={handleClose}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px' }}
            disabled={!folderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FolderCreate;