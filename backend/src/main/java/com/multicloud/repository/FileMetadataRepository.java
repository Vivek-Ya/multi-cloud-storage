package com.multicloud.repository;

import com.multicloud.model.CloudAccount;
import com.multicloud.model.FileMetadata;
import com.multicloud.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByUser(User user);
    List<FileMetadata> findByCloudAccount(CloudAccount cloudAccount);
    List<FileMetadata> findByUserAndIsTrashed(User user, Boolean isTrashed);
    Optional<FileMetadata> findByCloudAccountAndCloudFileId(CloudAccount cloudAccount, String cloudFileId);
}