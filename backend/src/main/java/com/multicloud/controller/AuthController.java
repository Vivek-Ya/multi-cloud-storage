package com.multicloud.controller;

import com.multicloud.dto.*;
import com.multicloud.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000}")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest) {
        try {
            logger.info("Registration attempt for username: {}", signupRequest.getUsername());
            MessageResponse response = authService.registerUser(signupRequest);
            logger.info("User registered successfully: {}", signupRequest.getUsername());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Registration failed for username: {}", signupRequest.getUsername(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            logger.info("Login attempt for username: {}", loginRequest.getUsername());
            JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
            logger.info("User logged in successfully: {}", loginRequest.getUsername());
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            logger.error("Login failed for username: {}", loginRequest.getUsername(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid username or password"));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            logger.info("Token refresh attempt");
            JwtResponse jwtResponse = authService.refreshToken(request.getRefreshToken());
            logger.info("Token refreshed successfully");
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            logger.error("Token refresh failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid refresh token"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody RefreshTokenRequest request) {
        try {
            logger.info("Logout attempt");
            authService.logout(request.getRefreshToken());
            return ResponseEntity.ok(new MessageResponse("Logged out successfully"));
        } catch (Exception e) {
            logger.error("Logout failed", e);
            return ResponseEntity.ok(new MessageResponse("Logged out"));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody PasswordChangeRequest request,
            @RequestHeader("Authorization") String token) {
        try {
            logger.info("Password change attempt");
            authService.changePassword(token, request);
            return ResponseEntity.ok(new MessageResponse("Password changed successfully"));
        } catch (Exception e) {
            logger.error("Password change failed", e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Password change failed: " + e.getMessage()));
        }
    }
}