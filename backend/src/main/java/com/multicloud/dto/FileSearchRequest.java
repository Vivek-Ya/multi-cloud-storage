package com.multicloud.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileSearchRequest {
    private String query;
    private String fileType; // image, document, video, audio, folder
    private Long cloudAccountId;
    private String mimeType;
    private Long minSize;
    private Long maxSize;
    private Boolean isStarred;
    private Boolean isTrashed;
    private String sortBy; // name, size, date
    private String sortOrder; // asc, desc
}