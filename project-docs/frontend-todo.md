# Multi-Cloud Storage - Frontend TODO

## 📋 Files to Share in New Chat

Share these files from: `~/Desktop/multi-cloud-storage/frontend/src/`

### Priority 1 (Core):
1. package.json
2. App.js (or App.jsx)
3. index.js
4. services/api.js
5. services/authService.js
6. services/cloudService.js
7. context/AuthContext.jsx
8. context/CloudContext.jsx

### Priority 2 (Components):
9. components/auth/Login.jsx
10. components/auth/Signup.jsx
11. components/dashboard/Dashboard.jsx
12. components/files/FileManager.jsx
13. components/files/FileList.jsx
14. components/files/FileUpload.jsx

## 🎯 Frontend Updates Needed

### New Components to Create:
- FileSearch.jsx
- FolderCreate.jsx
- DragDropZone.jsx
- Toast notification system
- LoadingSpinner.jsx
- ErrorBoundary.jsx

### New Services:
- fileService.js (complete CRUD)
- analyticsService.js

### New Utils:
- constants.js
- helpers.js
- validators.js

## 📍 Backend API Base URL
http://localhost:8080/api

## 🔑 Environment Variables Needed
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_GOOGLE_CLIENT_ID=...
REACT_APP_ONEDRIVE_CLIENT_ID=...
REACT_APP_DROPBOX_CLIENT_ID=...