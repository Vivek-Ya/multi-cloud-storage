package com.multicloud.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class TwoFactorSetupRequest {
    @NotBlank(message = "Verification code is required")
    private String verificationCode;
}