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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    return '📄';
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  if (view === 'grid') {
    return (
      <div className="file-grid">
        {files.map((file) => {
          const isSelected = selectedFiles.includes(file.id);
          const isMenuOpen = openMenuId === file.id;

          return (
            <div
              key={file.id}
              className={`file-card ${isSelected ? 'selected' : ''}`}
              role="group"
              aria-label={`${file.fileName} quick actions`}
            >
              <input
                type="checkbox"
                className="file-checkbox"
                checked={isSelected}
                onChange={() => onSelectFile(file.id)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${file.fileName}`}
              />

              <div className="file-card__header">
                <div className="file-card__icon" aria-hidden="true">
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="file-card__meta">
                  <p className="file-name" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="file-meta">
                    {!file.isFolder && file.fileSize ? (
                      <span>{formatBytes(file.fileSize)}</span>
                    ) : null}
                    <span>{formatTypeLabel(file)}</span>
                    {file.modifiedAt ? (
                      <span>{formatShortDate(file.modifiedAt)}</span>
                    ) : null}
                  </p>
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
            </div>
          );
        })}
      </div>
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
                  <span className="file-icon-small" aria-hidden="true">
                    {getFileIcon(file.mimeType)}
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