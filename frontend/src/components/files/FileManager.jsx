import React, { useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import FileList from './FileList';
import FileUpload from './FileUpload';
import './FileManager.css';

const FileManager = () => {
  const { files, loading, selectedAccount } = useCloud();
  const [view, setView] = useState('grid'); // 'grid' or 'list'

  if (!selectedAccount) {
    return (
      <div className="file-manager">
        <p>Select a cloud account to view files</p>
      </div>
    );
  }

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h2>Files - {selectedAccount.providerName.replace('_', ' ')}</h2>
        
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
          
          <FileUpload />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading files...</div>
      ) : (
        <FileList files={files} view={view} />
      )}
    </div>
  );
};

export default FileManager;