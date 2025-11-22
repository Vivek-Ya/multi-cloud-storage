package com.multicloud.service;

import com.google.api.services.drive.model.File;
import com.multicloud.dto.CloudAccountDTO;
import com.multicloud.dto.FileDTO;
import com.multicloud.model.*;
import com.multicloud.repository.CloudAccountRepository;
import com.multicloud.repository.FileMetadataRepository;
import com.multicloud.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CloudAccountService {

    @Autowired
    private CloudAccountRepository cloudAccountRepository;

    @Autowired
    private FileMetadataRepository fileMetadataRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoogleDriveService googleDriveService;

    public CloudAccount saveCloudAccount(User user, CloudProvider provider, String accessToken,
                                        String refreshToken, String accountEmail) throws Exception {
        
        // Check if account already exists
        var existing = cloudAccountRepository.findByUserAndProviderNameAndAccountEmail(
                user, provider, accountEmail);

        CloudAccount account;
        if (existing.isPresent()) {
            account = existing.get();
            account.setAccessToken(accessToken);
            account.setRefreshToken(refreshToken);
            account.setIsActive(true);
        } else {
            account = CloudAccount.builder()
                    .user(user)
                    .providerName(provider)
                    .accountEmail(accountEmail)
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .isActive(true)
                    .build();
        }

        // Get storage quota
        if (provider == CloudProvider.GOOGLE_DRIVE) {
            Map<String, Object> quota = googleDriveService.getStorageQuota(accessToken);
            if (quota.get("limit") != null) {
                account.setTotalStorage((Long) quota.get("limit"));
                account.setUsedStorage((Long) quota.get("usage"));
            }
        }

        account.setTokenExpiry(LocalDateTime.now().plusHours(1));
        account.setLastSynced(LocalDateTime.now());

        return cloudAccountRepository.save(account);
    }

    public List<CloudAccountDTO> getUserCloudAccounts(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return cloudAccountRepository.findByUserAndIsActive(user, true)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<FileDTO> getFilesFromCloudAccount(Long cloudAccountId) throws Exception {
        CloudAccount account = cloudAccountRepository.findById(cloudAccountId)
                .orElseThrow(() -> new RuntimeException("Cloud account not found"));

        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            List<File> files = googleDriveService.listFiles(account.getAccessToken());
            
            // Save to database and return
            return files.stream()
                    .map(file -> saveFileMetadata(account, file))
                    .map(this::convertFileToDTO)
                    .collect(Collectors.toList());
        }

        return List.of();
    }

    public FileDTO uploadFile(Long cloudAccountId, MultipartFile file) throws Exception {
        CloudAccount account = cloudAccountRepository.findById(cloudAccountId)
                .orElseThrow(() -> new RuntimeException("Cloud account not found"));

        if (account.getProviderName() == CloudProvider.GOOGLE_DRIVE) {
            File uploadedFile = googleDriveService.uploadFile(
                    account.getAccessToken(), file, null);
            
            FileMetadata metadata = saveFileMetadata(account, uploadedFile);
            return convertFileToDTO(metadata);
        }

        throw new RuntimeException("Unsupported cloud provider");
    }

    private FileMetadata saveFileMetadata(CloudAccount account, File file) {
        var existing = fileMetadataRepository.findByCloudAccountAndCloudFileId(
                account, file.getId());

        FileMetadata metadata;
        if (existing.isPresent()) {
            metadata = existing.get();
        } else {
            metadata = new FileMetadata();
            metadata.setUser(account.getUser());
            metadata.setCloudAccount(account);
            metadata.setCloudFileId(file.getId());
        }

        metadata.setFileName(file.getName());
        metadata.setMimeType(file.getMimeType());
        metadata.setFileSize(file.getSize());
        metadata.setWebViewLink(file.getWebViewLink());
        metadata.setThumbnailUrl(file.getThumbnailLink());
        metadata.setIsFolder(file.getMimeType() != null && 
                file.getMimeType().equals("application/vnd.google-apps.folder"));

        if (file.getModifiedTime() != null) {
            metadata.setModifiedAt(LocalDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(file.getModifiedTime().getValue()),
                    ZoneId.systemDefault()));
        }

        return fileMetadataRepository.save(metadata);
    }

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
                .cloudProvider(metadata.getCloudAccount().getProviderName().toString())
                .createdAt(metadata.getCreatedAt())
                .modifiedAt(metadata.getModifiedAt())
                .build();
    }
}