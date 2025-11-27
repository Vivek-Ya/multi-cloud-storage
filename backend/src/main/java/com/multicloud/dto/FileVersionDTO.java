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
public class FileVersionDTO {
    private Long id;
    private Integer versionNumber;
    private Long fileSize;
    private String modifiedBy;
    private LocalDateTime modifiedAt;
    private String changeDescription;
    private Boolean isCurrent;
}