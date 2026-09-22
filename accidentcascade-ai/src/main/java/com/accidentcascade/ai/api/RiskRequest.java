package com.accidentcascade.ai.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record RiskRequest(
        @NotBlank String road,
        @PositiveOrZero double relativeVelocity,
        @DecimalMin("0.1") double gapDistance,
        @DecimalMin("0.1") double timeToCollision,
        @PositiveOrZero int laneChangeFrequency,
        String hazard,
        Double latitude,
        Double longitude) { }
