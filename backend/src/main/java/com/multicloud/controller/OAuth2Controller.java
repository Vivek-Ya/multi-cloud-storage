package com.multicloud.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.multicloud.model.CloudProvider;
import com.multicloud.model.User;
import com.multicloud.repository.UserRepository;
import com.multicloud.service.CloudAccountService;
import com.multicloud.service.GoogleDriveService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.io.IOException;

@RestController
@RequestMapping("/oauth2")
@CrossOrigin(origins = "http://localhost:3000")
public class OAuth2Controller {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2Controller.class);

    @Autowired
    private GoogleDriveService googleDriveService;

    @Autowired
    private CloudAccountService cloudAccountService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/authorize/google")
    public void authorizeGoogle(HttpServletResponse response, 
                               HttpSession session,
                               @RequestParam(required = false) String username) {
        try {
            logger.info("Starting Google OAuth authorization");
            
            // Store username in session for callback
            if (username != null) {
                session.setAttribute("oauth_username", username);
                logger.info("Stored username in session: {}", username);
            }
            
            String authUrl = googleDriveService.getAuthorizationUrl();
            logger.info("Redirecting to Google OAuth URL: {}", authUrl);
            response.sendRedirect(authUrl);
        } catch (Exception e) {
            logger.error("Error generating authorization URL", e);
            try {
                response.sendRedirect("http://localhost:3000/dashboard?error=" + e.getMessage());
            } catch (IOException ioException) {
                logger.error("Error redirecting to error page", ioException);
            }
        }
    }

    @GetMapping("/callback/google")
    public RedirectView handleGoogleCallback(
            @RequestParam("code") String code,
            @RequestParam(required = false) String state,
            HttpSession session) {
        
        try {
            logger.info("Received Google OAuth callback with code");
            
            // Exchange code for tokens
            GoogleTokenResponse tokenResponse = googleDriveService.exchangeCode(code);
            
            String accessToken = tokenResponse.getAccessToken();
            String refreshToken = tokenResponse.getRefreshToken();
            
            logger.info("Successfully exchanged code for tokens");

            // Get user email from Google
            String userEmail = "user@gmail.com"; // Placeholder for now

            // Try to get username from session
            String username = (String) session.getAttribute("oauth_username");
            
            if (username == null) {
                logger.warn("No username in session, redirecting to login");
                return new RedirectView("http://localhost:3000/login?message=session_expired");
            }

            // Get current user
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found: " + username));

            logger.info("Found user: {}", username);

            // Save cloud account
            cloudAccountService.saveCloudAccount(
                    user,
                    CloudProvider.GOOGLE_DRIVE,
                    accessToken,
                    refreshToken,
                    userEmail
            );

            logger.info("Successfully saved cloud account for user: {}", username);

            // Clear session
            session.removeAttribute("oauth_username");

            // Redirect to frontend success page
            return new RedirectView("http://localhost:3000/dashboard?connected=google");
            
        } catch (Exception e) {
            logger.error("Error in Google OAuth callback", e);
            return new RedirectView("http://localhost:3000/dashboard?error=" + e.getMessage());
        }
    }
}