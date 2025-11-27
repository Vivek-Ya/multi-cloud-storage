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
public class ActivityLogDTO {
    private Long id;
    private String activityType; // UPLOAD, DOWNLOAD, DELETE, RENAME, etc.
    private String fileName;
    private String cloudProvider;
    private String description;
    private String status; // SUCCESS, FAILED
    private String ipAddress;
    private LocalDateTime timestamp;
}