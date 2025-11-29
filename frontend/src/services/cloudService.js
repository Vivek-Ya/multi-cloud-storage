import api from './api';

// Ensure we have both an API base (used by `api.js`) and a backend root
// If REACT_APP_API_BASE_URL is set to something like `http://localhost:8080/api`
// OAuth endpoints on the backend are under `/oauth2/*` (not `/api/oauth2/*`).
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
const BACKEND_ROOT = (API_BASE_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');

const cloudService = {
  // Get all connected cloud accounts
  getCloudAccounts: async () => {
    try {
      const response = await api.get('/cloud-accounts');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get a specific cloud account
  getCloudAccount: async (accountId) => {
    try {
      const response = await api.get(`/cloud-accounts/${accountId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Disconnect cloud account
  disconnectAccount: async (accountId) => {
    try {
      const response = await api.delete(`/cloud-accounts/${accountId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Connect to Google Drive
  connectGoogleDrive: (username) => {
    const url = `${BACKEND_ROOT}/oauth2/authorize/google${username ? `?username=${encodeURIComponent(username)}` : ''}`;
    console.log('Redirecting to Google OAuth URL:', url);
    window.location.href = url;
  },

  // Connect to OneDrive
  connectOneDrive: (username) => {
    const url = `${BACKEND_ROOT}/oauth2/authorize/onedrive${username ? `?username=${encodeURIComponent(username)}` : ''}`;
    console.log('Redirecting to OneDrive OAuth URL:', url);
    window.location.href = url;
  },

  // Connect to Dropbox
  connectDropbox: (username) => {
    const url = `${BACKEND_ROOT}/oauth2/authorize/dropbox${username ? `?username=${encodeURIComponent(username)}` : ''}`;
    console.log('Redirecting to Dropbox OAuth URL:', url);
    window.location.href = url;
  },

  // Get files from a cloud account
  getFiles: async (accountId, path = '') => {
    try {
      const response = await api.get(`/cloud-accounts/${accountId}/files`, {
        params: { path }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all files across all cloud accounts
  getAllFiles: async () => {
    try {
      const response = await api.get('/cloud-accounts/files/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload file to cloud account
  uploadFile: async (accountId, file, path = '', onProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (path) {
        formData.append('path', path);
      }

      const response = await api.post(
        `/cloud-accounts/${accountId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload multiple files
  uploadMultipleFiles: async (accountId, files, path = '', onProgress) => {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (path) {
        formData.append('path', path);
      }

      const response = await api.post(
        `/cloud-accounts/${accountId}/upload/multiple`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Download file
  downloadFile: async (fileId, fileName) => {
    try {
      const response = await api.get(`/cloud-accounts/files/${fileId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let downloadFileName = fileName || 'download';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFileName = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', downloadFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete file
  deleteFile: async (fileId) => {
    try {
      const response = await api.delete(`/cloud-accounts/files/${fileId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Batch delete files
  batchDeleteFiles: async (fileIds) => {
    try {
      const response = await api.delete('/cloud-accounts/files/batch', {
        data: { fileIds },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Rename file
  renameFile: async (fileId, newName) => {
    try {
      const response = await api.put(`/cloud-accounts/files/${fileId}/rename`, {
        newName,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create folder
  createFolder: async (accountId, folderName, parentFolderId = '') => {
    try {
      const response = await api.post(`/cloud-accounts/${accountId}/folder`, {
        folderName,
        parentFolderId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Move file
  moveFile: async (fileId, targetAccountId, newPath) => {
    try {
      const response = await api.put(`/cloud-accounts/files/${fileId}/move`, {
        targetAccountId,
        newPath,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Copy file
  copyFile: async (fileId, targetAccountId, targetFolderId = '') => {
    try {
      const response = await api.post(`/cloud-accounts/files/${fileId}/copy`, {
        targetAccountId,
        targetFolderId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Preview file
  previewFile: async (fileId) => {
    try {
      const response = await api.get(`/cloud-accounts/files/${fileId}/preview`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Search files
  searchFiles: async (query) => {
    try {
      const response = await api.get(`/cloud-accounts/search`, {
        params: { query }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get file details
  getFileDetails: async (fileId) => {
    try {
      const response = await api.get(`/cloud-accounts/files/${fileId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Share file
  shareFile: async (fileId, shareData) => {
    try {
      const response = await api.post(`/cloud-accounts/files/${fileId}/share`, shareData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get storage stats
  getStorageStats: async () => {
    try {
      const response = await api.get('/cloud-accounts/storage/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Sync cloud account
  syncAccount: async (accountId) => {
    try {
      const response = await api.post(`/cloud-accounts/${accountId}/sync`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default cloudService;