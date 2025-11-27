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
public class FileShareResponse {
    private Long id;
    private String shareLink;
    private String fileName;
    private String sharedWithEmail;
    private String permissionType;
    private Boolean canDownload;
    private Boolean canShare;
    private LocalDateTime createdAt;
    private LocalDateTime linkExpiry;
    private Boolean hasPassword;
}