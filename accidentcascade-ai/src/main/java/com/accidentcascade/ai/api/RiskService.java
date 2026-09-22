package com.accidentcascade.ai.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RiskService {
    private final ObjectMapper objectMapper;
    private final Path dataFile;
    private final List<RiskResponse> risks;
    private int incidents;
    private double averageLeadTime;

    public RiskService(ObjectMapper objectMapper, @Value("${app.data-file}") String dataFile) {
        this.objectMapper = objectMapper;
        this.dataFile = Path.of(dataFile);
        DashboardData data = load();
        this.risks = new ArrayList<>(data.risks());
        this.incidents = data.activeIncidents();
        this.averageLeadTime = data.averageLeadTimeMinutes();
    }

    public synchronized RiskResponse score(RiskRequest request) {
        double velocityRisk = Math.min(request.relativeVelocity() / 60.0, 1.0) * 30;
        double gapRisk = Math.max(0, (20 - request.gapDistance()) / 20.0) * 25;
        double ttcRisk = Math.max(0, (5 - request.timeToCollision()) / 5.0) * 30;
        double laneRisk = Math.min(request.laneChangeFrequency() / 8.0, 1.0) * 15;
        int score = (int) Math.round(Math.min(100, velocityRisk + gapRisk + ttcRisk + laneRisk));
        String level = score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 35 ? "Moderate" : "Low";
        String advice = score >= 80 ? "Deploy warning signs and reduce speed limit" : score >= 60 ? "Alert control room and monitor queue" : "Continue observation";
        double latitude = request.latitude() == null ? 28.6304 : request.latitude();
        double longitude = request.longitude() == null ? 77.2410 : request.longitude();
        String hazard = request.hazard() == null || request.hazard().isBlank() ? "Unclassified hazard" : request.hazard();
        RiskResponse result = new RiskResponse(UUID.randomUUID().toString(), request.road(), score, level, advice,
                "Ensemble risk scorer", hazard, latitude, longitude);
        risks.add(0, result);
        save();
        return result;
    }

    public synchronized void addIncident(IncidentRequest request) { incidents++; save(); }

    public synchronized DashboardResponse dashboard() {
        int highRisk = (int) risks.stream().filter(r -> r.score() >= 60).count();
        return new DashboardResponse(incidents, highRisk, averageLeadTime, List.copyOf(risks),
                List.of("Variable speed-limit advisory", "Reroute heavy vehicles", "Notify highway patrol"));
    }

    private DashboardData load() {
        try {
            return objectMapper.readValue(dataFile.toFile(), DashboardData.class);
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot read dashboard data from " + dataFile.toAbsolutePath(), exception);
        }
    }

    private void save() {
        try {
            Files.createDirectories(dataFile.toAbsolutePath().getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(dataFile.toFile(),
                    new DashboardData(incidents, averageLeadTime, risks));
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot save dashboard data to " + dataFile.toAbsolutePath(), exception);
        }
    }
}
