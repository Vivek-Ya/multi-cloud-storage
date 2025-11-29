package com.multicloud.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileCopyRequest {
    @NotNull(message = "Target account is required")
    private Long targetAccountId;

    private String targetFolderId;
}
