package com.multicloud.repository;

import com.multicloud.model.CloudAccount;
import com.multicloud.model.FileMetadata;
import com.multicloud.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByUser(User user);
    List<FileMetadata> findByCloudAccount(CloudAccount cloudAccount);
    List<FileMetadata> findByUserAndIsTrashed(User user, Boolean isTrashed);
    List<FileMetadata> findByUserAndIsStarred(User user, Boolean isStarred);
    List<FileMetadata> findByUserAndFileNameContainingIgnoreCase(User user, String fileName);
    Optional<FileMetadata> findByCloudAccountAndCloudFileId(
            CloudAccount cloudAccount, String cloudFileId);
    
    // Folder navigation
    List<FileMetadata> findByCloudAccountAndParentFolderId(
            CloudAccount cloudAccount, String parentFolderId);
    List<FileMetadata> findByCloudAccountAndParentFolderIdAndIsFolder(
            CloudAccount cloudAccount, String parentFolderId, Boolean isFolder);
    
    // Advanced search
    @Query("SELECT f FROM FileMetadata f WHERE f.user = :user " +
           "AND (LOWER(f.fileName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(f.fileType) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<FileMetadata> searchFiles(@Param("user") User user, @Param("query") String query);
    
    @Query("SELECT f FROM FileMetadata f WHERE f.user = :user " +
           "AND f.mimeType LIKE :mimeType " +
           "AND f.isTrashed = false")
    List<FileMetadata> findByUserAndMimeTypeContaining(
            @Param("user") User user, @Param("mimeType") String mimeType);
    
    @Query("SELECT f FROM FileMetadata f WHERE f.user = :user " +
           "AND f.fileSize BETWEEN :minSize AND :maxSize " +
           "AND f.isTrashed = false")
    List<FileMetadata> findByUserAndFileSizeBetween(
            @Param("user") User user, 
            @Param("minSize") Long minSize, 
            @Param("maxSize") Long maxSize);
    
    // Analytics queries
    @Query("SELECT COUNT(f) FROM FileMetadata f WHERE f.user = :user AND f.isTrashed = false")
    Long countFilesByUser(@Param("user") User user);
    
    @Query("SELECT COUNT(f) FROM FileMetadata f WHERE f.user = :user " +
           "AND f.isFolder = true AND f.isTrashed = false")
    Long countFoldersByUser(@Param("user") User user);
    
    @Query("SELECT SUM(f.fileSize) FROM FileMetadata f WHERE f.user = :user AND f.isTrashed = false")
    Long getTotalFileSizeByUser(@Param("user") User user);
    
    @Query("SELECT f.fileType, COUNT(f) FROM FileMetadata f " +
           "WHERE f.user = :user AND f.isTrashed = false " +
           "GROUP BY f.fileType")
    List<Object[]> getFileTypeDistribution(@Param("user") User user);
    
    @Query("SELECT f.cloudAccount.providerName, COUNT(f) FROM FileMetadata f " +
           "WHERE f.user = :user AND f.isTrashed = false " +
           "GROUP BY f.cloudAccount.providerName")
    List<Object[]> getFilesByProvider(@Param("user") User user);
    
    // Recent files
    @Query("SELECT f FROM FileMetadata f WHERE f.user = :user " +
           "AND f.isTrashed = false " +
           "ORDER BY f.modifiedAt DESC")
    Page<FileMetadata> findRecentFiles(@Param("user") User user, Pageable pageable);
    
    @Query("SELECT f FROM FileMetadata f WHERE f.user = :user " +
           "AND f.createdAt >= :since " +
           "AND f.isTrashed = false")
    List<FileMetadata> findFilesCreatedSince(
            @Param("user") User user, 
            @Param("since") LocalDateTime since);
}