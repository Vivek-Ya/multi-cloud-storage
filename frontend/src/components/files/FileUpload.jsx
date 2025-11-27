import React, { useEffect, useRef, useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import { useNotifications } from '../../context/NotificationContext';
import './FileUpload.css';

const FileUpload = () => {
  const { selectedAccount, uploadFile, uploadProgress } = useCloud();
  const { showNotification, showProgress, updateProgress, completeProgress } = useNotifications();
  const [uploading, setUploading] = useState(false);
  const [activeUpload, setActiveUpload] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    if (!selectedAccount) {
      showNotification('Select a cloud account before uploading files.', 'warning');
      return;
    }

    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedAccount) {
      showNotification('Select a cloud account before uploading files.', 'warning');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      setActiveUpload(file.name);
      showProgress({
        title: 'Uploading file...',
        message: file.name,
        status: 'pending',
        progress: 0,
      });

      await uploadFile(selectedAccount.id, file);
      completeProgress({ status: 'success', message: `${file.name} uploaded successfully.` });
      showNotification(`${file.name} uploaded successfully!`, 'success');
    } catch (error) {
      console.error('Upload failed', error);
      completeProgress({ status: 'error', message: error?.message || 'Failed to upload file.' });
      showNotification(error?.message || 'Failed to upload file.', 'error');
    } finally {
      setUploading(false);
      setActiveUpload(null);
      e.target.value = ''; // Reset input
    }
  };

  useEffect(() => {
    if (!activeUpload) {
      return;
    }

    const progress = uploadProgress?.[activeUpload];
    if (typeof progress === 'number') {
      updateProgress({
        progress,
      });
    }
  }, [activeUpload, uploadProgress, updateProgress]);

  return (
    <div className="file-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        className="btn-upload"
        onClick={handleFileSelect}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : '+ Upload File'}
      </button>
    </div>
  );
};

export default FileUpload;