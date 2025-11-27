import React, { useEffect, useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import { useNotifications } from '../../context/NotificationContext';
import './DragDropZone.css';

const DragDropZone = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { selectedAccount, uploadMultipleFiles, uploadProgress } = useCloud();
  const { showNotification, showProgress, updateProgress, completeProgress } = useNotifications();
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedAccount) {
      showNotification('Select a cloud account before uploading files.', 'warning');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;

    try {
      setIsBatchUploading(true);
      showProgress({
        title: files.length === 1 ? 'Uploading file...' : `Uploading ${files.length} files...`,
        message: selectedAccount.providerName.replace('_', ' '),
        status: 'pending',
        progress: 0,
      });

      await uploadMultipleFiles(selectedAccount.id, files);

      completeProgress({ status: 'success', message: `Uploaded ${files.length} file(s).` });
      showNotification(`Successfully uploaded ${files.length} file(s)!`, 'success');
    } catch (error) {
      console.error('Batch upload failed', error);
      completeProgress({ status: 'error', message: error?.message || 'Upload failed.' });
      showNotification(error?.message || 'Upload failed. Please try again.', 'error');
    } finally {
      setIsBatchUploading(false);
    }
  };

  useEffect(() => {
    if (!isBatchUploading) {
      return;
    }

    const progress = uploadProgress?.multiple;
    if (typeof progress === 'number') {
      updateProgress({
        progress,
        message: `${progress.toFixed(0)}% complete`,
      });
    }
  }, [isBatchUploading, uploadProgress, updateProgress]);

  return (
    <div
      className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-message">
            <span className="drag-icon">📁</span>
            <p>Drop files here to upload</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default DragDropZone;