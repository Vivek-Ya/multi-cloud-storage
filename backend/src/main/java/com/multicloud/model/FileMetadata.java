package com.multicloud.model;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_metadata", indexes = {
    @Index(name = "idx_user_files", columnList = "user_id"),
    @Index(name = "idx_cloud_account", columnList = "cloud_account_id"),
    @Index(name = "idx_parent_folder", columnList = "parent_folder_id"),
    @Index(name = "idx_file_name", columnList = "file_name")
}, uniqueConstraints = {
    @UniqueConstraint(columnNames = {"cloud_account_id", "cloud_file_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadata {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_account_id", nullable = false)
    private CloudAccount cloudAccount;

    @Column(name = "cloud_file_id", nullable = false, length = 255)
    private String cloudFileId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "parent_folder_id", length = 255)
    private String parentFolderId;

    @Column(name = "is_folder")
    @Builder.Default
    private Boolean isFolder = false;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "web_view_link", length = 500)
    private String webViewLink;

    @Column(name = "download_link", length = 500)
    private String downloadLink;

    @Column(name = "is_starred")
    @Builder.Default
    private Boolean isStarred = false;

    @Column(name = "is_trashed")
    @Builder.Default
    private Boolean isTrashed = false;

    @Column(name = "is_encrypted")
    @Builder.Default
    private Boolean isEncrypted = false;

    @Column(name = "encryption_key", length = 255)
    private String encryptionKey;

    @Column(name = "checksum", length = 64)
    private String checksum;

    @Column(name = "version_number")
    @Builder.Default
    private Integer versionNumber = 1;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed")
    private LocalDateTime lastAccessed;

    // Helper methods
    public String getFileExtension() {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }

    public boolean isImage() {
        return mimeType != null && mimeType.startsWith("image/");
    }

    public boolean isVideo() {
        return mimeType != null && mimeType.startsWith("video/");
    }

    public boolean isDocument() {
        if (mimeType == null) return false;
        return mimeType.contains("document") || 
               mimeType.contains("pdf") || 
               mimeType.contains("word") ||
               mimeType.contains("text");
    }

    public void toggleStar() {
        this.isStarred = !this.isStarred;
    }
}