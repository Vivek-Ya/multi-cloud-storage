package com.multicloud.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class FileUploadRequest {
    private String folderPath;
    private String parentFolderId;
    private MultipartFile file;
    private MultipartFile[] files; // For batch uploads
}