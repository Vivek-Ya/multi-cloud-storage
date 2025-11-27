package com.multicloud.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonParser;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.util.*;

@Service
public class GoogleDriveService {

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;

    @Value("${google.redirect.uri}")
    private String redirectUri;

    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Arrays.asList(
            DriveScopes.DRIVE,
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
    );

        public String getAuthorizationUrl(String state) throws Exception {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
        details.setClientId(clientId);
        details.setClientSecret(clientSecret);

        GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
        clientSecrets.setInstalled(details);

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();

        com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl authUrl =
                flow.newAuthorizationUrl().setRedirectUri(redirectUri);

        if (state != null && !state.isEmpty()) {
            authUrl.setState(state);
        }

        return authUrl.build();
    }

    public GoogleTokenResponse exchangeCode(String code) throws Exception {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
        details.setClientId(clientId);
        details.setClientSecret(clientSecret);

        GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
        clientSecrets.setInstalled(details);

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .build();

        return flow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();
    }

    public Drive getDriveService(String accessToken) throws Exception {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        GoogleCredentials credentials = GoogleCredentials.create(
                new AccessToken(accessToken, null)
        );

        return new Drive.Builder(
                httpTransport,
                JSON_FACTORY,
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("MultiCloud Storage")
                .build();
    }

    public File uploadFile(String accessToken, MultipartFile multipartFile, String folderPath) throws Exception {
        Drive driveService = getDriveService(accessToken);

        File fileMetadata = new File();
        fileMetadata.setName(multipartFile.getOriginalFilename());

        java.io.File tempFile = java.io.File.createTempFile("upload", null);
        multipartFile.transferTo(tempFile);

        FileContent mediaContent = new FileContent(
                multipartFile.getContentType(),
                tempFile
        );

        File file = driveService.files().create(fileMetadata, mediaContent)
                .setFields("id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink")
                .execute();

        tempFile.delete();

        return file;
    }

        public List<File> listFiles(String accessToken) throws Exception {
        Drive driveService = getDriveService(accessToken);

        FileList result = driveService.files().list()
                .setPageSize(100)
                                .setFields("files(id, name, mimeType, size, parents, createdTime, modifiedTime, webViewLink, thumbnailLink)")
                                .setQ("trashed = false")
                .execute();

        return result.getFiles();
    }

        public File createFolder(String accessToken, String folderName, String parentFolderId) throws Exception {
                Drive driveService = getDriveService(accessToken);

                File fileMetadata = new File();
                fileMetadata.setName(folderName);
                fileMetadata.setMimeType("application/vnd.google-apps.folder");

                if (parentFolderId != null && !parentFolderId.trim().isEmpty()) {
                        fileMetadata.setParents(Collections.singletonList(parentFolderId));
                }

                return driveService.files().create(fileMetadata)
                                .setFields("id, name, mimeType, parents, createdTime, modifiedTime, webViewLink, thumbnailLink")
                                .execute();
        }

        public Map<String, String> refreshAccessToken(String refreshToken) throws Exception {
                NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

                GoogleTokenResponse response = new GoogleRefreshTokenRequest(
                                httpTransport,
                                JSON_FACTORY,
                                refreshToken,
                                clientId,
                                clientSecret)
                                .setGrantType("refresh_token")
                                .execute();

                Map<String, String> tokens = new HashMap<>();
                if (response.getAccessToken() != null) {
                        tokens.put("access_token", response.getAccessToken());
                }
                if (response.getRefreshToken() != null) {
                        tokens.put("refresh_token", response.getRefreshToken());
                }
                if (response.getExpiresInSeconds() != null) {
                        tokens.put("expires_in", response.getExpiresInSeconds().toString());
                }

                return tokens;
        }

        public File renameFile(String accessToken, String fileId, String newName) throws Exception {
                Drive driveService = getDriveService(accessToken);

                File fileMetadata = new File();
                fileMetadata.setName(newName);

                return driveService.files()
                                .update(fileId, fileMetadata)
                                .setFields("id, name, mimeType, size, parents, createdTime, modifiedTime, webViewLink, thumbnailLink")
                                .execute();
        }

    public ByteArrayOutputStream downloadFile(String accessToken, String fileId) throws Exception {
        Drive driveService = getDriveService(accessToken);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        driveService.files().get(fileId)
                .executeMediaAndDownloadTo(outputStream);

        return outputStream;
    }

    public void deleteFile(String accessToken, String fileId) throws Exception {
        Drive driveService = getDriveService(accessToken);
        driveService.files().delete(fileId).execute();
    }

    public Map<String, Object> getStorageQuota(String accessToken) throws Exception {
        Drive driveService = getDriveService(accessToken);
        
        com.google.api.services.drive.model.About about = driveService.about()
                .get()
                .setFields("storageQuota")
                .execute();

        Map<String, Object> quota = new HashMap<>();
        if (about.getStorageQuota() != null) {
            quota.put("limit", about.getStorageQuota().getLimit());
            quota.put("usage", about.getStorageQuota().getUsage());
            quota.put("usageInDrive", about.getStorageQuota().getUsageInDrive());
        }

        return quota;
    }

        public String getUserEmail(String accessToken) throws Exception {
                NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

                GenericUrl url = new GenericUrl("https://www.googleapis.com/oauth2/v1/userinfo?alt=json");

                HttpRequestFactory requestFactory = httpTransport.createRequestFactory();
                HttpRequest request = requestFactory.buildGetRequest(url);
                request.getHeaders().setAuthorization("Bearer " + accessToken);

                String json = request.execute().parseAsString();

                JsonParser parser = JSON_FACTORY.createJsonParser(json);
                @SuppressWarnings("unchecked")
                Map<String, Object> userInfo = parser.parse(Map.class);

                if (userInfo != null && userInfo.get("email") != null) {
                        return userInfo.get("email").toString();
                }

                return null;
        }
}