package com.multicloud.controller;

import com.google.api.services.drive.model.File;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.multicloud.model.CloudProvider;
import com.multicloud.model.User;
import com.multicloud.repository.UserRepository;
import com.multicloud.service.CloudAccountService;
import com.multicloud.dto.CloudAccountDTO;
import com.multicloud.dto.FileDTO;
import com.multicloud.dto.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/cloud-accounts")
@CrossOrigin(origins = "http://localhost:3000")
public class CloudAccountController {

    @Autowired
    private CloudAccountService cloudAccountService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<CloudAccountDTO>> getCloudAccounts(Authentication authentication) {
        try {
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<CloudAccountDTO> accounts = cloudAccountService.getUserCloudAccounts(user.getId());
            return ResponseEntity.ok(accounts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{accountId}/files")
    public ResponseEntity<List<FileDTO>> getFiles(@PathVariable Long accountId) {
        try {
            List<FileDTO> files = cloudAccountService.getFilesFromCloudAccount(accountId);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{accountId}/upload")
    public ResponseEntity<?> uploadFile(
            @PathVariable Long accountId,
            @RequestParam("file") MultipartFile file) {
        try {
            FileDTO uploadedFile = cloudAccountService.uploadFile(accountId, file);
            return ResponseEntity.ok(uploadedFile);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Upload failed: " + e.getMessage()));
        }
    }
}