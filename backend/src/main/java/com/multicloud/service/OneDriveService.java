package com.multicloud.service;

import okhttp3.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OneDriveService {

    private static final Logger logger = LoggerFactory.getLogger(OneDriveService.class);

    @Value("${onedrive.client.id}")
    private String clientId;

    @Value("${onedrive.client.secret}")
    private String clientSecret;

    @Value("${onedrive.redirect.uri}")
    private String redirectUri;

    @Value("${onedrive.auth.uri}")
    private String authUri;

    @Value("${onedrive.token.uri}")
    private String tokenUri;

    @Value("${onedrive.scope}")
    private String scope;

    private final OkHttpClient httpClient = new OkHttpClient();
    private static final String GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0";

    public String getAuthorizationUrl() {
        String url = authUri +
                "?client_id=" + clientId +
                "&response_type=code" +
                "&redirect_uri=" + redirectUri +
                "&response_mode=query" +
                "&scope=" + scope.replace(" ", "%20");
        
        logger.info("Generated OneDrive auth URL: {}", url);
        return url;
    }

    public Map<String, String> exchangeCode(String code) throws IOException {
        logger.info("Exchanging OneDrive code for tokens");
        
        RequestBody formBody = new FormBody.Builder()
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .add("code", code)
                .add("redirect_uri", redirectUri)
                .add("grant_type", "authorization_code")
                .build();

        Request request = new Request.Builder()
                .url(tokenUri)
                .post(formBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            logger.info("Token exchange response code: {}", response.code());
            
            if (!response.isSuccessful()) {
                logger.error("Failed to exchange code: {}", responseBody);
                throw new IOException("Failed to exchange code: " + responseBody);
            }

            JSONObject json = new JSONObject(responseBody);
            Map<String, String> tokens = new HashMap<>();
            tokens.put("access_token", json.getString("access_token"));
            tokens.put("refresh_token", json.optString("refresh_token", ""));
            tokens.put("expires_in", String.valueOf(json.optInt("expires_in", 3600)));
            
            logger.info("Successfully exchanged code for tokens");
            return tokens;
        } catch (Exception e) {
            logger.error("Error exchanging code", e);
            throw new IOException("Error exchanging code: " + e.getMessage());
        }
    }

    public Map<String, String> refreshAccessToken(String refreshToken) throws IOException {
        logger.info("Refreshing OneDrive access token");

        RequestBody formBody = new FormBody.Builder()
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .add("refresh_token", refreshToken)
                .add("redirect_uri", redirectUri)
                .add("grant_type", "refresh_token")
                .build();

        Request request = new Request.Builder()
                .url(tokenUri)
                .post(formBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            logger.info("Token refresh response code: {}", response.code());

            if (!response.isSuccessful()) {
                logger.error("Failed to refresh token: {}", responseBody);
                throw new IOException("Failed to refresh token: " + responseBody);
            }

            JSONObject json = new JSONObject(responseBody);
            Map<String, String> tokens = new HashMap<>();
            tokens.put("access_token", json.getString("access_token"));
            tokens.put("expires_in", String.valueOf(json.optInt("expires_in", 3600)));
            if (json.has("refresh_token")) {
                tokens.put("refresh_token", json.optString("refresh_token"));
            }

            return tokens;
        } catch (Exception e) {
            logger.error("Error refreshing OneDrive token", e);
            throw new IOException("Error refreshing token: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> listFiles(String accessToken) throws IOException {
        logger.info("Listing OneDrive files");
        
        Request request = new Request.Builder()
                .url(GRAPH_API_ENDPOINT + "/me/drive/root/children")
                .header("Authorization", "Bearer " + accessToken)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                logger.error("Failed to list files: {}", response.code());
                throw new IOException("Failed to list files: " + response.code());
            }

            String responseBody = response.body().string();
            JSONObject json = new JSONObject(responseBody);
            JSONArray items = json.getJSONArray("value");

            List<Map<String, Object>> files = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                Map<String, Object> fileInfo = new HashMap<>();
                
                fileInfo.put("id", item.getString("id"));
                fileInfo.put("name", item.getString("name"));
                fileInfo.put("size", item.optLong("size", 0));
                fileInfo.put("mimeType", item.optJSONObject("file") != null ? 
                    item.getJSONObject("file").optString("mimeType", "application/octet-stream") : "folder");
                fileInfo.put("webUrl", item.optString("webUrl", ""));
                fileInfo.put("createdDateTime", item.optString("createdDateTime", ""));
                fileInfo.put("lastModifiedDateTime", item.optString("lastModifiedDateTime", ""));
                fileInfo.put("isFolder", item.has("folder"));

                JSONObject parentRef = item.optJSONObject("parentReference");
                if (parentRef != null) {
                    fileInfo.put("parentId", parentRef.optString("id", null));
                }

                files.add(fileInfo);
            }
            
            logger.info("Found {} files", files.size());
            return files;
        } catch (Exception e) {
            logger.error("Error listing files", e);
            throw new IOException("Error listing files: " + e.getMessage());
        }
    }

    public Map<String, Object> createFolder(String accessToken, String folderName, String parentFolderId) throws IOException {
        logger.info("Creating OneDrive folder: {}", folderName);

        String url;
        if (parentFolderId != null && !parentFolderId.trim().isEmpty()) {
            url = GRAPH_API_ENDPOINT + "/me/drive/items/" + parentFolderId + "/children";
        } else {
            url = GRAPH_API_ENDPOINT + "/me/drive/root/children";
        }

        JSONObject body = new JSONObject();
        body.put("name", folderName);
        body.put("folder", new JSONObject());
        body.put("@microsoft.graph.conflictBehavior", "rename");

        RequestBody requestBody = RequestBody.create(
                body.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + accessToken)
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to create folder: " + response.code());
            }

            String responseBody = response.body().string();
            JSONObject json = new JSONObject(responseBody);

            Map<String, Object> folderInfo = new HashMap<>();
            folderInfo.put("id", json.getString("id"));
            folderInfo.put("name", json.getString("name"));
            folderInfo.put("mimeType", "folder");
            folderInfo.put("isFolder", true);
            folderInfo.put("parentId", parentFolderId != null && !parentFolderId.trim().isEmpty()
                    ? parentFolderId
                    : json.optJSONObject("parentReference") != null
                        ? json.getJSONObject("parentReference").optString("id", null)
                        : null);

            return folderInfo;
        }
    }

    public Map<String, Object> uploadFile(String accessToken, MultipartFile file) throws IOException {
        logger.info("Uploading file to OneDrive: {}", file.getOriginalFilename());
        
        if (file.getSize() < 4 * 1024 * 1024) {
            return uploadSmallFile(accessToken, file);
        } else {
            throw new IOException("Large file upload not yet implemented");
        }
    }

    private Map<String, Object> uploadSmallFile(String accessToken, MultipartFile file) throws IOException {
        String uploadUrl = GRAPH_API_ENDPOINT + "/me/drive/root:/" + 
                          file.getOriginalFilename() + ":/content";

        RequestBody requestBody = RequestBody.create(
            file.getBytes(),
            MediaType.parse(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
        );

        Request request = new Request.Builder()
                .url(uploadUrl)
                .header("Authorization", "Bearer " + accessToken)
                .put(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to upload file: " + response.code());
            }

            String responseBody = response.body().string();
            JSONObject json = new JSONObject(responseBody);
            
            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("id", json.getString("id"));
            fileInfo.put("name", json.getString("name"));
            fileInfo.put("size", json.optLong("size", 0));
            fileInfo.put("webUrl", json.optString("webUrl", ""));
            
            logger.info("File uploaded successfully");
            return fileInfo;
        } catch (Exception e) {
            logger.error("Error uploading file", e);
            throw new IOException("Error uploading file: " + e.getMessage());
        }
    }

    public ByteArrayOutputStream downloadFile(String accessToken, String fileId) throws IOException {
        logger.info("Downloading file from OneDrive: {}", fileId);
        
        Request request = new Request.Builder()
                .url(GRAPH_API_ENDPOINT + "/me/drive/items/" + fileId + "/content")
                .header("Authorization", "Bearer " + accessToken)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to download file: " + response.code());
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            outputStream.write(response.body().bytes());
            
            logger.info("File downloaded successfully");
            return outputStream;
        } catch (Exception e) {
            logger.error("Error downloading file", e);
            throw new IOException("Error downloading file: " + e.getMessage());
        }
    }

    public void deleteFile(String accessToken, String fileId) throws IOException {
        logger.info("Deleting file from OneDrive: {}", fileId);
        
        Request request = new Request.Builder()
                .url(GRAPH_API_ENDPOINT + "/me/drive/items/" + fileId)
                .header("Authorization", "Bearer " + accessToken)
                .delete()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to delete file: " + response.code());
            }
            logger.info("File deleted successfully");
        } catch (Exception e) {
            logger.error("Error deleting file", e);
            throw new IOException("Error deleting file: " + e.getMessage());
        }
    }

    public Map<String, Object> renameFile(String accessToken, String fileId, String newName) throws IOException {
        logger.info("Renaming file in OneDrive: {} to {}", fileId, newName);
        
        JSONObject body = new JSONObject();
        body.put("name", newName);

        RequestBody requestBody = RequestBody.create(
            body.toString(),
            MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(GRAPH_API_ENDPOINT + "/me/drive/items/" + fileId)
                .header("Authorization", "Bearer " + accessToken)
                .patch(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to rename file: " + response.code());
            }

            String responseBody = response.body().string();
            JSONObject json = new JSONObject(responseBody);
            
            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("id", json.getString("id"));
            fileInfo.put("name", json.getString("name"));
            
            logger.info("File renamed successfully");
            return fileInfo;
        } catch (Exception e) {
            logger.error("Error renaming file", e);
            throw new IOException("Error renaming file: " + e.getMessage());
        }
    }

    public Map<String, Object> getStorageQuota(String accessToken) throws IOException {
        logger.info("Getting OneDrive storage quota");
        
        Request request = new Request.Builder()
                .url(GRAPH_API_ENDPOINT + "/me/drive")
                .header("Authorization", "Bearer " + accessToken)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get storage quota: " + response.code());
            }

            String responseBody = response.body().string();
            JSONObject json = new JSONObject(responseBody);
            JSONObject quota = json.getJSONObject("quota");

            Map<String, Object> storageInfo = new HashMap<>();
            storageInfo.put("total", quota.optLong("total", 0));
            storageInfo.put("used", quota.optLong("used", 0));
            storageInfo.put("remaining", quota.optLong("remaining", 0));
            
            logger.info("Storage quota retrieved successfully");
            return storageInfo;
        } catch (Exception e) {
            logger.error("Error getting storage quota", e);
            throw new IOException("Error getting storage quota: " + e.getMessage());
        }
    }

    public String getUserEmail(String accessToken) throws IOException {
        logger.info("Retrieving OneDrive user info to obtain email");

        Request request = new Request.Builder()
                .url(GRAPH_API_ENDPOINT + "/me?$select=mail,userPrincipalName")
                .header("Authorization", "Bearer " + accessToken)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                logger.error("Failed to get user info: {}", response.code());
                throw new IOException("Failed to get user info: " + response.code());
            }

            String responseBody = response.body().string();
            JSONObject json = new JSONObject(responseBody);
            String email = json.optString("mail", null);
            if (email == null || email.isEmpty()) {
                email = json.optString("userPrincipalName", null);
            }

            logger.info("OneDrive user email resolved: {}", email);
            return email;
        } catch (Exception e) {
            logger.error("Error retrieving user email", e);
            throw new IOException("Error retrieving user email: " + e.getMessage());
        }
    }
}