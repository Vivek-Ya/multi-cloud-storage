package com.multicloud.service;

import com.multicloud.dto.*;
import com.multicloud.dto.UserSummaryDTO;
import com.multicloud.model.Role;
import com.multicloud.model.User;
import com.multicloud.repository.RoleRepository;
import com.multicloud.repository.UserRepository;
import com.multicloud.security.UserDetailsServiceImpl;
import com.multicloud.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Transactional
    public MessageResponse registerUser(SignupRequest signupRequest) {
        logger.info("Registering new user: {}", signupRequest.getUsername());

        // Check if username exists
        if (userRepository.existsByUsername(signupRequest.getUsername())) {
            logger.warn("Username already exists: {}", signupRequest.getUsername());
            throw new RuntimeException("Username is already taken!");
        }

        // Check if email exists
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            logger.warn("Email already exists: {}", signupRequest.getEmail());
            throw new RuntimeException("Email is already in use!");
        }

        // Create new user
        User user = User.builder()
                .username(signupRequest.getUsername())
                .email(signupRequest.getEmail())
                .passwordHash(passwordEncoder.encode(signupRequest.getPassword()))
                .firstName(signupRequest.getFirstName())
                .lastName(signupRequest.getLastName())
                .isActive(true)
                .twoFactorEnabled(false)
                .build();

        // Assign default role
        Set<Role> roles = new HashSet<>();
        Role userRole = roleRepository.findByRoleName("ROLE_USER")
                .orElseGet(() -> {
                    logger.warn("ROLE_USER not found, creating it");
                    Role newRole = Role.builder()
                            .roleName("ROLE_USER")
                            .description("Default user role")
                            .build();
                    return roleRepository.save(newRole);
                });
        roles.add(userRole);
        user.setRoles(roles);

        userRepository.save(user);
        logger.info("User registered successfully: {}", user.getUsername());

        return new MessageResponse("User registered successfully!");
    }

    @Transactional
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        logger.info("Authenticating user: {}", loginRequest.getUsername());

        try {
            // Authenticate user
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            // Load user details
            UserDetails userDetails = userDetailsService.loadUserByUsername(
                    loginRequest.getUsername()
            );

            // Generate JWT tokens
            String accessToken = jwtUtil.generateAccessToken(userDetails);
            String refreshToken = jwtUtil.generateRefreshToken(userDetails);

            // Get user entity
            User user = userRepository.findByUsername(loginRequest.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            logger.info("User authenticated successfully: {}", user.getUsername());

            UserSummaryDTO userSummary = UserSummaryDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .build();

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .tokenType("Bearer")
                    .refreshToken(refreshToken)
                    .user(userSummary)
                    .build();

        } catch (Exception e) {
            logger.error("Authentication failed for user: {}", loginRequest.getUsername(), e);
            throw new RuntimeException("Invalid username or password");
        }
    }

    public JwtResponse refreshToken(String refreshToken) {
        logger.info("Refreshing token");

        try {
            // Validate refresh token
            String username = jwtUtil.extractUsername(refreshToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (jwtUtil.validateToken(refreshToken, userDetails)) {
                // Generate new access token
                String newAccessToken = jwtUtil.generateAccessToken(userDetails);

                User user = userRepository.findByUsername(username)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                logger.info("Token refreshed successfully for user: {}", username);

                UserSummaryDTO userSummary = UserSummaryDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .build();

                return JwtResponse.builder()
                    .accessToken(newAccessToken)
                    .tokenType("Bearer")
                    .refreshToken(refreshToken)
                    .user(userSummary)
                    .build();
            } else {
                throw new RuntimeException("Invalid refresh token");
            }

        } catch (Exception e) {
            logger.error("Token refresh failed", e);
            throw new RuntimeException("Invalid refresh token");
        }
    }

    public void logout(String refreshToken) {
        logger.info("User logging out");
        // In a real application, you would invalidate the refresh token here
        // by storing it in a blacklist or removing it from a database
    }

    @Transactional
    public void changePassword(String token, PasswordChangeRequest request) {
        logger.info("Password change request");

        // Extract username from token
        String jwt = token.replace("Bearer ", "");
        String username = jwtUtil.extractUsername(jwt);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            logger.warn("Invalid current password for user: {}", username);
            throw new RuntimeException("Current password is incorrect");
        }

        // Verify password confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New passwords do not match");
        }

        // Update password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        logger.info("Password changed successfully for user: {}", username);
    }
}