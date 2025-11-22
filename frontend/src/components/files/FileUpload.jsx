import React, { useRef, useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import './FileUpload.css';

const FileUpload = () => {
  const { selectedAccount, uploadFile } = useCloud();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadFile(selectedAccount.id, file);
      alert('File uploaded successfully!');
    } catch (error) {
      alert('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

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