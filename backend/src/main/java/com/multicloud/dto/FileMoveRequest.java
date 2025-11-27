package com.multicloud.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileMoveRequest {
    @NotBlank(message = "New path is required")
    private String newPath;
    
    private String destinationFolderId;
}