package com.accidentcascade.ai.api;

import java.util.List;

public record DashboardData(int activeIncidents, double averageLeadTimeMinutes, List<RiskResponse> risks) { }
