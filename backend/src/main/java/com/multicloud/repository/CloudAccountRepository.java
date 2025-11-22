package com.multicloud.repository;

import com.multicloud.model.CloudAccount;
import com.multicloud.model.CloudProvider;
import com.multicloud.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CloudAccountRepository extends JpaRepository<CloudAccount, Long> {
    List<CloudAccount> findByUser(User user);
    List<CloudAccount> findByUserAndIsActive(User user, Boolean isActive);
    Optional<CloudAccount> findByUserAndProviderName(User user, CloudProvider provider);
    Optional<CloudAccount> findByUserAndProviderNameAndAccountEmail(User user, CloudProvider provider, String email);
}