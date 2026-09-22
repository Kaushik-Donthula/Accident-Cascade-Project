package com.accidentcascade.ai.api;

import java.util.List;

public record DashboardResponse(int activeIncidents, int highRiskZones, double averageLeadTimeMinutes,
                                List<RiskResponse> risks, List<String> interventions) { }
