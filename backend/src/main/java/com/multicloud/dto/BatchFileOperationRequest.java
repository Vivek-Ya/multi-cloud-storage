package com.multicloud.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BatchFileOperationRequest {
    @NotEmpty(message = "File IDs cannot be empty")
    private List<Long> fileIds;
    
    private String destinationPath;
    private String destinationFolderId;
    private Boolean permanent; // For delete operations
}