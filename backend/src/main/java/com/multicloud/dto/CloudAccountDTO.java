package com.multicloud.dto;

import com.multicloud.model.CloudProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloudAccountDTO {
    private Long id;
    private CloudProvider providerName;
    private String accountEmail;
    private Long totalStorage;
    private Long usedStorage;
    private Long availableStorage;
    private Boolean isActive;
    private LocalDateTime connectedAt;
    private LocalDateTime lastSynced;
}