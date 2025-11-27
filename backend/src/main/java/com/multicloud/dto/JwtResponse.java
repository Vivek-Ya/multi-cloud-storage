package com.multicloud.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtResponse {
    private String accessToken;

    @Builder.Default
    private String tokenType = "Bearer";

    private String refreshToken;

    private UserSummaryDTO user;
}
