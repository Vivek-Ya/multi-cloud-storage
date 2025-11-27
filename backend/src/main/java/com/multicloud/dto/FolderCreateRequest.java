package com.multicloud.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FolderCreateRequest {
    @NotBlank(message = "Folder name is required")
    private String folderName;
    
    private String parentFolderId;
}