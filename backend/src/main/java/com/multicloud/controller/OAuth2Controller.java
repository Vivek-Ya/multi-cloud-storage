package com.multicloud.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.multicloud.model.CloudProvider;
import com.multicloud.model.User;
import com.multicloud.repository.UserRepository;
import com.multicloud.service.CloudAccountService;
import com.multicloud.service.DropboxService;
import com.multicloud.service.GoogleDriveService;
import com.multicloud.service.OneDriveService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/oauth2")
@CrossOrigin(origins = "http://localhost:3000")
public class OAuth2Controller {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2Controller.class);

    @Autowired
    private GoogleDriveService googleDriveService;

    @Autowired
    private OneDriveService oneDriveService;

    @Autowired
    private DropboxService dropboxService;

    @Autowired
    private CloudAccountService cloudAccountService;

    @Autowired
    private UserRepository userRepository;

    private static final String FRONTEND_BASE_URL = "http://localhost:3000";

    // ==================== GOOGLE DRIVE ====================
    
    @GetMapping("/authorize/google")
    public void authorizeGoogle(
            HttpServletResponse response, 
            HttpSession session,
            @RequestParam(required = false) String username) {
        try {
            logger.info("Starting Google OAuth authorization for user: {}", username);
            
            if (username != null) {
                session.setAttribute("oauth_username", username);
                session.setAttribute("oauth_provider", "GOOGLE_DRIVE");
                logger.info("Stored username and provider in session");
            }
            
            String state = UUID.randomUUID().toString();
            session.setAttribute("oauth_state", state);

            String authUrl = googleDriveService.getAuthorizationUrl(state);
            logger.info("Redirecting to Google OAuth URL with state={}", state);
            response.sendRedirect(authUrl);
        } catch (Exception e) {
            logger.error("Error generating Google authorization URL", e);
            redirectToError(response, "Failed to connect to Google Drive");
        }
    }

    @GetMapping("/callback/google")
    public RedirectView handleGoogleCallback(
            @RequestParam("code") String code,
            @RequestParam(required = false) String state,
            HttpSession session) {
        
        try {
            logger.info("Received Google OAuth callback");

            // Validate state to prevent CSRF
            String sessionState = (String) session.getAttribute("oauth_state");
            if (state == null || sessionState == null || !sessionState.equals(state)) {
                logger.warn("Invalid or missing OAuth state (google). session={}, request={}", sessionState, state);
                return new RedirectView(FRONTEND_BASE_URL + "/dashboard?error=state_mismatch");
            }
            
            // Exchange code for tokens
            GoogleTokenResponse tokenResponse = googleDriveService.exchangeCode(code);
            String accessToken = tokenResponse.getAccessToken();
            String refreshToken = tokenResponse.getRefreshToken();
            
            logger.info("Successfully exchanged code for tokens");

            // Get user email from Google
            String userEmail = googleDriveService.getUserEmail(accessToken);

            // Get username from session
            String username = (String) session.getAttribute("oauth_username");
            if (username == null) {
                logger.warn("No username in session, redirecting to login");
                return new RedirectView(FRONTEND_BASE_URL + "/login?message=session_expired");
            }

            // Find user
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found: " + username));

            // Save cloud account
            cloudAccountService.saveCloudAccount(
                    user,
                    CloudProvider.GOOGLE_DRIVE,
                    accessToken,
                    refreshToken,
                    userEmail
            );

            logger.info("Successfully saved Google Drive account for user: {}", username);

            // Clear session
            session.removeAttribute("oauth_username");
            session.removeAttribute("oauth_provider");
            session.removeAttribute("oauth_state");

            return new RedirectView(FRONTEND_BASE_URL + "/dashboard?connected=google");
            
        } catch (Exception e) {
            logger.error("Error in Google OAuth callback", e);
            return new RedirectView(FRONTEND_BASE_URL + "/dashboard?error=" + e.getMessage());
        }
    }

    // ==================== ONEDRIVE ====================
    
    @GetMapping("/authorize/onedrive")
    public void authorizeOneDrive(
            HttpServletResponse response, 
            HttpSession session,
            @RequestParam(required = false) String username) {
        try {
            logger.info("Starting OneDrive OAuth authorization for user: {}", username);
            
            if (username != null) {
                session.setAttribute("oauth_username", username);
                session.setAttribute("oauth_provider", "ONEDRIVE");
            }
            
            String state = UUID.randomUUID().toString();
            session.setAttribute("oauth_state", state);

            String authUrl = oneDriveService.getAuthorizationUrl();
            // append state param
            authUrl = authUrl + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8.name());
            logger.info("Redirecting to OneDrive OAuth URL with state={}", state);
            response.sendRedirect(authUrl);
        } catch (Exception e) {
            logger.error("Error generating OneDrive authorization URL", e);
            redirectToError(response, "Failed to connect to OneDrive");
        }
    }

    @GetMapping("/callback/onedrive")
    public RedirectView handleOneDriveCallback(
            @RequestParam("code") String code,
            @RequestParam(required = false) String state,
            HttpSession session) {
        
        try {
            logger.info("Received OneDrive OAuth callback");

            // Validate state to prevent CSRF
            String sessionState = (String) session.getAttribute("oauth_state");
            if (state == null || sessionState == null || !sessionState.equals(state)) {
                logger.warn("Invalid or missing OAuth state (onedrive). session={}, request={}", sessionState, state);
                return new RedirectView(FRONTEND_BASE_URL + "/dashboard?error=state_mismatch");
            }
            
            Map<String, String> tokens = oneDriveService.exchangeCode(code);
            String accessToken = tokens.get("access_token");
            String refreshToken = tokens.get("refresh_token");
            
            logger.info("Successfully exchanged code for tokens");

            // Get user email from OneDrive
            String userEmail = oneDriveService.getUserEmail(accessToken);

            String username = (String) session.getAttribute("oauth_username");
            if (username == null) {
                logger.warn("No username in session");
                return new RedirectView(FRONTEND_BASE_URL + "/login?message=session_expired");
            }

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found: " + username));

            cloudAccountService.saveCloudAccount(
                    user,
                    CloudProvider.ONEDRIVE,
                    accessToken,
                    refreshToken,
                    userEmail
            );

            logger.info("Successfully saved OneDrive account for user: {}", username);

            session.removeAttribute("oauth_username");
            session.removeAttribute("oauth_provider");
            session.removeAttribute("oauth_state");

            return new RedirectView(FRONTEND_BASE_URL + "/dashboard?connected=onedrive");
            
        } catch (Exception e) {
            logger.error("Error in OneDrive OAuth callback", e);
            return new RedirectView(FRONTEND_BASE_URL + "/dashboard?error=" + e.getMessage());
        }
    }

    // ==================== DROPBOX ====================
    
    @GetMapping("/authorize/dropbox")
    public void authorizeDropbox(
            HttpServletResponse response, 
            HttpSession session,
            @RequestParam(required = false) String username) {
        try {
            logger.info("Starting Dropbox OAuth authorization for user: {}", username);
            
            if (username != null) {
                session.setAttribute("oauth_username", username);
                session.setAttribute("oauth_provider", "DROPBOX");
            }
            
            String state = UUID.randomUUID().toString();
            session.setAttribute("oauth_state", state);

            String authUrl = dropboxService.getAuthorizationUrl();
            authUrl = authUrl + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8.name());
            logger.info("Redirecting to Dropbox OAuth URL with state={}", state);
            response.sendRedirect(authUrl);
        } catch (Exception e) {
            logger.error("Error generating Dropbox authorization URL", e);
            redirectToError(response, "Failed to connect to Dropbox");
        }
    }

    @GetMapping("/callback/dropbox")
    public RedirectView handleDropboxCallback(
            @RequestParam("code") String code,
            @RequestParam(required = false) String state,
            HttpSession session) {
        
        try {
            logger.info("Received Dropbox OAuth callback");

            // Validate state to prevent CSRF
            String sessionState = (String) session.getAttribute("oauth_state");
            if (state == null || sessionState == null || !sessionState.equals(state)) {
                logger.warn("Invalid or missing OAuth state (dropbox). session={}, request={}", sessionState, state);
                return new RedirectView(FRONTEND_BASE_URL + "/dashboard?error=state_mismatch");
            }
            
            Map<String, String> tokens = dropboxService.exchangeCode(code);
            String accessToken = tokens.get("access_token");
            String refreshToken = tokens.get("refresh_token");
            
            logger.info("Successfully exchanged code for tokens");

            String userEmail = dropboxService.getUserEmail(accessToken);

            String username = (String) session.getAttribute("oauth_username");
            if (username == null) {
                logger.warn("No username in session");
                return new RedirectView(FRONTEND_BASE_URL + "/login?message=session_expired");
            }

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found: " + username));

            cloudAccountService.saveCloudAccount(
                    user,
                    CloudProvider.DROPBOX,
                    accessToken,
                    refreshToken,
                    userEmail
            );

            logger.info("Successfully saved Dropbox account for user: {}", username);

            session.removeAttribute("oauth_username");
            session.removeAttribute("oauth_provider");
            session.removeAttribute("oauth_state");

            return new RedirectView(FRONTEND_BASE_URL + "/dashboard?connected=dropbox");
            
        } catch (Exception e) {
            logger.error("Error in Dropbox OAuth callback", e);
            return new RedirectView(FRONTEND_BASE_URL + "/dashboard?error=" + e.getMessage());
        }
    }

    // ==================== HELPER METHODS ====================
    
    private void redirectToError(HttpServletResponse response, String message) {
        try {
            response.sendRedirect(FRONTEND_BASE_URL + "/dashboard?error=" + message);
        } catch (IOException e) {
            logger.error("Failed to redirect to error page", e);
        }
    }
}