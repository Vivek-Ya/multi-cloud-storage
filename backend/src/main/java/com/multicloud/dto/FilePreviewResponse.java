package com.multicloud.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilePreviewResponse {
    private Long fileId;
    private String fileName;
    private String provider;
    private String mimeType;
    private Long fileSize;
    private boolean previewAvailable;
    private String previewMode;
    private String contentType;
    private String inlineContent;
    private String previewUrl;
    private String thumbnailUrl;
    private String message;
}
