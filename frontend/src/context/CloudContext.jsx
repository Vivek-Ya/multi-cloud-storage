import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import cloudService from '../services/cloudService';
import { useAuth } from './AuthContext';

const CloudContext = createContext(null);

export const CloudProvider = ({ children }) => {
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [storageStats, setStorageStats] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all cloud accounts
  const fetchCloudAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const accounts = await cloudService.getCloudAccounts();
      setCloudAccounts(accounts);
      
      // Auto-select first account if none selected
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0]);
      }
      
      return accounts;
    } catch (error) {
      console.error('Error fetching cloud accounts:', error);
      setError(error.message || 'Failed to fetch cloud accounts');
      setCloudAccounts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccount]);

  // Fetch files from selected account
  const fetchFiles = useCallback(async (accountId, path = '') => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const fileList = await cloudService.getFiles(accountId, path);
      setFiles(fileList);
      setCurrentPath(path);
      
      return fileList;
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.message || 'Failed to fetch files');
      setFiles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all files across all accounts
  const fetchAllFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allFiles = await cloudService.getAllFiles();
      setFiles(allFiles);
      
      return allFiles;
    } catch (error) {
      console.error('Error fetching all files:', error);
      setError(error.message || 'Failed to fetch files');
      setFiles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch storage statistics
  const fetchStorageStats = useCallback(async () => {
    try {
      const stats = await cloudService.getStorageStats();
      setStorageStats(stats);
      return stats;
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      return null;
    }
  }, []);

  // Upload single file
  const uploadFile = useCallback(async (accountId, file, path = '') => {
    try {
      setError(null);
      
      const onProgress = (progress) => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: progress
        }));
      };
      
      const uploadedFile = await cloudService.uploadFile(accountId, file, path, onProgress);
      
      // Refresh files after upload
      await fetchFiles(accountId, path);
      
      return uploadedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message || 'Failed to upload file');
      throw error;
    } finally {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    }
  }, [fetchFiles]);

  // Upload multiple files
  const uploadMultipleFiles = useCallback(async (accountId, files, path = '') => {
    try {
      setError(null);
      
      const onProgress = (progress) => {
        setUploadProgress(prev => ({
          ...prev,
          multiple: progress
        }));
      };
      
      const uploadedFiles = await cloudService.uploadMultipleFiles(accountId, files, path, onProgress);
      
      // Refresh files after upload
      await fetchFiles(accountId, path);
      
      return uploadedFiles;
    } catch (error) {
      console.error('Error uploading files:', error);
      setError(error.message || 'Failed to upload files');
      throw error;
    } finally {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress.multiple;
        return newProgress;
      });
    }
  }, [fetchFiles]);

  // Download file
  const downloadFile = useCallback(async (fileId, fileName) => {
    try {
      setError(null);
      await cloudService.downloadFile(fileId, fileName);
      return true;
    } catch (error) {
      console.error('Error downloading file:', error);
      setError(error.message || 'Failed to download file');
      throw error;
    }
  }, []);

  // Delete file
  const deleteFile = useCallback(async (fileId) => {
    try {
      setError(null);
      await cloudService.deleteFile(fileId);
      
      // Refresh files after deletion
      if (selectedAccount) {
        await fetchFiles(selectedAccount.id, currentPath);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error.message || 'Failed to delete file');
      throw error;
    }
  }, [selectedAccount, currentPath, fetchFiles]);

  // Batch delete files
  const batchDeleteFiles = useCallback(async (fileIds) => {
    try {
      setError(null);
      await cloudService.batchDeleteFiles(fileIds);
      
      // Refresh files after deletion
      if (selectedAccount) {
        await fetchFiles(selectedAccount.id, currentPath);
      }
      
      return true;
    } catch (error) {
      console.error('Error batch deleting files:', error);
      setError(error.message || 'Failed to delete files');
      throw error;
    }
  }, [selectedAccount, currentPath, fetchFiles]);

  // Rename file
  const renameFile = useCallback(async (fileId, newName) => {
    try {
      setError(null);
      await cloudService.renameFile(fileId, newName);
      
      // Refresh files after rename
      if (selectedAccount) {
        await fetchFiles(selectedAccount.id, currentPath);
      }
      
      return true;
    } catch (error) {
      console.error('Error renaming file:', error);
      setError(error.message || 'Failed to rename file');
      throw error;
    }
  }, [selectedAccount, currentPath, fetchFiles]);

  // Move file
  const moveFile = useCallback(async (fileId, targetAccountId, newPath) => {
    try {
      setError(null);
      await cloudService.moveFile(fileId, targetAccountId, newPath);
      
      // Refresh files after move
      if (selectedAccount) {
        await fetchFiles(selectedAccount.id, currentPath);
      }
      
      return true;
    } catch (error) {
      console.error('Error moving file:', error);
      setError(error.message || 'Failed to move file');
      throw error;
    }
  }, [selectedAccount, currentPath, fetchFiles]);

  // Copy file
  const copyFile = useCallback(async (fileId, targetAccountId, targetFolderId = '') => {
    try {
      setError(null);
      await cloudService.copyFile(fileId, targetAccountId, targetFolderId);
      
      // Refresh files after copy
      if (selectedAccount) {
        await fetchFiles(selectedAccount.id, currentPath);
      }
      
      return true;
    } catch (error) {
      console.error('Error copying file:', error);
      setError(error.message || 'Failed to copy file');
      throw error;
    }
  }, [selectedAccount, currentPath, fetchFiles]);

  // Create folder
  const createFolder = useCallback(async (accountId, folderName, parentFolderId = '') => {
    try {
      setError(null);
      await cloudService.createFolder(accountId, folderName, parentFolderId);
      
      // Refresh files after creating folder
      await fetchFiles(accountId, parentFolderId);
      
      return true;
    } catch (error) {
      console.error('Error creating folder:', error);
      setError(error.message || 'Failed to create folder');
      throw error;
    }
  }, [fetchFiles]);

  // Search files
  const searchFiles = useCallback(async (query) => {
    if (!query || query.trim() === '') {
      // If query is empty, fetch current files
      if (selectedAccount) {
        return await fetchFiles(selectedAccount.id, currentPath);
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const results = await cloudService.searchFiles(query);
      setFiles(results);
      
      return results;
    } catch (error) {
      console.error('Error searching files:', error);
      setError(error.message || 'Failed to search files');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, currentPath, fetchFiles]);

  // Share file
  const shareFile = useCallback(async (fileId, shareData) => {
    try {
      setError(null);
      const result = await cloudService.shareFile(fileId, shareData);
      return result;
    } catch (error) {
      console.error('Error sharing file:', error);
      setError(error.message || 'Failed to share file');
      throw error;
    }
  }, []);

  // Disconnect cloud account
  const disconnectAccount = useCallback(async (accountId) => {
    try {
      setError(null);
      await cloudService.disconnectAccount(accountId);
      
      // Refresh cloud accounts
      await fetchCloudAccounts();
      
      // Clear selected account if it was disconnected
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
        setFiles([]);
      }
      
      return true;
    } catch (error) {
      console.error('Error disconnecting account:', error);
      setError(error.message || 'Failed to disconnect account');
      throw error;
    }
  }, [fetchCloudAccounts, selectedAccount]);

  // Sync cloud account
  const syncAccount = useCallback(async (accountId) => {
    try {
      setError(null);
      await cloudService.syncAccount(accountId);
      
      // Refresh files after sync
      await fetchFiles(accountId, currentPath);
      
      return true;
    } catch (error) {
      console.error('Error syncing account:', error);
      setError(error.message || 'Failed to sync account');
      throw error;
    }
  }, [currentPath, fetchFiles]);

  // OAuth connection methods
  const connectGoogleDrive = useCallback(() => {
    if (user?.username) {
      cloudService.connectGoogleDrive(user.username);
    } else {
      console.warn('Connect attempted while not authenticated. Redirecting to login.');
      navigate('/login?message=please_login_to_connect');
    }
  }, [user, navigate]);

  const connectOneDrive = useCallback(() => {
    if (user?.username) {
      cloudService.connectOneDrive(user.username);
    } else {
      console.warn('Connect attempted while not authenticated. Redirecting to login.');
      navigate('/login?message=please_login_to_connect');
    }
  }, [user, navigate]);

  const connectDropbox = useCallback(() => {
    if (user?.username) {
      cloudService.connectDropbox(user.username);
    } else {
      console.warn('Connect attempted while not authenticated. Redirecting to login.');
      navigate('/login?message=please_login_to_connect');
    }
  }, [user, navigate]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch cloud accounts when user logs in
  useEffect(() => {
    if (user) {
      fetchCloudAccounts();
      fetchStorageStats();
    } else {
      // Clear data when user logs out
      setCloudAccounts([]);
      setFiles([]);
      setSelectedAccount(null);
      setCurrentPath('');
      setStorageStats(null);
    }
  }, [user, fetchCloudAccounts, fetchStorageStats]);

  // Fetch files when account or path changes
  useEffect(() => {
    if (selectedAccount?.id) {
      fetchFiles(selectedAccount.id, currentPath);
    }
  }, [selectedAccount?.id, currentPath, fetchFiles]);

  const value = {
    // State
    cloudAccounts,
    files,
    loading,
    error,
    selectedAccount,
    currentPath,
    uploadProgress,
    storageStats,
    
    // Actions
    setSelectedAccount,
    setCurrentPath,
    fetchCloudAccounts,
    fetchFiles,
    fetchAllFiles,
    fetchStorageStats,
    uploadFile,
    uploadMultipleFiles,
    downloadFile,
    deleteFile,
    batchDeleteFiles,
    renameFile,
    moveFile,
    copyFile,
    createFolder,
    searchFiles,
    shareFile,
    disconnectAccount,
    syncAccount,
    connectGoogleDrive,
    connectOneDrive,
    connectDropbox,
    clearError,
  };

  return (
    <CloudContext.Provider value={value}>
      {children}
    </CloudContext.Provider>
  );
};

export const useCloud = () => {
  const context = useContext(CloudContext);
  if (!context) {
    throw new Error('useCloud must be used within a CloudProvider');
  }
  return context;
};