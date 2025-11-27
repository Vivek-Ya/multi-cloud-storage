// Format file size from bytes to human readable format
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Format date to readable format
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return diffMinutes === 0 ? 'Just now' : `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Get file icon based on file type
export const getFileIcon = (fileName, mimeType) => {
  if (!fileName) return 'InsertDriveFile';
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Document types
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return 'Description';
  }
  
  // Spreadsheet types
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
    return 'TableChart';
  }
  
  // Presentation types
  if (['ppt', 'pptx', 'odp'].includes(extension)) {
    return 'Slideshow';
  }
  
  // PDF
  if (extension === 'pdf') {
    return 'PictureAsPdf';
  }
  
  // Image types
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
    return 'Image';
  }
  
  // Video types
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension)) {
    return 'VideoFile';
  }
  
  // Audio types
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)) {
    return 'AudioFile';
  }
  
  // Archive types
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'FolderZip';
  }
  
  // Code types
  if (['js', 'jsx', 'ts', 'tsx', 'java', 'py', 'cpp', 'c', 'html', 'css', 'json', 'xml'].includes(extension)) {
    return 'Code';
  }
  
  // Folder
  if (mimeType === 'folder' || mimeType === 'application/vnd.google-apps.folder') {
    return 'Folder';
  }
  
  return 'InsertDriveFile';
};

// Get file color based on type
export const getFileColor = (fileName) => {
  if (!fileName) return '#757575';
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  const colorMap = {
    // Documents - Blue
    doc: '#1976d2', docx: '#1976d2', txt: '#1976d2', rtf: '#1976d2', odt: '#1976d2',
    
    // Spreadsheets - Green
    xls: '#388e3c', xlsx: '#388e3c', csv: '#388e3c', ods: '#388e3c',
    
    // Presentations - Orange
    ppt: '#f57c00', pptx: '#f57c00', odp: '#f57c00',
    
    // PDF - Red
    pdf: '#d32f2f',
    
    // Images - Purple
    jpg: '#7b1fa2', jpeg: '#7b1fa2', png: '#7b1fa2', gif: '#7b1fa2', 
    bmp: '#7b1fa2', svg: '#7b1fa2', webp: '#7b1fa2',
    
    // Videos - Pink
    mp4: '#c2185b', avi: '#c2185b', mov: '#c2185b', wmv: '#c2185b',
    
    // Audio - Teal
    mp3: '#00796b', wav: '#00796b', ogg: '#00796b', flac: '#00796b',
    
    // Archives - Brown
    zip: '#5d4037', rar: '#5d4037', '7z': '#5d4037', tar: '#5d4037',
    
    // Code - Indigo
    js: '#303f9f', jsx: '#303f9f', ts: '#303f9f', tsx: '#303f9f',
    java: '#303f9f', py: '#303f9f', cpp: '#303f9f', html: '#303f9f',
  };
  
  return colorMap[extension] || '#757575';
};

// Get cloud provider icon
export const getProviderIcon = (provider) => {
  const icons = {
    GOOGLE_DRIVE: 'cloud',
    ONEDRIVE: 'cloud',
    DROPBOX: 'cloud',
  };
  return icons[provider] || 'cloud';
};

// Get cloud provider color
export const getProviderColor = (provider) => {
  const colors = {
    GOOGLE_DRIVE: '#4285f4',
    ONEDRIVE: '#0078d4',
    DROPBOX: '#0061ff',
  };
  return colors[provider] || '#757575';
};

// Get cloud provider name
export const getProviderName = (provider) => {
  const names = {
    GOOGLE_DRIVE: 'Google Drive',
    ONEDRIVE: 'OneDrive',
    DROPBOX: 'Dropbox',
  };
  return names[provider] || provider;
};

// Validate file upload
export const validateFile = (file, maxSize = 100 * 1024 * 1024) => { // 100MB default
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${formatFileSize(maxSize)}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Group files by date
export const groupFilesByDate = (files) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Last 7 days': [],
    'Last 30 days': [],
    'Older': []
  };
  
  files.forEach(file => {
    const fileDate = new Date(file.modifiedAt || file.createdAt);
    fileDate.setHours(0, 0, 0, 0);
    
    if (fileDate.getTime() === today.getTime()) {
      groups['Today'].push(file);
    } else if (fileDate.getTime() === yesterday.getTime()) {
      groups['Yesterday'].push(file);
    } else if (fileDate >= lastWeek) {
      groups['Last 7 days'].push(file);
    } else if (fileDate >= lastMonth) {
      groups['Last 30 days'].push(file);
    } else {
      groups['Older'].push(file);
    }
  });
  
  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
};

// Truncate text
export const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Check if file is image
export const isImageFile = (fileName) => {
  if (!fileName) return false;
  const extension = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension);
};

// Check if file is video
export const isVideoFile = (fileName) => {
  if (!fileName) return false;
  const extension = fileName.split('.').pop().toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension);
};

// Sort files
export const sortFiles = (files, sortBy = 'name', sortOrder = 'asc') => {
  const sortedFiles = [...files];
  
  sortedFiles.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.fileName.localeCompare(b.fileName);
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
      case 'date':
        comparison = new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt);
        break;
      case 'type':
        const extA = a.fileName.split('.').pop().toLowerCase();
        const extB = b.fileName.split('.').pop().toLowerCase();
        comparison = extA.localeCompare(extB);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return sortedFiles;
};

// Handle API errors
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || error.response.data?.error || 'An error occurred';
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};