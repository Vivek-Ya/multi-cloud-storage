package com.multicloud.controller;

import com.multicloud.dto.*;
import com.multicloud.model.User;
import com.multicloud.repository.UserRepository;
import com.multicloud.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000}")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            UserProfileDTO profile = userService.getUserProfile(user.getId());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            logger.error("Error getting user profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Internal Server Error",
                            "Failed to get user profile", "/api/users/profile"));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(
            Authentication authentication,
            @Valid @RequestBody UserUpdateRequest request) {
        try {
            User user = getUserFromAuthentication(authentication);
            logger.info("Updating profile for user: {}", user.getUsername());
            UserProfileDTO updatedProfile = userService.updateUserProfile(user.getId(), request);
            return ResponseEntity.ok(updatedProfile);
        } catch (Exception e) {
            logger.error("Error updating user profile", e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Update failed: " + e.getMessage()));
        }
    }

    @GetMapping("/activity")
    public ResponseEntity<?> getUserActivity(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            User user = getUserFromAuthentication(authentication);
            // TODO: Implement pagination
            return ResponseEntity.ok(userService.getUserActivity(user.getId(), page, size));
        } catch (Exception e) {
            logger.error("Error getting user activity", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Internal Server Error",
                            "Failed to get activity", "/api/users/activity"));
        }
    }

    private User getUserFromAuthentication(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}