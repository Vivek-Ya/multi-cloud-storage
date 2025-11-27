import api from './api';

const fileService = {
  // Get all files across all cloud accounts
  getAllFiles: async () => {
    try {
      const response = await api.get('/cloud-accounts/files/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get a specific file by ID
  getFile: async (fileId) => {
    try {
      const response = await api.get(`/cloud-accounts/files/${fileId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get files from specific cloud account
  getFilesByAccount: async (accountId, path = '') => {
    try {
      const response = await api.get(`/cloud-accounts/${accountId}/files`, {
        params: { path }
      });
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
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Try to get filename from Content-Disposition header
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
      
      // Clean up blob URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      throw error.response?.data || error;
    }
  },

  // Delete a file
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
        data: fileIds,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Rename a file
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

  // Move file to different location or account
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

  // Copy file to different location or account
  copyFile: async (fileId, targetAccountId, targetPath) => {
    try {
      const response = await api.post(`/cloud-accounts/files/${fileId}/copy`, {
        targetAccountId,
        targetPath,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload single file
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

  // Search files across all accounts
  searchFiles: async (query) => {
    try {
      const response = await api.get('/cloud-accounts/search', {
        params: { query }
      });
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

  // Get file preview/thumbnail
  getFilePreview: async (fileId) => {
    try {
      const response = await api.get(`/cloud-accounts/files/${fileId}/preview`, {
        responseType: 'blob',
      });
      return URL.createObjectURL(response.data);
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get file metadata/details
  getFileMetadata: async (fileId) => {
    try {
      const response = await api.get(`/cloud-accounts/files/${fileId}/metadata`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get recent files
  getRecentFiles: async (limit = 20) => {
    try {
      const response = await api.get('/cloud-accounts/files/recent', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get files by type
  getFilesByType: async (fileType) => {
    try {
      const response = await api.get(`/cloud-accounts/files/type/${fileType}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get starred/favorite files
  getStarredFiles: async () => {
    try {
      const response = await api.get('/cloud-accounts/files/starred');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Star/unstar a file
  toggleStarFile: async (fileId, starred) => {
    try {
      const response = await api.put(`/cloud-accounts/files/${fileId}/star`, {
        starred,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default fileService;