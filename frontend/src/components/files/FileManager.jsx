import React, { useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import FileList from './FileList';
import FileUpload from './FileUpload';
import FileSearch from './FileSearch';
import FolderCreate from './FolderCreate';
import './FileManager.css';
import DragDropZone from './DragDropZone';
import { useNotifications } from '../../context/NotificationContext';
import RenameModal from './RenameModal';
import { providerLogos, appLogo } from '../../assets/logos';
import { getProviderName } from '../../utils/helpers';

const FileManager = () => {
  const {
    files,
    loading,
    selectedAccount,
    downloadFile,
    deleteFile,
    renameFile,
    batchDeleteFiles,
  } = useCloud();
  const {
    showNotification,
    showConfirmation,
    showProgress,
    completeProgress,
  } = useNotifications();
  const [view, setView] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [renameTarget, setRenameTarget] = useState(null);

  const resolveErrorMessage = (error, fallback) => {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.details === 'string' && error.details.trim()) {
      return error.details;
    }

    return fallback;
  };

  if (!selectedAccount) {
    return (
      <div className="file-manager">
        <p>Select a cloud account to view files</p>
      </div>
    );
  }

  const providerDisplayName = getProviderName(selectedAccount.providerName);
  const providerLogo = providerLogos[selectedAccount.providerName] ?? appLogo;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFiles(files.map(f => f.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = (fileId) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };

  const handleDownload = async (file) => {
    if (file.isFolder) return;
    try {
      showNotification(`Preparing download for ${file.fileName}`, 'info');
      showProgress({
        title: 'Downloading file...',
        message: file.fileName,
        status: 'pending',
      });

      await downloadFile(file.id, file.fileName);

      completeProgress({ status: 'success', message: `${file.fileName} download started.` });
      showNotification(`Downloading ${file.fileName}`, 'success');
    } catch (error) {
      console.error('Download failed', error);
      const message = resolveErrorMessage(error, 'Failed to download file. Please try again.');
      completeProgress({ status: 'error', message });
      showNotification(message, 'error');
    }
  };

  const handleDelete = async (file) => {
    const confirmed = await showConfirmation({
      title: 'Delete File',
      message: `Are you sure you want to delete ${file.fileName}?`,
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    showProgress({
      title: 'Deleting file...',
      message: file.fileName,
      status: 'pending',
      progress: null,
    });

    try {
      await deleteFile(file.id);
      setSelectedFiles((prev) => prev.filter((id) => id !== file.id));
      completeProgress({ status: 'success', message: 'File deleted successfully.' });
      showNotification(`${file.fileName} deleted successfully.`, 'success');
    } catch (error) {
      console.error('Delete failed', error);
      const message = resolveErrorMessage(error, 'Failed to delete file. Please try again.');
      completeProgress({ status: 'error', message });
      showNotification(message, 'error');
    }
  };

  const handleRename = (file) => {
    setRenameTarget(file);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    const confirmed = await showConfirmation({
      title: 'Delete Selected Files',
      message: `Are you sure you want to delete ${selectedFiles.length} selected item(s)?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });

    if (!confirmed) {
      return;
    }

    showProgress({
      title: `Deleting ${selectedFiles.length} item(s)...`,
      message: selectedAccount.providerName.replace('_', ' '),
      status: 'pending',
      progress: null,
    });

    try {
      await batchDeleteFiles(selectedFiles);
      setSelectedFiles([]);
      completeProgress({ status: 'success', message: 'Selected files deleted.' });
      showNotification('Selected files deleted.', 'success');
    } catch (error) {
      console.error('Batch delete failed', error);
      const message = resolveErrorMessage(error, 'Failed to delete selected files.');
      completeProgress({ status: 'error', message });
      showNotification(message, 'error');
    }
  };

  const handleView = (file) => {
    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank', 'noopener,noreferrer');
    } else if (!file.isFolder) {
      handleDownload(file);
    }
  };

  return (
    <DragDropZone>
      <div className="file-manager">
        <div className="file-manager-header">
          <div className="header-left">
            <h2 className="file-manager-title">
              <img
                src={providerLogo}
                alt={`${providerDisplayName} logo`}
                className="file-manager-title__logo"
              />
              <span className="file-manager-title__text">
                Files <span className="file-manager-title__provider">&mdash; {providerDisplayName}</span>
              </span>
            </h2>
            {selectedFiles.length > 0 && (
              <span className="selected-count">
                {selectedFiles.length} selected
              </span>
            )}
          </div>

          <div className="header-actions">
            <FileSearch />

            <div className="view-toggle">
              <button
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
                title="Grid view"
              >
                ⊞
              </button>
              <button
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
                title="List view"
              >
                ☰
              </button>
            </div>

            <FolderCreate />
            <FileUpload />
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="batch-actions">
            <button
              type="button"
              className="btn-batch-action delete"
              onClick={handleDeleteSelected}
            >
              🗑️ Delete Selected ({selectedFiles.length})
            </button>
            <button
              type="button"
              className="btn-batch-action cancel"
              onClick={() => setSelectedFiles([])}
            >
              Cancel
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading files...</div>
        ) : (
          <FileList
            files={files}
            view={view}
            selectedFiles={selectedFiles}
            onSelectFile={handleFileSelect}
            onSelectAll={handleSelectAll}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRename={handleRename}
            onView={handleView}
          />
        )}
      </div>
      <RenameModal
        file={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSubmit={async (newName) => {
          if (!renameTarget) {
            return;
          }

          showProgress({
            title: 'Renaming file...',
            message: `${renameTarget.fileName} → ${newName}`,
            status: 'pending',
          });

          try {
            await renameFile(renameTarget.id, newName);
            completeProgress({ status: 'success', message: `Renamed to ${newName}` });
            showNotification(`Renamed to ${newName}`, 'success');
          } catch (error) {
            console.error('Rename failed', error);
            const message = resolveErrorMessage(error, 'Failed to rename file. Please try again.');
            completeProgress({ status: 'error', message });
            showNotification(message, 'error');
          } finally {
            setRenameTarget(null);
          }
        }}
      />
    </DragDropZone>
  );
};

export default FileManager;