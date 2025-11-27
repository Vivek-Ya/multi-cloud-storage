package com.multicloud.repository;

import com.multicloud.model.FileMetadata;
import com.multicloud.model.SharePermission;
import com.multicloud.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SharePermissionRepository extends JpaRepository<SharePermission, Long> {
    List<SharePermission> findByFileMetadata(FileMetadata fileMetadata);
    List<SharePermission> findBySharedBy(User sharedBy);
    List<SharePermission> findBySharedWithUser(User sharedWithUser);
    List<SharePermission> findBySharedWithEmail(String email);
    Optional<SharePermission> findByShareLink(String shareLink);
    
    @Query("SELECT s FROM SharePermission s WHERE s.sharedWithUser = :user " +
           "OR s.sharedWithEmail = :email")
    List<SharePermission> findSharedWithUser(
            @Param("user") User user, 
            @Param("email") String email);
    
    @Query("SELECT COUNT(s) FROM SharePermission s WHERE s.fileMetadata = :file")
    Long countSharesByFile(@Param("file") FileMetadata file);
    
    boolean existsByFileMetadataAndSharedWithEmail(
            FileMetadata fileMetadata, String email);
}