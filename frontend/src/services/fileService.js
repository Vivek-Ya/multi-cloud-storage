import api from './api';

const fileService = {
  getAllFiles: async () => {
    const response = await api.get('/files');
    return response.data;
  },

  getFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  renameFile: async (fileId, newName) => {
    const response = await api.put(`/files/${fileId}`, { fileName: newName });
    return response.data;
  },
};

export default fileService;