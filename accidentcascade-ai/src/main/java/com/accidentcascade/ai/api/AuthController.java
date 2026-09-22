package com.accidentcascade.ai.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final String DEMO_EMAIL = "admin@accidentcascade.ai";
    private static final String DEMO_PASSWORD = "Accident@123";

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        if (!DEMO_EMAIL.equalsIgnoreCase(request.email()) || !DEMO_PASSWORD.equals(request.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }
        return new LoginResponse("Traffic Control Admin", DEMO_EMAIL);
    }
}
