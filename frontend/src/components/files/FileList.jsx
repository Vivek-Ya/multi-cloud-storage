import React, { useEffect, useState } from 'react';
import './FileList.css';

const FileList = ({
  files,
  view,
  selectedFiles = [],
  onSelectFile,
  onSelectAll,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onView,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [isTouchInterface, setIsTouchInterface] = useState(false);
  const [sheetFile, setSheetFile] = useState(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (event.target.closest('.file-card__menu') || event.target.closest('.file-row-menu') || event.target.closest('.file-actions-menu')) {
        return;
      }

      setOpenMenuId(null);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    setOpenMenuId(null);
  }, [view, files]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const query = window.matchMedia('(hover: none), (max-width: 640px)');
    const updateInterfaceMode = () => {
      setIsTouchInterface(query.matches);
    };

    updateInterfaceMode();

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', updateInterfaceMode);
      return () => query.removeEventListener('change', updateInterfaceMode);
    }

    query.addListener(updateInterfaceMode);
    return () => query.removeListener(updateInterfaceMode);
  }, []);

  useEffect(() => {
    if (!isTouchInterface) {
      setSheetFile(null);
    }
  }, [isTouchInterface]);

  useEffect(() => {
    if (!sheetFile) {
      return;
    }

    const stillExists = files.some((candidate) => candidate.id === sheetFile.id);
    if (!stillExists) {
      setSheetFile(null);
    }
  }, [files, sheetFile]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatTypeLabel = (file) => {
    if (file.isFolder) {
      return 'Folder';
    }

    if (!file.mimeType) {
      return 'Unknown';
    }

    if (file.mimeType.includes('/')) {
      const [, subtype] = file.mimeType.split('/');
      if (!subtype) {
        return file.mimeType;
      }

      const cleaned = subtype.replace(/[._-]+/g, ' ');
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return file.mimeType;
  };

  const formatLongDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getFileVariant = (file) => {
    if (file.isFolder) {
      return { badge: 'FOLDER', tone: 'folder' };
    }

    const mime = (file.mimeType || '').toLowerCase();

    if (mime.includes('pdf')) {
      return { badge: 'PDF', tone: 'pdf' };
    }

    if (mime.includes('sheet') || mime.includes('excel')) {
      return { badge: 'SHEET', tone: 'sheet' };
    }

    if (mime.includes('presentation') || mime.includes('powerpoint') || mime.includes('ppt')) {
      return { badge: 'SLIDE', tone: 'slide' };
    }

    if (mime.includes('document') || mime.includes('word') || mime.includes('doc')) {
      return { badge: 'DOC', tone: 'doc' };
    }

    if (mime.includes('image')) {
      return { badge: 'IMG', tone: 'image' };
    }

    if (mime.includes('video')) {
      return { badge: 'VID', tone: 'video' };
    }

    if (mime.includes('audio')) {
      return { badge: 'AUD', tone: 'audio' };
    }

    return { badge: 'FILE', tone: 'generic' };
  };

  const handleMenuToggle = (fileId, event) => {
    event.stopPropagation();
    setOpenMenuId((previous) => (previous === fileId ? null : fileId));
  };

  const handleAction = (action, file) => {
    switch (action) {
      case 'preview':
        onView?.(file);
        break;
      case 'download':
        if (!file.isFolder) {
          onDownload?.(file);
        }
        break;
      case 'rename':
        onRename?.(file);
        break;
      case 'copy':
        onCopy?.(file);
        break;
      case 'delete':
        onDelete?.(file);
        break;
      default:
        break;
    }

    setOpenMenuId(null);
  };

  if (!files || files.length === 0) {
    return (
      <div className="empty-files">
        <p>No files found. Upload your first file!</p>
      </div>
    );
  }

  const closeSheet = () => setSheetFile(null);

  if (view === 'grid') {
    const sheetVariant = sheetFile ? getFileVariant(sheetFile) : null;
    const sheetSizeLabel = sheetFile && !sheetFile.isFolder && typeof sheetFile.fileSize === 'number'
      ? formatBytes(sheetFile.fileSize)
      : '';
    const sheetDateLabel = sheetFile ? formatLongDate(sheetFile.modifiedAt) : '';
    const sheetTypeLabel = sheetFile ? formatTypeLabel(sheetFile) : '';
    const sheetIsSelected = sheetFile ? selectedFiles.includes(sheetFile.id) : false;

    return (
      <>
        <div className="file-grid">
          {files.map((file) => {
            const isSelected = selectedFiles.includes(file.id);
            const isMenuOpen = openMenuId === file.id;
            const variant = getFileVariant(file);
            const hasSize = !file.isFolder && typeof file.fileSize === 'number';
            const sizeLabel = hasSize ? formatBytes(file.fileSize) : '';
            const shortDateLabel = formatShortDate(file.modifiedAt);
            const longDateLabel = formatLongDate(file.modifiedAt);
            const compactMeta = [sizeLabel, shortDateLabel].filter(Boolean).join(' • ');
            const shouldShowDetails = !isTouchInterface && (isSelected || hoveredCardId === file.id || isMenuOpen);
            const cardClasses = [
              'file-card',
              shouldShowDetails ? 'expanded' : '',
              isSelected ? 'selected' : '',
              isTouchInterface ? 'touch' : '',
            ].filter(Boolean).join(' ');

            const handleCardMouseEnter = () => {
              if (isTouchInterface) {
                return;
              }
              setHoveredCardId(file.id);
            };

            const handleCardMouseLeave = () => {
              if (isTouchInterface) {
                return;
              }
              setHoveredCardId((current) => (current === file.id ? null : current));
            };

            const handleCardClick = () => {
              if (!isTouchInterface) {
                return;
              }
              setSheetFile(file);
            };

            const iconClass = `file-icon file-icon--${variant.tone}`;
            const cardRole = isTouchInterface ? 'button' : 'group';
            const cardTabIndex = isTouchInterface ? 0 : -1;
            const handleCardKeyDown = (event) => {
              if (!isTouchInterface) {
                return;
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleCardClick();
              }
            };

            return (
              <div
                key={file.id}
                className={cardClasses}
                role={cardRole}
                aria-label={`${file.fileName} quick actions`}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
                onClick={isTouchInterface ? handleCardClick : undefined}
                onKeyDown={handleCardKeyDown}
                tabIndex={cardTabIndex}
                aria-pressed={isTouchInterface ? isSelected : undefined}
                aria-haspopup={isTouchInterface ? 'dialog' : undefined}
              >
                <div className="file-card__minimal">
                  <div className={iconClass} aria-hidden="true">
                    {variant.badge}
                  </div>
                  <p
                    className="file-name file-name--compact"
                    title={file.fileName}
                  >
                    {file.fileName}
                  </p>
                  {compactMeta && (
                    <p className="file-meta file-meta--compact" title={compactMeta}>
                      {compactMeta}
                    </p>
                  )}
                </div>

                {shouldShowDetails && (
                  <>
                    <div
                      className="file-card__details"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="file-card__details-leading">
                        <input
                          type="checkbox"
                          className="file-checkbox"
                          checked={isSelected}
                          onChange={() => onSelectFile(file.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select ${file.fileName}`}
                        />
                        <div className={iconClass} aria-hidden="true">
                          {variant.badge}
                        </div>
                        <div className="file-card__details-info">
                          <p className="file-name file-name--full">{file.fileName}</p>
                          <div className="file-card__details-meta">
                            <span className="file-tag">{variant.badge}</span>
                            {sizeLabel ? <span>{sizeLabel}</span> : null}
                            {longDateLabel ? <span>{longDateLabel}</span> : null}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="file-card__menu"
                        onClick={(event) => handleMenuToggle(file.id, event)}
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                        title="More actions"
                      >
                        ⋯
                      </button>
                    </div>

                    <div
                      className={`file-actions-menu file-actions-menu--card ${isMenuOpen ? 'open' : ''}`}
                      role="menu"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="file-actions-menu__item"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction('preview', file);
                        }}
                        role="menuitem"
                      >
                        <span aria-hidden="true">👁️</span>
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        className="file-actions-menu__item"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction('download', file);
                        }}
                        role="menuitem"
                        disabled={file.isFolder}
                      >
                        <span aria-hidden="true">⬇️</span>
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        className="file-actions-menu__item"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction('rename', file);
                        }}
                        role="menuitem"
                      >
                        <span aria-hidden="true">✏️</span>
                        <span>Rename</span>
                      </button>
                      <button
                        type="button"
                        className="file-actions-menu__item"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction('copy', file);
                        }}
                        role="menuitem"
                      >
                        <span aria-hidden="true">📋</span>
                        <span>Copy</span>
                      </button>
                      <button
                        type="button"
                        className="file-actions-menu__item delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAction('delete', file);
                        }}
                        role="menuitem"
                      >
                        <span aria-hidden="true">🗑️</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {isTouchInterface && sheetFile && (
          <div className="file-bottom-sheet" role="dialog" aria-modal="true" aria-label={`${sheetFile.fileName} details`}>
            <button
              type="button"
              className="file-bottom-sheet__backdrop"
              onClick={closeSheet}
              aria-label="Close file details"
            />
            <div className="file-bottom-sheet__content">
              <button
                type="button"
                className="file-bottom-sheet__close"
                onClick={closeSheet}
                aria-label="Dismiss file details"
              >
                ×
              </button>
              <div className="file-bottom-sheet__header">
                {sheetVariant ? (
                  <div className={`file-icon file-icon--${sheetVariant.tone}`}>{sheetVariant.badge}</div>
                ) : null}
                <div className="file-bottom-sheet__title">
                  <h3>{sheetFile.fileName}</h3>
                  {sheetVariant ? <span className="file-tag">{sheetVariant.badge}</span> : null}
                </div>
              </div>
              <div className="file-bottom-sheet__meta">
                {sheetTypeLabel ? <span>{sheetTypeLabel}</span> : null}
                {sheetSizeLabel ? <span>{sheetSizeLabel}</span> : null}
                {sheetDateLabel ? <span>{sheetDateLabel}</span> : null}
              </div>
              <label className="file-bottom-sheet__selection">
                <input
                  type="checkbox"
                  checked={sheetIsSelected}
                  onChange={() => onSelectFile(sheetFile.id)}
                />
                <span>{sheetIsSelected ? 'Selected' : 'Select this file'}</span>
              </label>
              <div className="file-bottom-sheet__actions">
                <button
                  type="button"
                  onClick={() => {
                    handleAction('preview', sheetFile);
                    closeSheet();
                  }}
                  disabled={sheetFile.isFolder}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAction('download', sheetFile);
                    closeSheet();
                  }}
                  disabled={sheetFile.isFolder}
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAction('rename', sheetFile);
                    closeSheet();
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAction('copy', sheetFile);
                    closeSheet();
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    handleAction('delete', sheetFile);
                    closeSheet();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="file-list-table">
      <table>
        <thead>
          <tr>
            <th className="file-list-name-heading">
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e)}
                checked={selectedFiles.length === files.length && files.length > 0}
                aria-label="Select all files"
              />
              <span>Name</span>
            </th>
            <th>Size</th>
            <th>Modified</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isSelected = selectedFiles.includes(file.id);
            const isMenuOpen = openMenuId === file.id;
            const variant = getFileVariant(file);
            const iconClass = `file-icon file-icon--${variant.tone} file-icon--tiny`;

            return (
              <tr key={file.id} className={isSelected ? 'selected' : ''}>
                <td className="file-list-name-cell">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectFile(file.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${file.fileName}`}
                  />
                  <span className={iconClass} aria-hidden="true">
                    {variant.badge}
                  </span>
                  <span className="file-name" title={file.fileName}>
                    {file.fileName}
                  </span>
                </td>
                <td>{file.isFolder ? '—' : formatBytes(file.fileSize)}</td>
                <td>{formatDate(file.modifiedAt)}</td>
                <td>{formatTypeLabel(file)}</td>
                <td className="file-actions-cell">
                  <button
                    type="button"
                    className="file-row-menu"
                    onClick={(event) => handleMenuToggle(file.id, event)}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                    title="More actions"
                  >
                    ⋯
                  </button>
                  <div
                    className={`file-actions-menu file-actions-menu--table ${isMenuOpen ? 'open' : ''}`}
                    role="menu"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="file-actions-menu__item"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAction('preview', file);
                      }}
                      role="menuitem"
                    >
                      <span aria-hidden="true">👁️</span>
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      className="file-actions-menu__item"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAction('download', file);
                      }}
                      role="menuitem"
                      disabled={file.isFolder}
                    >
                      <span aria-hidden="true">⬇️</span>
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      className="file-actions-menu__item"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAction('rename', file);
                      }}
                      role="menuitem"
                    >
                      <span aria-hidden="true">✏️</span>
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      className="file-actions-menu__item"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAction('copy', file);
                      }}
                      role="menuitem"
                    >
                      <span aria-hidden="true">📋</span>
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      className="file-actions-menu__item delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAction('delete', file);
                      }}
                      role="menuitem"
                    >
                      <span aria-hidden="true">🗑️</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;