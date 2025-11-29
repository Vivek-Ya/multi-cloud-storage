package com.multicloud.service;

import com.dropbox.core.DbxException;
import com.dropbox.core.DbxRequestConfig;
import com.dropbox.core.oauth.DbxCredential;
import com.dropbox.core.v2.DbxClientV2;
import com.dropbox.core.v2.files.*;
import com.dropbox.core.v2.users.FullAccount;
import com.dropbox.core.v2.users.SpaceUsage;
import okhttp3.*;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DropboxService {

    @Value("${dropbox.client.id}")
    private String clientId;

    @Value("${dropbox.client.secret}")
    private String clientSecret;

    @Value("${dropbox.redirect.uri}")
    private String redirectUri;

    @Value("${dropbox.auth.uri}")
    private String authUri;

    @Value("${dropbox.token.uri}")
    private String tokenUri;

    private final OkHttpClient httpClient = new OkHttpClient();

    public String getAuthorizationUrl() {
        return authUri +
                "?client_id=" + clientId +
                "&response_type=code" +
                "&redirect_uri=" + redirectUri +
                "&token_access_type=offline"; // Request refresh token
    }

    public Map<String, String> exchangeCode(String code) throws IOException {
        RequestBody formBody = new FormBody.Builder()
                .add("code", code)
                .add("grant_type", "authorization_code")
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .add("redirect_uri", redirectUri)
                .build();

        Request request = new Request.Builder()
                .url(tokenUri)
                .post(formBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to exchange code: " + response.body().string());
            }

            JSONObject json = new JSONObject(response.body().string());
            Map<String, String> tokens = new HashMap<>();
            tokens.put("access_token", json.getString("access_token"));
            tokens.put("refresh_token", json.optString("refresh_token"));
            tokens.put("account_id", json.optString("account_id"));
            return tokens;
        }
    }

    public Map<String, String> refreshAccessToken(String refreshToken) throws IOException {
        RequestBody formBody = new FormBody.Builder()
                .add("grant_type", "refresh_token")
                .add("refresh_token", refreshToken)
                .build();

        Request request = new Request.Builder()
                .url(tokenUri)
                .header("Authorization", Credentials.basic(clientId, clientSecret))
                .post(formBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to refresh token: " + response.body().string());
            }

            JSONObject json = new JSONObject(response.body().string());
            Map<String, String> tokens = new HashMap<>();
            tokens.put("access_token", json.getString("access_token"));
            tokens.put("expires_in", String.valueOf(json.optInt("expires_in", 3600)));
            if (json.has("refresh_token")) {
                tokens.put("refresh_token", json.optString("refresh_token"));
            }
            return tokens;
        }
    }

    private DbxClientV2 getClient(String accessToken) {
        DbxRequestConfig config = DbxRequestConfig.newBuilder("MultiCloudStorage/1.0").build();
        return new DbxClientV2(config, accessToken);
    }

    public List<Map<String, Object>> listFiles(String accessToken) throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        
        ListFolderResult result = client.files().listFolder("");
        List<Map<String, Object>> files = new ArrayList<>();

        for (Metadata metadata : result.getEntries()) {
            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("id", metadata.getPathLower());
            fileInfo.put("name", metadata.getName());
            
            if (metadata instanceof FileMetadata) {
                FileMetadata file = (FileMetadata) metadata;
                fileInfo.put("size", file.getSize());
                fileInfo.put("mimeType", "application/octet-stream");
                fileInfo.put("isFolder", false);
                fileInfo.put("modifiedAt", file.getClientModified());
            } else if (metadata instanceof FolderMetadata) {
                fileInfo.put("size", 0L);
                fileInfo.put("mimeType", "folder");
                fileInfo.put("isFolder", true);
            }

            String pathLower = metadata.getPathLower();
            if (pathLower != null) {
                int lastSlash = pathLower.lastIndexOf('/');
                if (lastSlash > 0) {
                    fileInfo.put("parentId", pathLower.substring(0, lastSlash));
                } else {
                    fileInfo.put("parentId", null);
                }
            }
            
            files.add(fileInfo);
        }

        return files;
    }

    public Map<String, Object> uploadFile(String accessToken, MultipartFile file) 
            throws DbxException, IOException {
        DbxClientV2 client = getClient(accessToken);
        
        String dropboxPath = "/" + file.getOriginalFilename();
        
        try (InputStream in = file.getInputStream()) {
            FileMetadata metadata = client.files().uploadBuilder(dropboxPath)
                    .uploadAndFinish(in);
            
            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("id", metadata.getPathLower());
            fileInfo.put("name", metadata.getName());
            fileInfo.put("size", metadata.getSize());
            return fileInfo;
        }
    }

    public ByteArrayOutputStream downloadFile(String accessToken, String fileId) 
            throws DbxException, IOException {
        DbxClientV2 client = getClient(accessToken);
        
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        client.files().downloadBuilder(fileId).download(outputStream);
        
        return outputStream;
    }

    public void deleteFile(String accessToken, String fileId) throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        client.files().deleteV2(fileId);
    }

    public Map<String, Object> renameFile(String accessToken, String fileId, String newName) 
            throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        
        // Get parent path
        String parentPath = fileId.substring(0, fileId.lastIndexOf("/"));
        if (parentPath.isEmpty()) {
            parentPath = "";
        }
        String newPath = parentPath + "/" + newName;
        
        Metadata metadata = client.files().moveV2(fileId, newPath).getMetadata();
        
        Map<String, Object> fileInfo = new HashMap<>();
        fileInfo.put("id", metadata.getPathLower());
        fileInfo.put("name", metadata.getName());
        return fileInfo;
    }

    public Map<String, Object> createFolder(String accessToken, String folderName, String parentPath) 
            throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        
        String basePath = parentPath != null ? parentPath.trim() : "";
        if (basePath.isEmpty() || basePath.equals("/")) {
            basePath = "";
        } else {
            if (!basePath.startsWith("/")) {
                basePath = "/" + basePath;
            }
            if (!basePath.endsWith("/")) {
                basePath = basePath + "/";
            }
        }

        String folderPath = basePath + folderName;
        FolderMetadata folder = client.files().createFolderV2(folderPath).getMetadata();
        
        Map<String, Object> folderInfo = new HashMap<>();
        folderInfo.put("id", folder.getPathLower());
        folderInfo.put("name", folder.getName());
        folderInfo.put("isFolder", true);

        String pathLower = folder.getPathLower();
        if (pathLower != null) {
            int lastSlash = pathLower.lastIndexOf('/');
            if (lastSlash > 0) {
                folderInfo.put("parentId", pathLower.substring(0, lastSlash));
            } else {
                folderInfo.put("parentId", null);
            }
        }
        return folderInfo;
    }

    public Map<String, Object> moveFile(String accessToken, String fileId, String newPath) 
            throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        
        Metadata metadata = client.files().moveV2(fileId, newPath).getMetadata();
        
        Map<String, Object> fileInfo = new HashMap<>();
        fileInfo.put("id", metadata.getPathLower());
        fileInfo.put("name", metadata.getName());
        return fileInfo;
    }

    public Map<String, Object> getStorageQuota(String accessToken) throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        
        SpaceUsage spaceUsage = client.users().getSpaceUsage();
        
        Map<String, Object> quota = new HashMap<>();
        quota.put("used", spaceUsage.getUsed());
        quota.put("allocated", spaceUsage.getAllocation().getIndividualValue().getAllocated());
        
        return quota;
    }

    public String getTemporaryLink(String accessToken, String fileId) throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        GetTemporaryLinkResult result = client.files().getTemporaryLink(fileId);
        return result != null ? result.getLink() : null;
    }

    public String getUserEmail(String accessToken) throws DbxException {
        DbxClientV2 client = getClient(accessToken);
        FullAccount account = client.users().getCurrentAccount();
        return account.getEmail();
    }
}