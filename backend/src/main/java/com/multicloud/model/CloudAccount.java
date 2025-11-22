package com.multicloud.model;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cloud_accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CloudAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_name", nullable = false)
    private CloudProvider providerName;

    @Column(name = "account_email", nullable = false)
    private String accountEmail;

    @Column(name = "access_token", columnDefinition = "TEXT", nullable = false)
    private String accessToken;

    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "token_expiry")
    private LocalDateTime tokenExpiry;

    @Column(name = "total_storage")
    private Long totalStorage;

    @Column(name = "used_storage")
    private Long usedStorage;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "connected_at", updatable = false)
    private LocalDateTime connectedAt;

    @UpdateTimestamp
    @Column(name = "last_synced")
    private LocalDateTime lastSynced;
}