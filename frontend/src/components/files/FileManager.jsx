import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import FileList from './FileList';
import FileUpload from './FileUpload';
import FileSearch from './FileSearch';
import FolderCreate from './FolderCreate';
import './FileManager.css';
import DragDropZone from './DragDropZone';
import { useNotifications } from '../../context/NotificationContext';
import RenameModal from './RenameModal';
import CopyModal from './CopyModal';
import { providerLogos, appLogo } from '../../assets/logos';
import { getProviderName } from '../../utils/helpers';
import FilePreviewModal from './FilePreviewModal';

const FileManager = () => {
  const {
    files,
    loading,
    selectedAccount,
    downloadFile,
    deleteFile,
    renameFile,
    batchDeleteFiles,
    copyFile: copyFileAction,
    previewFile: previewFileAction,
    cloudAccounts,
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
  const [copyTarget, setCopyTarget] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isSortActive, setIsSortActive] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const actionMenuRef = useRef(null);
  const {
    currentPath,
    setCurrentPath,
  } = useCloud();

  const breadcrumbSegments = useMemo(() => {
    if (!currentPath) {
      return [];
    }

    return currentPath.split('/').filter((segment) => segment && segment.trim().length > 0);
  }, [currentPath]);

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

  useEffect(() => {
    if (!isActionMenuOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (!actionMenuRef.current) {
        return;
      }

      if (!actionMenuRef.current.contains(event.target)) {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionMenuOpen]);

  useEffect(() => {
    setIsActionMenuOpen(false);
  }, [selectedAccount?.id]);

  useEffect(() => {
    setIsSortActive(false);
    setIsFilterActive(false);
  }, [selectedAccount?.id]);

  if (!selectedAccount) {
    return (
      <div className="file-manager">
        <p>Select a cloud account to view files</p>
      </div>
    );
  }

  const GridIcon = () => (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="6" height="6" rx="1.4" />
      <rect x="11" y="3" width="6" height="6" rx="1.4" />
      <rect x="3" y="11" width="6" height="6" rx="1.4" />
      <rect x="11" y="11" width="6" height="6" rx="1.4" />
    </svg>
  );

  const ListIcon = () => (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="14" height="2" rx="1" />
      <rect x="3" y="9" width="14" height="2" rx="1" />
      <rect x="3" y="14" width="14" height="2" rx="1" />
    </svg>
  );

  const toggleActionMenu = () => {
    setIsActionMenuOpen((prev) => !prev);
  };

  const closeActionMenu = () => {
    setIsActionMenuOpen(false);
  };

  const providerDisplayName = getProviderName(selectedAccount.providerName);
  const providerLogo = providerLogos[selectedAccount.providerName] ?? appLogo;

  const handleBreadcrumbClick = (index) => {
    const newPath = breadcrumbSegments.slice(0, index).join('/');
    setCurrentPath(newPath);
  };

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

  const handleCopy = (file) => {
    setCopyTarget(file);
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
    if (file.isFolder) {
      showNotification('Folders cannot be previewed yet.', 'info');
      return;
    }

    setPreviewTarget(file);
    setPreviewData(null);
    setPreviewError(null);
    setIsPreviewOpen(true);
    setPreviewLoading(true);

    previewFileAction(file.id)
      .then((data) => {
        setPreviewData(data);
        if (!data.previewAvailable && !data.previewUrl && data.message) {
          setPreviewError(data.message);
        }
      })
      .catch((error) => {
        console.error('Preview failed', error);
        const message = resolveErrorMessage(error, 'Failed to load preview.');
        setPreviewError(message);
        showNotification(message, 'error');
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewTarget(null);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  const handleSortClick = () => {
    setIsSortActive((previous) => {
      const next = !previous;
      showNotification(next ? 'Custom sorting preview coming soon.' : 'Sort reset to default order.', 'info');
      return next;
    });
  };

  const handleFilterClick = () => {
    setIsFilterActive((previous) => {
      const next = !previous;
      showNotification(next ? 'Filter builder launching soon.' : 'Filters cleared. Showing all items.', 'info');
      return next;
    });
  };

  return (
    <DragDropZone>
      <div className="file-manager">
        <div className="file-manager-toolbar">
          <div className="toolbar-heading">
            <div className="toolbar-heading__title">
              <h2 className="file-manager-title">
                <img
                  src={providerLogo}
                  alt={`${providerDisplayName} logo`}
                  className="file-manager-title__logo"
                />
                <span className="file-manager-title__text">Files</span>
                <span className="file-manager-title__pill">{providerDisplayName}</span>
              </h2>
              <nav className="file-breadcrumbs" aria-label="Breadcrumb">
                <button type="button" onClick={() => setCurrentPath('')} className="file-breadcrumbs__item">
                  {providerDisplayName}
                </button>
                {breadcrumbSegments.map((segment, index) => (
                  <React.Fragment key={segment + index}>
                    <span className="file-breadcrumbs__divider" aria-hidden="true">/</span>
                    <button
                      type="button"
                      className="file-breadcrumbs__item"
                      onClick={() => handleBreadcrumbClick(index + 1)}
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {selectedFiles.length > 0 && (
              <div className="toolbar-heading__meta">
                <span className="selected-count">
                  {selectedFiles.length} selected
                </span>
              </div>
            )}
          </div>

          <div className="toolbar-controls">
            <div className="toolbar-search">
              <FileSearch />
            </div>

            <div className="toolbar-compact">
              <button
                type="button"
                className={`toolbar-icon-btn ${isSortActive ? 'active' : ''}`}
                onClick={handleSortClick}
                title="Sort files"
                aria-pressed={isSortActive}
              >
                <span className="toolbar-icon-btn__glyph" aria-hidden="true">⇅</span>
                <span className="toolbar-icon-btn__label">
                  Sort
                  {isSortActive ? <span className="toolbar-icon-btn__dot" aria-hidden="true" /> : null}
                </span>
              </button>
              <button
                type="button"
                className={`toolbar-icon-btn ${isFilterActive ? 'active' : ''}`}
                onClick={handleFilterClick}
                title="Filter files"
                aria-pressed={isFilterActive}
              >
                <span className="toolbar-icon-btn__glyph" aria-hidden="true">⫶</span>
                <span className="toolbar-icon-btn__label">
                  Filter
                  {isFilterActive ? <span className="toolbar-icon-btn__dot" aria-hidden="true" /> : null}
                </span>
              </button>

              <div className="view-toggle" role="group" aria-label="Change file view">
                <button
                  type="button"
                  className={view === 'grid' ? 'active' : ''}
                  onClick={() => setView('grid')}
                  aria-pressed={view === 'grid'}
                  title="Grid view"
                >
                  <GridIcon />
                </button>
                <button
                  type="button"
                  className={view === 'list' ? 'active' : ''}
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  title="List view"
                >
                  <ListIcon />
                </button>
              </div>

              <button
                type="button"
                className={`toolbar-icon-btn activity-toggle ${isActivityOpen ? 'active' : ''}`}
                onClick={() => setIsActivityOpen((prev) => !prev)}
                title={isActivityOpen ? 'Hide activity feed' : 'Show recent activity'}
                aria-pressed={isActivityOpen}
              >
                <span className="toolbar-icon-btn__glyph" aria-hidden="true">🛰️</span>
                <span className="toolbar-icon-btn__label">
                  Activity
                  {isActivityOpen ? <span className="toolbar-icon-btn__dot toolbar-icon-btn__dot--positive" aria-hidden="true" /> : null}
                </span>
              </button>

              <div
                className={`file-actions-menu-toggle ${isActionMenuOpen ? 'open' : ''}`}
                ref={actionMenuRef}
              >
                <button
                  type="button"
                  className="file-actions-menu-toggle__trigger"
                  onClick={toggleActionMenu}
                  aria-haspopup="true"
                  aria-expanded={isActionMenuOpen}
                >
                  <span className="trigger-icon" aria-hidden="true">＋</span>
                  <span>New</span>
                </button>
                <div className="file-actions-menu-toggle__panel" role="menu">
                  <FolderCreate
                    renderTrigger={({ onOpen }) => (
                      <button
                        type="button"
                        className="fab-menu-item"
                        onClick={() => {
                          onOpen();
                          closeActionMenu();
                        }}
                        role="menuitem"
                      >
                        <span className="fab-menu-item__icon" aria-hidden="true">📁</span>
                        <span>New Folder</span>
                      </button>
                    )}
                  />
                  <FileUpload
                    renderTrigger={({ onSelect, isDisabled, isUploading }) => (
                      <button
                        type="button"
                        className="fab-menu-item"
                        onClick={() => {
                          if (isDisabled) {
                            return;
                          }
                          onSelect();
                          closeActionMenu();
                        }}
                        disabled={isDisabled}
                        role="menuitem"
                      >
                        <span className="fab-menu-item__icon" aria-hidden="true">⬆️</span>
                        <span>{isUploading ? 'Uploading…' : 'Upload File'}</span>
                      </button>
                    )}
                  />
                  <button type="button" className="fab-menu-item" onClick={() => {
                    closeActionMenu();
                    showNotification('Link shortcuts coming soon.', 'info');
                  }} role="menuitem">
                    <span className="fab-menu-item__icon" aria-hidden="true">🔗</span>
                    <span>Link Shortcut</span>
                  </button>
                </div>
              </div>
            </div>
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
            onCopy={handleCopy}
            onView={handleView}
          />
        )}

        {isActivityOpen && (
          <aside className="activity-panel" aria-live="polite">
            <div className="activity-panel__header">
              <h3>Recent Activity</h3>
              <span className="activity-panel__meta">Synced {providerDisplayName}</span>
            </div>
            {files.length > 0 ? (
              <ul className="activity-panel__list">
                {files.slice(0, 5).map((file) => (
                  <li key={`activity-${file.id}`}>
                    <div className="activity-panel__item">
                      <span className="activity-panel__icon" aria-hidden="true">✓</span>
                      <div className="activity-panel__body">
                        <span className="activity-panel__title" title={file.fileName}>{file.fileName}</span>
                        <span className="activity-panel__subtitle">Updated {file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : 'recently'}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="activity-panel__empty">
                <span aria-hidden="true">📭</span>
                <p>No recent activity yet. Upload something to get started.</p>
              </div>
            )}
          </aside>
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
      <CopyModal
        file={copyTarget}
        accounts={cloudAccounts}
        currentAccountId={selectedAccount?.id}
        onClose={() => setCopyTarget(null)}
        onSubmit={async (targetAccountId, targetFolderId) => {
          if (!copyTarget) {
            return;
          }

          showProgress({
            title: 'Copying file...',
            message: copyTarget.fileName,
            status: 'pending',
          });

          try {
            await copyFileAction(copyTarget.id, targetAccountId, targetFolderId);
            completeProgress({ status: 'success', message: `${copyTarget.fileName} copied successfully.` });
            showNotification(`${copyTarget.fileName} copied successfully.`, 'success');
          } catch (error) {
            console.error('Copy failed', error);
            const message = resolveErrorMessage(error, 'Failed to copy file. Please try again.');
            completeProgress({ status: 'error', message });
            showNotification(message, 'error');
          } finally {
            setCopyTarget(null);
          }
        }}
      />
      <FilePreviewModal
        open={isPreviewOpen}
        file={previewTarget}
        preview={previewData}
        loading={previewLoading}
        error={previewError}
        onClose={handleClosePreview}
        onDownload={handleDownload}
      />
    </DragDropZone>
  );
};

export default FileManager;