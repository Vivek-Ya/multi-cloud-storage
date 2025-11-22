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
    private String cloudProvider;
    private LocalDateTime createdAt;
    private LocalDateTime modifiedAt;
}