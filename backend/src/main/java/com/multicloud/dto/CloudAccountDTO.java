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
    
    // Helper method for storage percentage
    public Double getStoragePercentage() {
        if (totalStorage == null || totalStorage == 0 || usedStorage == null) {
            return 0.0;
        }
        return (usedStorage.doubleValue() / totalStorage.doubleValue()) * 100;
    }
    
    // Helper method for formatted storage
    public String getFormattedUsedStorage() {
        return formatBytes(usedStorage);
    }
    
    public String getFormattedTotalStorage() {
        return formatBytes(totalStorage);
    }
    
    private String formatBytes(Long bytes) {
        if (bytes == null) return "0 Bytes";
        
        String[] units = {"Bytes", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double size = bytes.doubleValue();
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return String.format("%.2f %s", size, units[unitIndex]);
    }
}