package com.multicloud.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageAnalyticsDTO {
    private Long totalFiles;
    private Long totalFolders;
    private Long totalSize;
    private Map<String, Long> fileTypeDistribution; // {"pdf": 10, "image": 25}
    private Map<String, Long> storageByCloud; // {"GOOGLE_DRIVE": 5000000}
    private Map<String, Integer> filesByType; // {"image": 50, "document": 30}
    private Integer uploadCount;
    private Integer downloadCount;
    private Integer todayUploads;
    private Integer todayDownloads;
    private String mostUsedProvider;
    
    // Helper method for formatted total size
    public String getFormattedTotalSize() {
        return formatBytes(totalSize);
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