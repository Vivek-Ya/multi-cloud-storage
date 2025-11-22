package com.multicloud.model;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_metadata")
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

    @Column(name = "cloud_file_id", nullable = false)
    private String cloudFileId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "parent_folder_id")
    private String parentFolderId;

    @Column(name = "is_folder")
    private Boolean isFolder = false;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "web_view_link")
    private String webViewLink;

    @Column(name = "download_link")
    private String downloadLink;

    @Column(name = "is_starred")
    private Boolean isStarred = false;

    @Column(name = "is_trashed")
    private Boolean isTrashed = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;
}