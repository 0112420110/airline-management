package com.airline.airline_management.controller;

import com.airline.airline_management.model.Crew;
import com.airline.airline_management.repository.CrewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crew")
public class CrewController {

    @Autowired private CrewRepository crewRepository;

    @PostMapping
    public Crew createCrew(@RequestBody Crew crew) {
        return crewRepository.save(crew);
    }

    @GetMapping
    public List<Crew> getAllCrew() {
        return crewRepository.findAll();
    }

    @DeleteMapping("/{id}")
    public String deleteCrew(@PathVariable Long id) {
        crewRepository.deleteById(id);
        return "Crew member removed";
    }
}