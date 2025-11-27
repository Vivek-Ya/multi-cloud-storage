import React from 'react';
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
  onView,
}) => {
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
        {files.map((file) => (
          <div key={file.id} className="file-card">
            <input
              type="checkbox"
              className="file-checkbox"
              checked={selectedFiles.includes(file.id)}
              onChange={() => onSelectFile(file.id)}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="file-icon">{getFileIcon(file.mimeType)}</div>
            <div className="file-info">
              <p className="file-name" title={file.fileName}>
                {file.fileName}
              </p>
              <p className="file-size">{formatBytes(file.fileSize)}</p>
            </div>

            <div className="file-actions">
              <button
                type="button"
                className="file-action-button"
                title="View"
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(file);
                }}
              >
                👁️
              </button>
              <button
                type="button"
                className="file-action-button"
                title="Download"
                disabled={file.isFolder}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!file.isFolder) {
                    onDownload?.(file);
                  }
                }}
              >
                ⬇️
              </button>
              <button
                type="button"
                className="file-action-button"
                title="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename?.(file);
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className="file-action-button"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(file);
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="file-list-table">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e)}
                checked={selectedFiles.length === files.length && files.length > 0}
              />
              Name
            </th>
            <th>Size</th>
            <th>Modified</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>
                <span className="file-icon-small">{getFileIcon(file.mimeType)}</span>
                {file.fileName}
              </td>
              <td>{formatBytes(file.fileSize)}</td>
              <td>{formatDate(file.modifiedAt)}</td>
              <td>{file.mimeType || 'Unknown'}</td>
              <td className="file-actions-cell">
                <button
                  type="button"
                  className="file-action-button"
                  title="View"
                  onClick={() => onView?.(file)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="file-action-button"
                  disabled={file.isFolder}
                  title="Download"
                  onClick={() => {
                    if (!file.isFolder) {
                      onDownload?.(file);
                    }
                  }}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="file-action-button"
                  title="Rename"
                  onClick={() => onRename?.(file)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="file-action-button delete"
                  title="Delete"
                  onClick={() => onDelete?.(file)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;