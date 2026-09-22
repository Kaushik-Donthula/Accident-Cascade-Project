package com.accidentcascade.ai.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RiskController {
    private final RiskService riskService;
    public RiskController(RiskService riskService) { this.riskService = riskService; }

    @GetMapping("/dashboard") public DashboardResponse dashboard() { return riskService.dashboard(); }
    @PostMapping("/risks") @ResponseStatus(HttpStatus.CREATED)
    public RiskResponse score(@Valid @RequestBody RiskRequest request) { return riskService.score(request); }
    @PostMapping("/incidents") @ResponseStatus(HttpStatus.CREATED)
    public void incident(@Valid @RequestBody IncidentRequest request) { riskService.addIncident(request); }
}
