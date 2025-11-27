import React, { useState } from 'react';
import { useCloud } from '../../context/CloudContext';
import { useNotifications } from '../../context/NotificationContext';
import './FileSearch.css';

const FileSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchFiles, fetchFiles, selectedAccount } = useCloud();
  const { showNotification, showProgress, completeProgress } = useNotifications();

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      // If empty, show all files
      if (selectedAccount) {
        fetchFiles(selectedAccount.id);
      }
      return;
    }

    try {
      showProgress({
        title: 'Searching files...',
        message: searchQuery,
        status: 'pending',
        progress: null,
      });
      await searchFiles(searchQuery);
      completeProgress({ status: 'success', message: 'Search complete.' });
      showNotification(`Results for "${searchQuery}"`, 'success');
    } catch (error) {
      console.error('Search failed', error);
      completeProgress({ status: 'error', message: error?.message || 'Search failed.' });
      showNotification(error?.message || 'Search failed. Please try again.', 'error');
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    if (selectedAccount) {
      fetchFiles(selectedAccount.id);
    }
  };

  return (
    <form className="file-search" onSubmit={handleSearch}>
      <input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
      <button type="submit" className="search-btn">
        🔍
      </button>
      {searchQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="clear-btn"
        >
          ✕
        </button>
      )}
    </form>
  );
};

export default FileSearch;