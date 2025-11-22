package com.multicloud.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class FileUploadRequest {
    private Long cloudAccountId;
    private String folderPath;
    private MultipartFile file;
}