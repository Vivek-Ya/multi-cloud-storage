package com.multicloud.model;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "share_permissions", indexes = {
    @Index(name = "idx_shared_files", columnList = "shared_with_user_id"),
    @Index(name = "idx_share_link", columnList = "share_link")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharePermission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id", nullable = false)
    private FileMetadata fileMetadata;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_by", nullable = false)
    private User sharedBy;

    @Column(name = "shared_with_email", length = 100)
    private String sharedWithEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_with_user_id")
    private User sharedWithUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_type", nullable = false, length = 20)
    private PermissionType permissionType;

    @Column(name = "share_link", length = 500)
    private String shareLink;

    @Column(name = "link_password", length = 255)
    private String linkPassword;

    @Column(name = "link_expiry")
    private LocalDateTime linkExpiry;

    @Column(name = "can_download")
    @Builder.Default
    private Boolean canDownload = true;

    @Column(name = "can_share")
    @Builder.Default
    private Boolean canShare = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum PermissionType {
        VIEW, EDIT, COMMENT, OWNER
    }

    // Helper methods
    public boolean isExpired() {
        return linkExpiry != null && LocalDateTime.now().isAfter(linkExpiry);
    }

    public boolean hasPassword() {
        return linkPassword != null && !linkPassword.isEmpty();
    }
}