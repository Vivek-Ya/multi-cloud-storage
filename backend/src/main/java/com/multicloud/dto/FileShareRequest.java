package com.multicloud.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileShareRequest {
    @NotBlank(message = "File ID is required")
    private Long fileId;
    
    private String sharedWithEmail;
    private String permissionType; // VIEW, EDIT, COMMENT
    private Boolean canDownload;
    private Boolean canShare;
    private LocalDateTime linkExpiry;
    private String linkPassword;
}