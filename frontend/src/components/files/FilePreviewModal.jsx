import React, { useMemo } from 'react';
import './FilePreviewModal.css';

const decodeText = (base64) => {
  try {
    const binary = typeof window !== 'undefined' && window.atob
      ? window.atob(base64)
      : atob(base64);

    if (typeof TextDecoder !== 'undefined') {
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    return binary;
  } catch (error) {
    console.warn('Failed to decode preview text', error);
    return 'Unable to decode text preview.';
  }
};

const FilePreviewModal = ({
  open,
  file,
  preview,
  loading,
  error,
  onClose,
  onDownload,
}) => {
  const dataUrl = useMemo(() => {
    if (!preview?.inlineContent || !preview?.contentType) {
      return null;
    }
    return `data:${preview.contentType};base64,${preview.inlineContent}`;
  }, [preview]);

  const textContent = useMemo(() => {
    if (preview?.previewMode !== 'TEXT' || !preview?.inlineContent) {
      return null;
    }
    return decodeText(preview.inlineContent);
  }, [preview]);

  if (!open || !file) {
    return null;
  }

  const externalAction = () => {
    if (preview?.previewUrl && typeof window !== 'undefined') {
      window.open(preview.previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="preview-loading">Loading preview...</div>;
    }

    if (error) {
      return (
        <div className="preview-status">
          <p>{error}</p>
          {preview?.previewUrl && (
            <button type="button" className="preview-secondary" onClick={externalAction}>
              Open in new tab
            </button>
          )}
        </div>
      );
    }

    if (!preview) {
      return <div className="preview-status"><p>Preview data not available.</p></div>;
    }

    if (!preview.previewAvailable) {
      return (
        <div className="preview-status">
          <p>{preview.message || 'Preview is not available for this file.'}</p>
          {preview.previewUrl && (
            <button type="button" className="preview-secondary" onClick={externalAction}>
              Open in new tab
            </button>
          )}
        </div>
      );
    }

    if (preview.previewMode === 'TEXT' && textContent !== null) {
      return (
        <pre className="preview-text">
          {textContent}
        </pre>
      );
    }

    if (preview.previewMode === 'IMAGE' && dataUrl) {
      return (
        <div className="preview-media-container">
          <img src={dataUrl} alt={file.fileName} />
        </div>
      );
    }

    if (preview.previewMode === 'PDF' && dataUrl) {
      return (
        <iframe
          title={`${file.fileName} preview`}
          src={dataUrl}
          className="preview-frame"
        />
      );
    }

    if (dataUrl) {
      return (
        <iframe
          title={`${file.fileName} preview`}
          src={dataUrl}
          className="preview-frame"
        />
      );
    }

    return (
      <div className="preview-status">
        <p>Inline preview is not supported for this format.</p>
        {preview.previewUrl && (
          <button type="button" className="preview-secondary" onClick={externalAction}>
            Open in new tab
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="preview-overlay" role="dialog" aria-modal="true">
      <div className="preview-modal">
        <header className="preview-header">
          <div className="preview-meta">
            <h3>{file.fileName}</h3>
            <span>{preview?.mimeType || file.mimeType || 'Unknown type'}</span>
          </div>
          <div className="preview-controls">
            <button
              type="button"
              className="preview-secondary"
              onClick={() => onDownload?.(file)}
            >
              Download
            </button>
            {preview?.previewUrl && (
              <button type="button" className="preview-secondary" onClick={externalAction}>
                Open in new tab
              </button>
            )}
            <button type="button" className="preview-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <section className="preview-body">
          {renderContent()}
        </section>
      </div>
    </div>
  );
};

export default FilePreviewModal;
