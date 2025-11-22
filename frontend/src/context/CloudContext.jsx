import React, { createContext, useState, useContext, useEffect } from 'react';
import cloudService from '../services/cloudService';
import { useAuth } from './AuthContext';

const CloudContext = createContext(null);

export const CloudProvider = ({ children }) => {
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCloudAccounts();
    }
  }, [user]);

  const fetchCloudAccounts = async () => {
    try {
      setLoading(true);
      const accounts = await cloudService.getCloudAccounts();
      setCloudAccounts(accounts);
      
      // Auto-select first account if available
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0]);
        fetchFiles(accounts[0].id);
      }
    } catch (error) {
      console.error('Error fetching cloud accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (accountId) => {
    try {
      setLoading(true);
      const fileList = await cloudService.getFiles(accountId);
      setFiles(fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (accountId, file) => {
    try {
      setLoading(true);
      const uploadedFile = await cloudService.uploadFile(accountId, file);
      
      // Refresh files
      await fetchFiles(accountId);
      
      return uploadedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleDrive = () => {
  // Pass username from auth context
  cloudService.connectGoogleDrive(user?.username);
};

  return (
    <CloudContext.Provider
      value={{
        cloudAccounts,
        files,
        loading,
        selectedAccount,
        setSelectedAccount,
        fetchCloudAccounts,
        fetchFiles,
        uploadFile,
        connectGoogleDrive,
      }}
    >
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