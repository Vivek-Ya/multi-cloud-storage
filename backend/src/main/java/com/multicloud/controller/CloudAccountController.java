package com.multicloud.controller;

import com.multicloud.dto.*;
import com.multicloud.model.FileMetadata;
import com.multicloud.model.User;
import com.multicloud.repository.FileMetadataRepository;
import com.multicloud.repository.UserRepository;
import com.multicloud.service.CloudAccountService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.List;

@RestController
@RequestMapping("/api/cloud-accounts")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000}")
public class CloudAccountController {

    private static final Logger logger = LoggerFactory.getLogger(CloudAccountController.class);

    @Autowired
    private CloudAccountService cloudAccountService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileMetadataRepository fileMetadataRepository;

    // Get all cloud accounts for current user
    @GetMapping
    public ResponseEntity<?> getCloudAccounts(Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            List<CloudAccountDTO> accounts = cloudAccountService.getUserCloudAccounts(user.getId());
            logger.info("Retrieved {} cloud accounts for user: {}", accounts.size(), user.getUsername());
            return ResponseEntity.ok(accounts);
        } catch (Exception e) {
            logger.error("Error retrieving cloud accounts", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Internal Server Error", 
                            "Failed to retrieve cloud accounts", "/api/cloud-accounts"));
        }
    }

    // Get files from specific cloud account
    @GetMapping("/{accountId}/files")
    public ResponseEntity<?> getFiles(@PathVariable Long accountId) {
        try {
            List<FileDTO> files = cloudAccountService.getFilesFromCloudAccount(accountId);
            logger.info("Retrieved {} files from account: {}", files.size(), accountId);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            logger.error("Error retrieving files from account: {}", accountId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Internal Server Error",
                            "Failed to retrieve files", "/api/cloud-accounts/" + accountId + "/files"));
        }
    }

    // Upload file to cloud account
    @PostMapping("/{accountId}/upload")
    public ResponseEntity<?> uploadFile(
            @PathVariable Long accountId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String folderPath) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("File cannot be empty"));
            }

            logger.info("Uploading file: {} to account: {}", file.getOriginalFilename(), accountId);
            FileDTO uploadedFile = cloudAccountService.uploadFile(accountId, file, folderPath);
            logger.info("File uploaded successfully: {}", uploadedFile.getFileName());
            return ResponseEntity.ok(uploadedFile);
        } catch (Exception e) {
            logger.error("Upload failed for file: {} to account: {}", 
                    file.getOriginalFilename(), accountId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Upload failed: " + e.getMessage()));
        }
    }

    // Download file
    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<?> downloadFile(@PathVariable Long fileId) {
        try {
            logger.info("Downloading file: {}", fileId);
            ByteArrayOutputStream outputStream = cloudAccountService.downloadFile(fileId);
            
            FileMetadata metadata = fileMetadataRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", metadata.getFileName());
            
            logger.info("File downloaded successfully: {}", metadata.getFileName());
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(outputStream.toByteArray());
        } catch (Exception e) {
            logger.error("Download failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Download failed: " + e.getMessage()));
        }
    }

    @GetMapping("/files/{fileId}/preview")
    public ResponseEntity<?> previewFile(@PathVariable Long fileId) {
        try {
            logger.info("Generating preview for file: {}", fileId);
            FilePreviewResponse preview = cloudAccountService.getFilePreview(fileId);
            return ResponseEntity.ok(preview);
        } catch (IllegalArgumentException ex) {
            logger.warn("Preview validation failed for file {}: {}", fileId, ex.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(ex.getMessage()));
        } catch (Exception e) {
            logger.error("Preview failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Preview failed: " + e.getMessage()));
        }
    }

    // Delete file
    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable Long fileId) {
        try {
            logger.info("Deleting file: {}", fileId);
            cloudAccountService.deleteFile(fileId);
            logger.info("File deleted successfully: {}", fileId);
            return ResponseEntity.ok(new MessageResponse("File deleted successfully"));
        } catch (Exception e) {
            logger.error("Delete failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Delete failed: " + e.getMessage()));
        }
    }

    // Rename file
    @PutMapping("/files/{fileId}/rename")
    public ResponseEntity<?> renameFile(
            @PathVariable Long fileId,
            @Valid @RequestBody FileRenameRequest request) {
        try {
            logger.info("Renaming file: {} to: {}", fileId, request.getNewName());
            FileDTO updatedFile = cloudAccountService.renameFile(fileId, request.getNewName());
            logger.info("File renamed successfully");
            return ResponseEntity.ok(updatedFile);
        } catch (Exception e) {
            logger.error("Rename failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Rename failed: " + e.getMessage()));
        }
    }

    // Move file
    @PutMapping("/files/{fileId}/move")
    public ResponseEntity<?> moveFile(
            @PathVariable Long fileId,
            @Valid @RequestBody FileMoveRequest request) {
        try {
            logger.info("Moving file: {} to: {}", fileId, request.getNewPath());
            FileDTO movedFile = cloudAccountService.moveFile(fileId, request.getNewPath());
            logger.info("File moved successfully");
            return ResponseEntity.ok(movedFile);
        } catch (Exception e) {
            logger.error("Move failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Move failed: " + e.getMessage()));
        }
    }

    // Copy file between accounts
    @PostMapping("/files/{fileId}/copy")
    public ResponseEntity<?> copyFile(
            @PathVariable Long fileId,
            @Valid @RequestBody FileCopyRequest request,
            Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            FileDTO copiedFile = cloudAccountService.copyFile(
                    fileId,
                    request.getTargetAccountId(),
                    request.getTargetFolderId(),
                    user.getId());
            logger.info("File {} copied to account {}", fileId, request.getTargetAccountId());
            return ResponseEntity.ok(copiedFile);
        } catch (IllegalArgumentException ex) {
            logger.warn("Copy validation failed for file {}: {}", fileId, ex.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(ex.getMessage()));
        } catch (Exception e) {
            logger.error("Copy failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Copy failed: " + e.getMessage()));
        }
    }

    // Create folder
    @PostMapping("/{accountId}/folder")
    public ResponseEntity<?> createFolder(
            @PathVariable Long accountId,
            @Valid @RequestBody FolderCreateRequest request) {
        try {
            logger.info("Creating folder: {} in account: {}", request.getFolderName(), accountId);
                FileDTO folder = cloudAccountService.createFolder(
                    accountId,
                    request.getFolderName(),
                    request.getParentFolderId());
            logger.info("Folder created successfully: {}", folder.getFileName());
            return ResponseEntity.ok(folder);
        } catch (Exception e) {
            logger.error("Folder creation failed in account: {}", accountId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Folder creation failed: " + e.getMessage()));
        }
    }

    // Search files
    @GetMapping("/search")
    public ResponseEntity<?> searchFiles(
            Authentication authentication,
            @RequestParam String query,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) Long cloudAccountId) {
        try {
            User user = getUserFromAuthentication(authentication);
            logger.info("Searching files for user: {} with query: {}", user.getUsername(), query);
            
            FileSearchRequest searchRequest = FileSearchRequest.builder()
                    .query(query)
                    .fileType(fileType)
                    .cloudAccountId(cloudAccountId)
                    .build();
            
            List<FileDTO> results = cloudAccountService.searchFiles(user.getId(), searchRequest);
            logger.info("Found {} files matching query", results.size());
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            logger.error("Search failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Internal Server Error",
                            "Search failed", "/api/cloud-accounts/search"));
        }
    }

    // Batch delete files
    @DeleteMapping("/files/batch")
    public ResponseEntity<?> batchDeleteFiles(@Valid @RequestBody BatchFileOperationRequest request) {
        try {
            logger.info("Batch deleting {} files", request.getFileIds().size());
            int deletedCount = cloudAccountService.batchDeleteFiles(request.getFileIds());
            logger.info("Successfully deleted {} files", deletedCount);
            return ResponseEntity.ok(new MessageResponse(
                    String.format("Successfully deleted %d files", deletedCount)));
        } catch (Exception e) {
            logger.error("Batch delete failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Batch delete failed: " + e.getMessage()));
        }
    }

    // Star/unstar file
    @PutMapping("/files/{fileId}/star")
    public ResponseEntity<?> toggleStarFile(@PathVariable Long fileId) {
        try {
            logger.info("Toggling star for file: {}", fileId);
            FileDTO updatedFile = cloudAccountService.toggleStarFile(fileId);
            logger.info("Star toggled successfully for file: {}", fileId);
            return ResponseEntity.ok(updatedFile);
        } catch (Exception e) {
            logger.error("Star toggle failed for file: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Operation failed: " + e.getMessage()));
        }
    }

    // Get storage analytics
    @GetMapping("/analytics")
    public ResponseEntity<?> getStorageAnalytics(Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            logger.info("Getting storage analytics for user: {}", user.getUsername());
            StorageAnalyticsDTO analytics = cloudAccountService.getStorageAnalytics(user.getId());
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            logger.error("Failed to get storage analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Internal Server Error",
                            "Failed to get analytics", "/api/cloud-accounts/analytics"));
        }
    }

    // Disconnect cloud account
    @DeleteMapping("/{accountId}")
    public ResponseEntity<?> disconnectAccount(@PathVariable Long accountId) {
        try {
            logger.info("Disconnecting cloud account: {}", accountId);
            cloudAccountService.disconnectAccount(accountId);
            logger.info("Cloud account disconnected successfully: {}", accountId);
            return ResponseEntity.ok(new MessageResponse("Account disconnected successfully"));
        } catch (Exception e) {
            logger.error("Failed to disconnect account: {}", accountId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Failed to disconnect account: " + e.getMessage()));
        }
    }

    // Helper method to get user from authentication
    private User getUserFromAuthentication(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}