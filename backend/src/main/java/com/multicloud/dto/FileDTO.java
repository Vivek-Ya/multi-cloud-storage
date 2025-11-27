package com.multicloud.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileDTO {
    private Long id;
    private String cloudFileId;
    private String fileName;
    private String filePath;
    private String fileType;
    private String mimeType;
    private Long fileSize;
    private Boolean isFolder;
    private String thumbnailUrl;
    private String webViewLink;
    private String downloadLink;
    private Boolean isStarred;
    private Boolean isTrashed;
    private String cloudProvider;
    private String parentFolderId;
    private LocalDateTime createdAt;
    private LocalDateTime modifiedAt;
    
    // Helper method for file extension
    public String getFileExtension() {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }
    
    // Helper method for formatted file size
    public String getFormattedSize() {
        if (fileSize == null) return "0 Bytes";
        
        String[] units = {"Bytes", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double size = fileSize.doubleValue();
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return String.format("%.2f %s", size, units[unitIndex]);
    }
    
    // Helper method to check if file is image
    public Boolean isImage() {
        if (mimeType == null) return false;
        return mimeType.startsWith("image/");
    }
    
    // Helper method to check if file is video
    public Boolean isVideo() {
        if (mimeType == null) return false;
        return mimeType.startsWith("video/");
    }
    
    // Helper method to check if file is document
    public Boolean isDocument() {
        if (mimeType == null) return false;
        return mimeType.contains("document") || 
               mimeType.contains("pdf") || 
               mimeType.contains("word") ||
               mimeType.contains("text");
    }
}