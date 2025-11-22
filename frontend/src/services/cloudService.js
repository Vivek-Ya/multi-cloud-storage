import api from './api';

const cloudService = {
  // Get all connected cloud accounts
  getCloudAccounts: async () => {
    const response = await api.get('/cloud-accounts');
    return response.data;
  },

  // Connect to Google Drive - UPDATED
  connectGoogleDrive: (username) => {
    // Pass username as query parameter
    window.location.href = `http://localhost:8080/oauth2/authorize/google?username=${username}`;
  },

  // Get files from a cloud account
  getFiles: async (accountId) => {
    const response = await api.get(`/cloud-accounts/${accountId}/files`);
    return response.data;
  },

  // Upload file to cloud account
  uploadFile: async (accountId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/cloud-accounts/${accountId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

export default cloudService;