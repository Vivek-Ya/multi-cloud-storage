package com.multicloud.repository;

import com.multicloud.model.ActivityLog;
import com.multicloud.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    Page<ActivityLog> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    List<ActivityLog> findByUserAndActivityType(
            User user, ActivityLog.ActivityType activityType);
    
    @Query("SELECT COUNT(a) FROM ActivityLog a WHERE a.user = :user " +
           "AND a.activityType = :activityType " +
           "AND a.createdAt >= :since")
    Long countActivityByUserAndTypeSince(
            @Param("user") User user,
            @Param("activityType") ActivityLog.ActivityType activityType,
            @Param("since") LocalDateTime since);
    
    @Query("SELECT a FROM ActivityLog a WHERE a.user = :user " +
           "AND a.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY a.createdAt DESC")
    List<ActivityLog> findUserActivityBetween(
            @Param("user") User user,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}