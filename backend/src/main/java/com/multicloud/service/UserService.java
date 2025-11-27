package com.multicloud.service;

import com.multicloud.dto.*;
import com.multicloud.model.User;
import com.multicloud.repository.CloudAccountRepository;
import com.multicloud.repository.FileMetadataRepository;
import com.multicloud.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CloudAccountRepository cloudAccountRepository;

    @Autowired
    private FileMetadataRepository fileMetadataRepository;

    public UserProfileDTO getUserProfile(Long userId) {
        logger.info("Getting profile for user ID: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer connectedAccounts = cloudAccountRepository.countActiveAccountsByUser(user);
        Long totalStorageUsed = cloudAccountRepository.getTotalStorageUsedByUser(user);

        return UserProfileDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .twoFactorEnabled(user.getTwoFactorEnabled())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .connectedAccountsCount(connectedAccounts)
                .totalStorageUsed(totalStorageUsed != null ? totalStorageUsed : 0L)
                .isActive(user.getIsActive())
                .build();
    }

    @Transactional
    public UserProfileDTO updateUserProfile(Long userId, UserUpdateRequest request) {
        logger.info("Updating profile for user ID: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if new username is taken
        if (request.getUsername() != null && 
            !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username is already taken");
            }
            user.setUsername(request.getUsername());
        }

        // Check if new email is taken
        if (request.getEmail() != null && 
            !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email is already in use");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }

        if (request.getProfilePictureUrl() != null) {
            user.setProfilePictureUrl(request.getProfilePictureUrl());
        }

        user = userRepository.save(user);
        logger.info("User profile updated successfully");

        return getUserProfile(user.getId());
    }

    public List<ActivityLogDTO> getUserActivity(Long userId, int page, int size) {
        logger.info("Getting activity for user ID: {}", userId);
        
        // TODO: Implement activity log retrieval
        // This will be implemented when ActivityLog repository is added
        
        return List.of();
    }
}