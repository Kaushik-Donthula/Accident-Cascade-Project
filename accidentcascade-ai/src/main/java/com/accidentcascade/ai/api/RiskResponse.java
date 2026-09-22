package com.accidentcascade.ai.api;

public record RiskResponse(String id, String road, int score, String level, String recommendation, String model, String hazard,
                           double latitude, double longitude) { }
