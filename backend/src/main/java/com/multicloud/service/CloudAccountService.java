package com.multicloud.service;

import com.google.api.services.drive.model.File;
import com.multicloud.dto.*;
import com.multicloud.model.*;
import com.multicloud.repository.CloudAccountRepository;
import com.multicloud.repository.FileMetadataRepository;
import com.multicloud.repository.UserRepository;
import com.multicloud.util.InMemoryMultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CloudAccountService {

    private static final Logger logger = LoggerFactory.getLogger(CloudAccountService.class);

    private static final Map<String, GoogleExportFormat> GOOGLE_EXPORT_FORMATS = Map.of(
            "application/vnd.google-apps.document", new GoogleExportFormat(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
            "application/vnd.google-apps.spreadsheet", new GoogleExportFormat(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
            "application/vnd.google-apps.presentation", new GoogleExportFormat(
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"),
            "application/vnd.google-apps.drawing", new GoogleExportFormat("image/png", ".png"));

        private static final long INLINE_PREVIEW_MAX_BYTES = 6L * 1024 * 1024;
        private static final Set<String> SIMPLE_TEXT_MIME_TYPES = Set.of(
            "application/json",
            "application/xml",
            "application/javascript",
            "text/csv",
            "text/html",
            "text/xml");

    @Autowired
    private CloudAccountRepository cloudAccountRepository;

    @Autowired
    private FileMetadataRepository fileMetadataRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoogleDriveService googleDriveService;

    @Autowired
    private OneDriveService oneDriveService;

    @Autowired
    private DropboxService dropboxService;

    /**
     * Save or update a cloud account for a user
     */
    @Transactional
    public CloudAccount saveCloudAccount(User user, CloudProvider provider, String accessToken,
                                        String refreshToken, String accountEmail) throws Exception {
        
        logger.info("Saving cloud account for user: {}, provider: {}", 
                user.getUsername(), provider);

        // Check if account already exists
        var existing = cloudAccountRepository.findByUserAndProviderNameAndAccountEmail(
                user, provider, accountEmail);

        CloudAccount account;
        if (existing.isPresent()) {
            account = existing.get();
            account.setAccessToken(accessToken);
            account.setRefreshToken(refreshToken);
            account.setIsActive(true);
            logger.info("Updating existing cloud account ID: {}", account.getId());
        } else {
            account = CloudAccount.builder()
                    .user(user)
                    .providerName(provider)
                    .accountEmail(accountEmail)
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .isActive(true)
                    .build();
            logger.info("Creating new cloud account");
        }

        refreshStorageQuota(account);

        // Set token expiry (1 hour from now)
        account.setTokenExpiry(LocalDateTime.now().plusHours(1));
        account.setLastSynced(LocalDateTime.now());

        CloudAccount savedAccount = cloudAccountRepository.save(account);
        logger.info("Cloud account saved successfully with ID: {}", savedAccount.getId());
        
        return savedAccount;
    }

    /**
     * Get all active cloud accounts for a user
     */
    public List<CloudAccountDTO> getUserCloudAccounts(Long userId) {
        logger.debug("Fetching cloud accounts for user ID: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        List<CloudAccount> accounts = cloudAccountRepository.findByUserAndIsActive(user, true);
        logger.info("Found {} active cloud accounts for user: {}", accounts.size(), user.getUsername());

        return accounts.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all files from a specific cloud account
     */
    public List<FileDTO> getFilesFromCloudAccount(Long cloudAccountId) throws Exception {
        logger.info("Fetching files from cloud account ID: {}", cloudAccountId);
        
        CloudAccount account = cloudAccountRepository.findById(cloudAccountId)
                .orElseThrow(() -> new RuntimeException("Cloud account not found with ID: " + cloudAccountId));

        try {
            List<FileDTO> files = executeWithTokenRefresh(account, token -> fetchFilesForProvider(account, token));

            refreshStorageQuota(account);
            account.setLastSynced(LocalDateTime.now());
            cloudAccountRepository.save(account);

            return files;

        } catch (Exception e) {
            logger.error("Error fetching files from cloud account ID: {}", cloudAccountId, e);

            List<FileDTO> cachedFiles = getCachedFiles(account);
            if (!cachedFiles.isEmpty()) {
                logger.warn("Returning cached metadata for cloud account ID: {}", cloudAccountId);
                return cachedFiles;
            }

            throw new Exception("Failed to fetch files: " + e.getMessage());
        }
    }

    private List<FileDTO> fetchFilesForProvider(CloudAccount account, String accessToken) throws Exception {
        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            List<File> googleFiles = googleDriveService.listFiles(accessToken);
            logger.info("Retrieved {} files from Google Drive", googleFiles.size());

            return googleFiles.stream()
                    .map(file -> saveGoogleDriveFileMetadata(account, file))
                    .map(this::convertFileToDTO)
                    .collect(Collectors.toList());
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            List<Map<String, Object>> oneDriveFiles = oneDriveService.listFiles(accessToken);
            logger.info("Retrieved {} files from OneDrive", oneDriveFiles.size());

            return oneDriveFiles.stream()
                    .map(file -> saveOneDriveFileMetadata(account, file))
                    .map(this::convertFileToDTO)
                    .collect(Collectors.toList());
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            List<Map<String, Object>> dropboxFiles = dropboxService.listFiles(accessToken);
            logger.info("Retrieved {} files from Dropbox", dropboxFiles.size());

            return dropboxFiles.stream()
                    .map(file -> saveDropboxFileMetadata(account, file))
                    .map(this::convertFileToDTO)
                    .collect(Collectors.toList());
        }

        throw new RuntimeException("Unsupported cloud provider: " + account.getProviderName());
    }

    private FileDTO uploadFileForProvider(CloudAccount account, MultipartFile file, String folderPath, String accessToken) throws Exception {
        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            File uploadedFile = googleDriveService.uploadFile(accessToken, file, folderPath);
            FileMetadata metadata = saveGoogleDriveFileMetadata(account, uploadedFile);
            logger.info("File uploaded successfully to Google Drive");
            return convertFileToDTO(metadata);
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            Map<String, Object> uploadedFile = oneDriveService.uploadFile(accessToken, file);
            FileMetadata metadata = saveOneDriveFileMetadata(account, uploadedFile);
            logger.info("File uploaded successfully to OneDrive");
            return convertFileToDTO(metadata);
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            Map<String, Object> uploadedFile = dropboxService.uploadFile(accessToken, file);
            FileMetadata metadata = saveDropboxFileMetadata(account, uploadedFile);
            logger.info("File uploaded successfully to Dropbox");
            return convertFileToDTO(metadata);
        }

        throw new RuntimeException("Unsupported cloud provider: " + account.getProviderName());
    }

    private ByteArrayOutputStream downloadFileForProvider(CloudAccount account, String cloudFileId, String accessToken) throws Exception {
        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            return googleDriveService.downloadFile(accessToken, cloudFileId);
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            return oneDriveService.downloadFile(accessToken, cloudFileId);
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            return dropboxService.downloadFile(accessToken, cloudFileId);
        }

        throw new RuntimeException("Unsupported cloud provider: " + account.getProviderName());
    }

    private void deleteFileForProvider(CloudAccount account, String cloudFileId, String accessToken) throws Exception {
        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            googleDriveService.deleteFile(accessToken, cloudFileId);
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            oneDriveService.deleteFile(accessToken, cloudFileId);
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            dropboxService.deleteFile(accessToken, cloudFileId);
        } else {
            throw new RuntimeException("Unsupported cloud provider: " + account.getProviderName());
        }
    }

    private FileMetadata renameFileForProvider(CloudAccount account, FileMetadata metadata, String newName, String accessToken) throws Exception {
        String cloudFileId = metadata.getCloudFileId();

        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            File renamed = googleDriveService.renameFile(accessToken, cloudFileId, newName);
            if (renamed != null) {
                metadata.setFileName(renamed.getName());
                if (renamed.getModifiedTime() != null) {
                    metadata.setModifiedAt(LocalDateTime.ofInstant(
                            java.time.Instant.ofEpochMilli(renamed.getModifiedTime().getValue()),
                            ZoneId.systemDefault()));
                }
            }
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            Map<String, Object> renamed = oneDriveService.renameFile(accessToken, cloudFileId, newName);
            if (renamed != null) {
                metadata.setFileName((String) renamed.getOrDefault("name", newName));
            } else {
                metadata.setFileName(newName);
            }
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            Map<String, Object> renamed = dropboxService.renameFile(accessToken, cloudFileId, newName);
            if (renamed != null) {
                metadata.setFileName((String) renamed.getOrDefault("name", newName));
                metadata.setCloudFileId((String) renamed.getOrDefault("id", metadata.getCloudFileId()));
            } else {
                metadata.setFileName(newName);
            }
        } else {
            throw new RuntimeException("Rename not supported for provider: " + account.getProviderName());
        }

        return fileMetadataRepository.save(metadata);
    }

    private FileMetadata moveFileForProvider(CloudAccount account, FileMetadata metadata, String newPath, String accessToken) throws Exception {
        if (account.getProviderName() != CloudProvider.DROPBOX) {
            throw new RuntimeException("Move operation not supported for " + account.getProviderName());
        }

        Map<String, Object> moved = dropboxService.moveFile(accessToken, metadata.getCloudFileId(), newPath);
        if (moved != null) {
            metadata.setCloudFileId((String) moved.getOrDefault("id", newPath));
            metadata.setFileName((String) moved.getOrDefault("name", metadata.getFileName()));
        }
        metadata.setFilePath(newPath);
        return fileMetadataRepository.save(metadata);
    }

    private FileDTO createFolderForProvider(CloudAccount account, String folderName, String parentFolderId, String accessToken) throws Exception {
        String normalizedParentId = (parentFolderId != null && !parentFolderId.trim().isEmpty())
                ? parentFolderId.trim()
                : null;

        if (account.getProviderName() == CloudProvider.DROPBOX) {
            Map<String, Object> folderData = dropboxService.createFolder(accessToken, folderName, normalizedParentId);
            FileMetadata metadata = saveDropboxFileMetadata(account, folderData);
            logger.info("Folder created successfully in Dropbox");
            return convertFileToDTO(metadata);
        } else if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            com.google.api.services.drive.model.File folder =
                    googleDriveService.createFolder(accessToken, folderName, normalizedParentId);
            FileMetadata metadata = saveGoogleDriveFileMetadata(account, folder);
            logger.info("Folder created successfully in Google Drive");
            return convertFileToDTO(metadata);
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            Map<String, Object> folderData = oneDriveService.createFolder(accessToken, folderName, normalizedParentId);
            FileMetadata metadata = saveOneDriveFileMetadata(account, folderData);
            logger.info("Folder created successfully in OneDrive");
            return convertFileToDTO(metadata);
        }

        throw new RuntimeException("Unsupported cloud provider: " + account.getProviderName());
    }

    /**
     * Upload a file to a cloud account
     */
    @Transactional
    public FileDTO uploadFile(Long cloudAccountId, MultipartFile file, String folderPath) 
            throws Exception {
        logger.info("Uploading file: {} (size: {} bytes) to account ID: {}", 
                file.getOriginalFilename(), file.getSize(), cloudAccountId);
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        CloudAccount account = cloudAccountRepository.findById(cloudAccountId)
                .orElseThrow(() -> new RuntimeException("Cloud account not found with ID: " + cloudAccountId));

        try {
            FileDTO uploadedFile = executeWithTokenRefresh(account,
                    token -> uploadFileForProvider(account, file, folderPath, token));

            refreshStorageQuota(account);
            account.setLastSynced(LocalDateTime.now());
            cloudAccountRepository.save(account);

            return uploadedFile;

        } catch (Exception e) {
            logger.error("Error uploading file to cloud account ID: {}", cloudAccountId, e);
            throw new Exception("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Download a file from cloud storage
     */
    public ByteArrayOutputStream downloadFile(Long fileId) throws Exception {
        logger.info("Downloading file ID: {}", fileId);
        
        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        CloudAccount account = metadata.getCloudAccount();
        String cloudFileId = metadata.getCloudFileId();

        try {
            ByteArrayOutputStream outputStream = executeWithTokenRefresh(account,
                    token -> downloadFileForProvider(account, cloudFileId, token));

            metadata.setLastAccessed(LocalDateTime.now());
            fileMetadataRepository.save(metadata);

            logger.info("File downloaded successfully: {}", metadata.getFileName());
            return outputStream;

        } catch (Exception e) {
            logger.error("Error downloading file ID: {}", fileId, e);
            throw new Exception("Failed to download file: " + e.getMessage());
        }
    }

    public FilePreviewResponse getFilePreview(Long fileId) throws Exception {
        logger.info("Preparing preview for file ID: {}", fileId);

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        if (Boolean.TRUE.equals(metadata.getIsFolder())) {
            return finalizePreviewResponse(metadata, FilePreviewResponse.builder()
                .fileId(fileId)
                .fileName(metadata.getFileName())
                .provider(metadata.getCloudAccount().getProviderName().toString())
                .mimeType(metadata.getMimeType())
                .fileSize(metadata.getFileSize())
                .thumbnailUrl(metadata.getThumbnailUrl())
                .previewAvailable(false)
                .previewMode("UNSUPPORTED")
                .message("Folders cannot be previewed")
                .build());
        }

        CloudAccount account = metadata.getCloudAccount();

        FilePreviewResponse.FilePreviewResponseBuilder builder = FilePreviewResponse.builder()
                .fileId(fileId)
                .fileName(metadata.getFileName())
                .provider(account.getProviderName().toString())
                .mimeType(metadata.getMimeType())
                .fileSize(metadata.getFileSize())
                .thumbnailUrl(metadata.getThumbnailUrl());

        try {
            if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE
                    && isGoogleWorkspaceMimeType(metadata.getMimeType())) {
                return buildGoogleWorkspacePreview(account, metadata, builder);
            }

            if (shouldAttemptInline(metadata)) {
                ByteArrayOutputStream stream = executeWithTokenRefresh(account,
                        token -> downloadFileForProvider(account, metadata.getCloudFileId(), token));

                byte[] fileBytes = stream.toByteArray();
                if (fileBytes.length <= INLINE_PREVIEW_MAX_BYTES) {
                    return buildInlinePreviewResponse(metadata, builder, fileBytes,
                            metadata.getMimeType() != null ? metadata.getMimeType() : "application/octet-stream");
                }
            }

            String externalLink = resolveExternalPreviewUrl(account, metadata);
            if (externalLink != null) {
                return finalizePreviewResponse(metadata, builder.previewAvailable(false)
                    .previewMode("EXTERNAL_LINK")
                    .previewUrl(externalLink)
                    .message("Preview will open in a new browser tab.")
                    .build());
            }

                return finalizePreviewResponse(metadata, builder.previewAvailable(false)
                    .previewMode("UNSUPPORTED")
                    .message("Preview is not supported for this file type.")
                    .build());

        } catch (Exception e) {
            logger.error("Error preparing preview for file {}", fileId, e);

            String fallbackUrl = null;
            try {
                fallbackUrl = resolveExternalPreviewUrl(account, metadata);
            } catch (Exception nested) {
                logger.warn("Failed to build fallback preview URL for file {}: {}", fileId, nested.getMessage());
            }

            if (fallbackUrl != null) {
                return finalizePreviewResponse(metadata, builder.previewAvailable(false)
                        .previewMode("EXTERNAL_LINK")
                        .previewUrl(fallbackUrl)
                        .message("Preview is not available inline. Please open in a new tab.")
                        .build());
            }

            throw new Exception("Failed to prepare preview: " + e.getMessage());
        }
    }

    /**
     * Delete a file from cloud storage
     */
    @Transactional
    public void deleteFile(Long fileId) throws Exception {
        logger.info("Deleting file ID: {}", fileId);
        
        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        CloudAccount account = metadata.getCloudAccount();
        String cloudFileId = metadata.getCloudFileId();

        try {
            executeWithTokenRefresh(account, token -> {
                deleteFileForProvider(account, cloudFileId, token);
                return Boolean.TRUE;
            });

            fileMetadataRepository.delete(metadata);
            logger.info("File deleted successfully: {}", metadata.getFileName());

            refreshStorageQuota(account);
            account.setLastSynced(LocalDateTime.now());
            cloudAccountRepository.save(account);

        } catch (Exception e) {
            logger.error("Error deleting file ID: {}", fileId, e);
            throw new Exception("Failed to delete file: " + e.getMessage());
        }
    }

    /**
     * Rename a file in cloud storage
     */
    @Transactional
    public FileDTO renameFile(Long fileId, String newName) throws Exception {
        logger.info("Renaming file ID: {} to: {}", fileId, newName);
        
        if (newName == null || newName.trim().isEmpty()) {
            throw new IllegalArgumentException("New file name cannot be empty");
        }

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        CloudAccount account = metadata.getCloudAccount();
        String cloudFileId = metadata.getCloudFileId();

        try {
            FileMetadata updatedMetadata = executeWithTokenRefresh(account,
                    token -> renameFileForProvider(account, metadata, newName, token));

            logger.info("File renamed successfully");

            return convertFileToDTO(updatedMetadata);

        } catch (Exception e) {
            logger.error("Error renaming file ID: {}", fileId, e);
            throw new Exception("Failed to rename file: " + e.getMessage());
        }
    }

    /**
     * Copy a file from one cloud account to another
     */
    @Transactional
    public FileDTO copyFile(Long fileId, Long targetAccountId, String targetFolderId, Long userId) throws Exception {
        logger.info("Copying file ID: {} to target account ID: {}", fileId, targetAccountId);

        FileMetadata sourceMetadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        if (!Objects.equals(sourceMetadata.getUser().getId(), userId)) {
            throw new IllegalArgumentException("You do not have permission to copy this file");
        }

        if (Boolean.TRUE.equals(sourceMetadata.getIsFolder())) {
            throw new IllegalArgumentException("Copying folders is not supported yet");
        }

        CloudAccount sourceAccount = sourceMetadata.getCloudAccount();
        CloudAccount targetAccount = cloudAccountRepository.findById(targetAccountId)
                .orElseThrow(() -> new RuntimeException("Target cloud account not found with ID: " + targetAccountId));

        if (!Objects.equals(targetAccount.getUser().getId(), userId)) {
            throw new IllegalArgumentException("Target cloud account is not linked to the current user");
        }

        String effectiveFileName = sourceMetadata.getFileName() != null
                ? sourceMetadata.getFileName()
                : "copied-file";

        String effectiveContentType = sourceMetadata.getMimeType() != null
                ? sourceMetadata.getMimeType()
                : "application/octet-stream";

        ByteArrayOutputStream downloadedStream;

        if (sourceAccount.getProviderName() == CloudProvider.GOOGLE_DRIVE
                && isGoogleWorkspaceMimeType(sourceMetadata.getMimeType())) {
            GoogleExportFormat exportFormat = resolveGoogleExportFormat(sourceMetadata.getMimeType());
            effectiveContentType = exportFormat.mimeType();

            downloadedStream = executeWithTokenRefresh(sourceAccount,
                    token -> googleDriveService.exportFile(token, sourceMetadata.getCloudFileId(), exportFormat.mimeType()));

            effectiveFileName = ensureFileExtension(effectiveFileName, exportFormat.extension());
        } else {
            downloadedStream = executeWithTokenRefresh(sourceAccount,
                    token -> downloadFileForProvider(sourceAccount, sourceMetadata.getCloudFileId(), token));
        }

        byte[] fileBytes = downloadedStream.toByteArray();
        if (fileBytes.length == 0) {
            throw new IllegalStateException("Source file returned no data");
        }

        InMemoryMultipartFile inMemoryFile = new InMemoryMultipartFile(
            effectiveFileName,
            effectiveFileName,
            effectiveContentType,
            fileBytes
        );

        String normalizedTargetFolderId = (targetFolderId != null && !targetFolderId.isBlank())
                ? targetFolderId.trim()
                : null;

        try {
            FileDTO copiedFile = executeWithTokenRefresh(targetAccount,
                    token -> uploadFileForProvider(targetAccount, inMemoryFile, normalizedTargetFolderId, token));

            refreshStorageQuota(targetAccount);
            targetAccount.setLastSynced(LocalDateTime.now());
            cloudAccountRepository.save(targetAccount);

            logger.info("Copied file '{}' to account {}", sourceMetadata.getFileName(), targetAccountId);
            return copiedFile;
        } catch (Exception e) {
            logger.error("Failed to copy file ID: {} to account {}", fileId, targetAccountId, e);
            throw new Exception("Failed to copy file: " + e.getMessage());
        }
    }

    private boolean isGoogleWorkspaceMimeType(String mimeType) {
        return mimeType != null && mimeType.startsWith("application/vnd.google-apps.");
    }

    private FilePreviewResponse buildGoogleWorkspacePreview(CloudAccount account,
                                                             FileMetadata metadata,
                                                             FilePreviewResponse.FilePreviewResponseBuilder builder) throws Exception {
        GoogleExportFormat exportFormat = resolveGoogleExportFormat(metadata.getMimeType());

        ByteArrayOutputStream exportedStream = executeWithTokenRefresh(account,
                token -> googleDriveService.exportFile(token, metadata.getCloudFileId(), exportFormat.mimeType()));

        byte[] bytes = exportedStream.toByteArray();
        if (bytes.length > INLINE_PREVIEW_MAX_BYTES) {
            String externalLink = resolveExternalPreviewUrl(account, metadata);
            return finalizePreviewResponse(metadata, builder.previewAvailable(false)
                    .previewMode("EXTERNAL_LINK")
                    .previewUrl(externalLink)
                    .message("Document is too large to preview inline. Open in a new tab.")
                    .build());
        }

        String contentType = exportFormat.mimeType();
        return buildInlinePreviewResponse(metadata, builder, bytes, contentType);
    }

    private boolean shouldAttemptInline(FileMetadata metadata) {
        if (metadata.getMimeType() == null) {
            return false;
        }

        if (isGoogleWorkspaceMimeType(metadata.getMimeType())) {
            return false;
        }

        if (metadata.getFileSize() != null && metadata.getFileSize() > INLINE_PREVIEW_MAX_BYTES) {
            return false;
        }

        String mime = metadata.getMimeType().toLowerCase(Locale.ROOT);
        return mime.startsWith("image/") ||
                mime.startsWith("text/") ||
                "application/pdf".equals(mime) ||
                SIMPLE_TEXT_MIME_TYPES.contains(mime);
    }

    private FilePreviewResponse buildInlinePreviewResponse(FileMetadata metadata,
                                                            FilePreviewResponse.FilePreviewResponseBuilder builder,
                                                            byte[] fileBytes,
                                                            String contentType) {
        if (fileBytes == null || fileBytes.length == 0) {
            return finalizePreviewResponse(metadata, builder.previewAvailable(false)
                    .previewMode("UNSUPPORTED")
                    .message("Preview is not available for this file.")
                .build());
        }

        String effectiveContentType = contentType != null ? contentType : "application/octet-stream";
        String inlineContent = Base64.getEncoder().encodeToString(fileBytes);
        String previewMode = determinePreviewMode(effectiveContentType);

        return finalizePreviewResponse(metadata, builder.previewAvailable(true)
                .previewMode(previewMode)
                .contentType(effectiveContentType)
                .inlineContent(inlineContent)
            .build());
    }

    private String resolveExternalPreviewUrl(CloudAccount account, FileMetadata metadata) throws Exception {
        if (metadata.getWebViewLink() != null && !metadata.getWebViewLink().isBlank()) {
            return metadata.getWebViewLink();
        }

        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            if (metadata.getCloudFileId() != null && !metadata.getCloudFileId().isBlank()) {
                return "https://drive.google.com/file/d/" + metadata.getCloudFileId() + "/preview";
            }
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            return metadata.getWebViewLink();
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            return executeWithTokenRefresh(account,
                    token -> dropboxService.getTemporaryLink(token, metadata.getCloudFileId()));
        }

        return null;
    }

    private String determinePreviewMode(String mimeType) {
        if (mimeType == null) {
            return "UNKNOWN";
        }

        String lowerMime = mimeType.toLowerCase(Locale.ROOT);
        if (lowerMime.startsWith("image/")) {
            return "IMAGE";
        }
        if ("application/pdf".equals(lowerMime)) {
            return "PDF";
        }
        if (lowerMime.startsWith("text/") || SIMPLE_TEXT_MIME_TYPES.contains(lowerMime)) {
            return "TEXT";
        }

        return "BINARY";
    }

    private FilePreviewResponse finalizePreviewResponse(FileMetadata metadata, FilePreviewResponse response) {
        metadata.setLastAccessed(LocalDateTime.now());
        fileMetadataRepository.save(metadata);
        return response;
    }

    private GoogleExportFormat resolveGoogleExportFormat(String mimeType) {
        GoogleExportFormat format = GOOGLE_EXPORT_FORMATS.get(mimeType);
        if (format != null) {
            return format;
        }

        // Fallback to PDF for unhandled Google Workspace types
        return new GoogleExportFormat("application/pdf", ".pdf");
    }

    private String ensureFileExtension(String fileName, String requiredExtension) {
        if (fileName == null || fileName.isBlank()) {
            return "copied-file" + requiredExtension;
        }

        String lowerFileName = fileName.toLowerCase(Locale.ROOT);
        if (requiredExtension != null && !requiredExtension.isBlank() && !lowerFileName.endsWith(requiredExtension.toLowerCase(Locale.ROOT))) {
            return fileName + requiredExtension;
        }

        return fileName;
    }

    private record GoogleExportFormat(String mimeType, String extension) {
    }

    /**
     * Move a file to a different location
     */
    @Transactional
    public FileDTO moveFile(Long fileId, String newPath) throws Exception {
        logger.info("Moving file ID: {} to: {}", fileId, newPath);
        
        if (newPath == null || newPath.trim().isEmpty()) {
            throw new IllegalArgumentException("New path cannot be empty");
        }

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        CloudAccount account = metadata.getCloudAccount();
        String cloudFileId = metadata.getCloudFileId();

        try {
            FileMetadata updatedMetadata = executeWithTokenRefresh(account,
                    token -> moveFileForProvider(account, metadata, newPath, token));

            logger.info("File moved successfully");

            return convertFileToDTO(updatedMetadata);

        } catch (Exception e) {
            logger.error("Error moving file ID: {}", fileId, e);
            throw new Exception("Failed to move file: " + e.getMessage());
        }
    }

    /**
     * Create a new folder in cloud storage
     */
    @Transactional
    public FileDTO createFolder(Long cloudAccountId, String folderName, String parentFolderId) throws Exception {
        logger.info("Creating folder: {} in account ID: {}", folderName, cloudAccountId);
        
        if (folderName == null || folderName.trim().isEmpty()) {
            throw new IllegalArgumentException("Folder name cannot be empty");
        }

        CloudAccount account = cloudAccountRepository.findById(cloudAccountId)
                .orElseThrow(() -> new RuntimeException("Cloud account not found with ID: " + cloudAccountId));

        try {
            FileDTO folder = executeWithTokenRefresh(account,
                    token -> createFolderForProvider(account, folderName, parentFolderId, token));

            refreshStorageQuota(account);
            account.setLastSynced(LocalDateTime.now());
            cloudAccountRepository.save(account);

            return folder;

        } catch (Exception e) {
            logger.error("Error creating folder in account ID: {}", cloudAccountId, e);
            throw new Exception("Failed to create folder: " + e.getMessage());
        }
    }

    /**
     * Search files by query and filters
     */
    public List<FileDTO> searchFiles(Long userId, FileSearchRequest searchRequest) {
        logger.info("Searching files for user ID: {} with query: {}", 
                userId, searchRequest.getQuery());
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        // Base search by file name
        List<FileMetadata> results = fileMetadataRepository
                .findByUserAndFileNameContainingIgnoreCase(user, searchRequest.getQuery());

        // Apply additional filters
        results = results.stream()
                .filter(file -> !file.getIsTrashed()) // Exclude trashed files
                .collect(Collectors.toList());

        if (searchRequest.getFileType() != null) {
            results = results.stream()
                    .filter(f -> f.getMimeType() != null && 
                            f.getMimeType().toLowerCase().contains(searchRequest.getFileType().toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (searchRequest.getCloudAccountId() != null) {
            results = results.stream()
                    .filter(f -> f.getCloudAccount().getId().equals(searchRequest.getCloudAccountId()))
                    .collect(Collectors.toList());
        }

        if (searchRequest.getIsStarred() != null) {
            results = results.stream()
                    .filter(f -> f.getIsStarred().equals(searchRequest.getIsStarred()))
                    .collect(Collectors.toList());
        }

        if (searchRequest.getMinSize() != null) {
            results = results.stream()
                    .filter(f -> f.getFileSize() != null && f.getFileSize() >= searchRequest.getMinSize())
                    .collect(Collectors.toList());
        }

        if (searchRequest.getMaxSize() != null) {
            results = results.stream()
                    .filter(f -> f.getFileSize() != null && f.getFileSize() <= searchRequest.getMaxSize())
                    .collect(Collectors.toList());
        }

        logger.info("Found {} files matching search criteria", results.size());

        return results.stream()
                .map(this::convertFileToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Batch delete multiple files
     */
    @Transactional
    public int batchDeleteFiles(List<Long> fileIds) {
        logger.info("Batch deleting {} files", fileIds.size());
        
        int deletedCount = 0;
        int failedCount = 0;

        for (Long fileId : fileIds) {
            try {
                deleteFile(fileId);
                deletedCount++;
            } catch (Exception e) {
                logger.error("Failed to delete file ID: {} - {}", fileId, e.getMessage());
                failedCount++;
            }
        }

        logger.info("Batch delete completed: {} succeeded, {} failed", deletedCount, failedCount);
        return deletedCount;
    }

    /**
     * Toggle star status of a file
     */
    @Transactional
    public FileDTO toggleStarFile(Long fileId) {
        logger.info("Toggling star for file ID: {}", fileId);
        
        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

        metadata.toggleStar();
        metadata = fileMetadataRepository.save(metadata);
        
        logger.info("File star toggled to: {}", metadata.getIsStarred());
        return convertFileToDTO(metadata);
    }

    /**
     * Get storage analytics for a user
     */
    public StorageAnalyticsDTO getStorageAnalytics(Long userId) {
        logger.info("Getting storage analytics for user ID: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        // Get counts
        Long totalFiles = fileMetadataRepository.countFilesByUser(user);
        Long totalFolders = fileMetadataRepository.countFoldersByUser(user);
        Long totalSize = fileMetadataRepository.getTotalFileSizeByUser(user);

        // Get file type distribution
        List<Object[]> fileTypeData = fileMetadataRepository.getFileTypeDistribution(user);
        Map<String, Integer> filesByType = new HashMap<>();
        for (Object[] row : fileTypeData) {
            String fileType = (String) row[0];
            Long count = (Long) row[1];
            filesByType.put(fileType != null ? fileType : "unknown", count.intValue());
        }

        // Get storage by cloud provider
        List<Object[]> providerData = fileMetadataRepository.getFilesByProvider(user);
        Map<String, Long> storageByCloud = new HashMap<>();
        for (Object[] row : providerData) {
            CloudProvider provider = (CloudProvider) row[0];
            Long count = (Long) row[1];
            storageByCloud.put(provider.toString(), count);
        }

        // Calculate most used provider
        String mostUsedProvider = storageByCloud.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("NONE");

        logger.info("Analytics: {} files, {} folders, {} bytes total", 
                totalFiles, totalFolders, totalSize);

        return StorageAnalyticsDTO.builder()
                .totalFiles(totalFiles != null ? totalFiles : 0L)
                .totalFolders(totalFolders != null ? totalFolders : 0L)
                .totalSize(totalSize != null ? totalSize : 0L)
                .filesByType(filesByType)
                .storageByCloud(storageByCloud)
                .uploadCount(0) // TODO: Implement with ActivityLog
                .downloadCount(0) // TODO: Implement with ActivityLog
                .todayUploads(0) // TODO: Implement with ActivityLog
                .todayDownloads(0) // TODO: Implement with ActivityLog
                .mostUsedProvider(mostUsedProvider)
                .build();
    }

    /**
     * Disconnect (deactivate) a cloud account
     */
    @Transactional
    public void disconnectAccount(Long accountId) {
        logger.info("Disconnecting cloud account ID: {}", accountId);
        
        CloudAccount account = cloudAccountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Cloud account not found with ID: " + accountId));

        // Soft delete - mark as inactive
        account.setIsActive(false);
        cloudAccountRepository.save(account);

        logger.info("Cloud account disconnected successfully");
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Save or update Google Drive file metadata
     */
    private FileMetadata saveGoogleDriveFileMetadata(CloudAccount account, File file) {
        var existing = fileMetadataRepository.findByCloudAccountAndCloudFileId(
                account, file.getId());

        FileMetadata metadata;
        if (existing.isPresent()) {
            metadata = existing.get();
        } else {
            metadata = FileMetadata.builder()
                    .user(account.getUser())
                    .cloudAccount(account)
                    .cloudFileId(file.getId())
                    .isStarred(false)
                    .isTrashed(false)
                    .build();
        }

        metadata.setFileName(file.getName());
        metadata.setMimeType(file.getMimeType());
        metadata.setFileSize(file.getSize());
        metadata.setWebViewLink(file.getWebViewLink());
        metadata.setThumbnailUrl(file.getThumbnailLink());
        if (file.getParents() != null && !file.getParents().isEmpty()) {
            metadata.setParentFolderId(file.getParents().get(0));
        } else {
            metadata.setParentFolderId(null);
        }
        metadata.setIsFolder(file.getMimeType() != null && 
                file.getMimeType().equals("application/vnd.google-apps.folder"));

        if (file.getModifiedTime() != null) {
            metadata.setModifiedAt(LocalDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(file.getModifiedTime().getValue()),
                    ZoneId.systemDefault()));
        }

        return fileMetadataRepository.save(metadata);
    }

    /**
     * Save or update OneDrive file metadata
     */
    private FileMetadata saveOneDriveFileMetadata(CloudAccount account, Map<String, Object> file) {
        String fileId = (String) file.get("id");
        var existing = fileMetadataRepository.findByCloudAccountAndCloudFileId(account, fileId);

        FileMetadata metadata;
        if (existing.isPresent()) {
            metadata = existing.get();
        } else {
            metadata = FileMetadata.builder()
                    .user(account.getUser())
                    .cloudAccount(account)
                    .cloudFileId(fileId)
                    .isStarred(false)
                    .isTrashed(false)
                    .build();
        }

        metadata.setFileName((String) file.get("name"));
        metadata.setMimeType((String) file.get("mimeType"));
        
        Object sizeObj = file.get("size");
        if (sizeObj instanceof Number) {
            metadata.setFileSize(((Number) sizeObj).longValue());
        }
        
        metadata.setWebViewLink((String) file.get("webUrl"));
        metadata.setIsFolder((Boolean) file.getOrDefault("isFolder", false));
        metadata.setParentFolderId((String) file.get("parentId"));

        String modifiedDate = (String) file.get("lastModifiedDateTime");
        if (modifiedDate != null && modifiedDate.length() >= 19) {
            try {
                metadata.setModifiedAt(LocalDateTime.parse(modifiedDate.substring(0, 19)));
            } catch (Exception e) {
                logger.warn("Failed to parse OneDrive modified date: {}", modifiedDate);
            }
        }

        return fileMetadataRepository.save(metadata);
    }

    /**
     * Save or update Dropbox file metadata
     */
    private FileMetadata saveDropboxFileMetadata(CloudAccount account, Map<String, Object> file) {
        String fileId = (String) file.get("id");
        var existing = fileMetadataRepository.findByCloudAccountAndCloudFileId(account, fileId);

        FileMetadata metadata;
        if (existing.isPresent()) {
            metadata = existing.get();
        } else {
            metadata = FileMetadata.builder()
                    .user(account.getUser())
                    .cloudAccount(account)
                    .cloudFileId(fileId)
                    .isStarred(false)
                    .isTrashed(false)
                    .build();
        }

        metadata.setFileName((String) file.get("name"));
        metadata.setMimeType((String) file.get("mimeType"));
        
        Object sizeObj = file.get("size");
        if (sizeObj instanceof Number) {
            metadata.setFileSize(((Number) sizeObj).longValue());
        }
        
        metadata.setIsFolder((Boolean) file.getOrDefault("isFolder", false));
        metadata.setParentFolderId((String) file.get("parentId"));

        Object modifiedAt = file.get("modifiedAt");
        if (modifiedAt != null && modifiedAt instanceof java.util.Date) {
            metadata.setModifiedAt(LocalDateTime.ofInstant(
                ((java.util.Date) modifiedAt).toInstant(),
                java.time.ZoneId.systemDefault()));
        }

        return fileMetadataRepository.save(metadata);
    }

    /**
     * Convert CloudAccount entity to DTO
     */
    private CloudAccountDTO convertToDTO(CloudAccount account) {
        Long availableStorage = null;
        if (account.getTotalStorage() != null && account.getUsedStorage() != null) {
            availableStorage = account.getTotalStorage() - account.getUsedStorage();
        }

        return CloudAccountDTO.builder()
                .id(account.getId())
                .providerName(account.getProviderName())
                .accountEmail(account.getAccountEmail())
                .totalStorage(account.getTotalStorage())
                .usedStorage(account.getUsedStorage())
                .availableStorage(availableStorage)
                .isActive(account.getIsActive())
                .connectedAt(account.getConnectedAt())
                .lastSynced(account.getLastSynced())
                .build();
    }

    /**
     * Convert FileMetadata entity to DTO
     */
    private FileDTO convertFileToDTO(FileMetadata metadata) {
        return FileDTO.builder()
                .id(metadata.getId())
                .cloudFileId(metadata.getCloudFileId())
                .fileName(metadata.getFileName())
                .filePath(metadata.getFilePath())
                .mimeType(metadata.getMimeType())
                .fileSize(metadata.getFileSize())
                .isFolder(metadata.getIsFolder())
                .thumbnailUrl(metadata.getThumbnailUrl())
                .webViewLink(metadata.getWebViewLink())
                .isStarred(metadata.getIsStarred())
                .isTrashed(metadata.getIsTrashed())
                .cloudProvider(metadata.getCloudAccount().getProviderName().toString())
                .parentFolderId(metadata.getParentFolderId())
                .createdAt(metadata.getCreatedAt())
                .modifiedAt(metadata.getModifiedAt())
                .build();
    }

    private <T> T executeWithTokenRefresh(CloudAccount account, TokenAwareOperation<T> operation) throws Exception {
        String accessToken = account.getAccessToken();

        if (shouldProactivelyRefresh(account)) {
            logger.debug("Access token expired or near expiry for account {}. Refreshing before operation.", account.getId());
            accessToken = refreshAndPersistToken(account);
        }

        try {
            return operation.execute(accessToken);
        } catch (Exception ex) {
            if (!isRefreshTokenAvailable(account) || !shouldAttemptTokenRefresh(ex)) {
                throw ex;
            }

            logger.warn("Access token likely expired for account {}. Attempting refresh after failure.", account.getId());
            String refreshedToken = refreshAndPersistToken(account);
            return operation.execute(refreshedToken);
        }
    }

    private boolean isRefreshTokenAvailable(CloudAccount account) {
        return account.getRefreshToken() != null && !account.getRefreshToken().isBlank();
    }

    private boolean shouldProactivelyRefresh(CloudAccount account) {
        if (!isRefreshTokenAvailable(account)) {
            return false;
        }

        LocalDateTime expiry = account.getTokenExpiry();
        if (expiry == null) {
            return true;
        }

        LocalDateTime now = LocalDateTime.now();
        return expiry.isBefore(now.plusMinutes(1));
    }

    private boolean shouldAttemptTokenRefresh(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                if (lower.contains("invalid_grant") || lower.contains("token has expired")
                        || lower.contains("expired token") || lower.contains("401")
                        || lower.contains("unauthorized") || lower.contains("invalid access token")
                        || lower.contains("access token has been revoked")
                        || lower.contains("does not support refreshing the access token")) {
                    return true;
                }
            }

            if (current instanceof com.google.api.client.http.HttpResponseException responseException) {
                int statusCode = responseException.getStatusCode();
                if (statusCode == 401 || statusCode == 403) {
                    return true;
                }
            }

            if (current instanceof okhttp3.internal.http2.ConnectionShutdownException) {
                return true;
            }

            if (current instanceof com.dropbox.core.DbxException dbxException) {
                String error = dbxException.getMessage();
                if (error != null && error.toLowerCase(Locale.ROOT).contains("expired")) {
                    return true;
                }
            }

            if (current instanceof java.io.IOException ioException) {
                String error = ioException.getMessage();
                if (error != null && error.toLowerCase(Locale.ROOT).contains("expired")) {
                    return true;
                }
            }

            current = current.getCause();
        }
        return false;
    }

    private String refreshAndPersistToken(CloudAccount account) throws Exception {
        String refreshToken = account.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException("No refresh token available for account " + account.getId());
        }

        Map<String, ?> tokenResponse;

        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            tokenResponse = googleDriveService.refreshAccessToken(refreshToken);
        } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
            tokenResponse = oneDriveService.refreshAccessToken(refreshToken);
        } else if (account.getProviderName() == CloudProvider.DROPBOX) {
            tokenResponse = dropboxService.refreshAccessToken(refreshToken);
        } else {
            throw new IllegalStateException("Unsupported provider for refresh: " + account.getProviderName());
        }

        if (tokenResponse == null || tokenResponse.get("access_token") == null) {
            throw new IllegalStateException("Token refresh failed: missing access token for account " + account.getId());
        }

        String newAccessToken = tokenResponse.get("access_token").toString();
        account.setAccessToken(newAccessToken);

        Object newRefreshToken = tokenResponse.get("refresh_token");
        if (newRefreshToken != null && !newRefreshToken.toString().isBlank()) {
            account.setRefreshToken(newRefreshToken.toString());
        }

        Object expiresIn = tokenResponse.get("expires_in");
        if (expiresIn != null) {
            try {
                long expiresInSeconds = Long.parseLong(expiresIn.toString());
                long adjustedSeconds = Math.max(0, expiresInSeconds - 60); // buffer refresh by 1 minute
                account.setTokenExpiry(LocalDateTime.now().plusSeconds(adjustedSeconds));
            } catch (NumberFormatException ex) {
                logger.warn("Unable to parse expires_in value '{}', defaulting to 1 hour", expiresIn);
                account.setTokenExpiry(LocalDateTime.now().plusHours(1));
            }
        } else {
            account.setTokenExpiry(LocalDateTime.now().plusHours(1));
        }

        cloudAccountRepository.save(account);
        logger.info("Successfully refreshed access token for account {}", account.getId());
        return newAccessToken;
    }

    @FunctionalInterface
    private interface TokenAwareOperation<T> {
        T execute(String accessToken) throws Exception;
    }

    private void refreshStorageQuota(CloudAccount account) {
        try {
            Map<String, Object> quota = executeWithTokenRefresh(account, accessToken -> {
                if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
                    return googleDriveService.getStorageQuota(accessToken);
                } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
                    return oneDriveService.getStorageQuota(accessToken);
                } else if (account.getProviderName() == CloudProvider.DROPBOX) {
                    return dropboxService.getStorageQuota(accessToken);
                }
                return null;
            });

            if (quota != null) {
                if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
                    applyQuotaValues(account, quota, "limit", "usage");
                } else if (account.getProviderName() == CloudProvider.ONEDRIVE) {
                    applyQuotaValues(account, quota, "total", "used");
                } else if (account.getProviderName() == CloudProvider.DROPBOX) {
                    applyQuotaValues(account, quota, "allocated", "used");
                }
            }

            if (quota != null) {
                logger.debug("Updated quota for account {}: total={}, used={}",
                        account.getId(), account.getTotalStorage(), account.getUsedStorage());
            }
        } catch (Exception e) {
            logger.warn("Failed to refresh storage quota for account {}: {}", account.getId(), e.getMessage());
        }
    }

    private void applyQuotaValues(CloudAccount account, Map<String, Object> quota, String totalKey, String usedKey) {
        if (quota == null) {
            return;
        }

        Long total = toLong(quota.get(totalKey));
        Long used = toLong(quota.get(usedKey));

        if (total != null) {
            account.setTotalStorage(total);
        }

        if (used != null) {
            account.setUsedStorage(used);
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number) {
            return ((Number) value).longValue();
        }

        if (value instanceof String) {
            try {
                return Double.valueOf((String) value).longValue();
            } catch (NumberFormatException ex) {
                logger.warn("Unable to parse numeric value: {}", value);
            }
        }

        return null;
    }

    private List<FileDTO> getCachedFiles(CloudAccount account) {
        return fileMetadataRepository.findByCloudAccount(account).stream()
                .map(this::convertFileToDTO)
                .collect(Collectors.toList());
    }
}