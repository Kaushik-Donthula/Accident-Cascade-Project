package com.accidentcascade.ai.api;

import jakarta.validation.constraints.NotBlank;

public record IncidentRequest(@NotBlank String location, @NotBlank String severity) { }
