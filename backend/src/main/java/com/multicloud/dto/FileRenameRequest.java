package com.multicloud.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileRenameRequest {
    @NotBlank(message = "New file name is required")
    private String newName;
}