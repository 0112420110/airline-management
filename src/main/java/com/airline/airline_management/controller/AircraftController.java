package com.airline.airline_management.controller;

import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.repository.AircraftRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aircraft")
public class AircraftController {

    @Autowired
    private AircraftRepository aircraftRepository;

    @PostMapping
    public Aircraft createAircraft(@RequestBody Aircraft aircraft) {
        return aircraftRepository.save(aircraft);
    }

    @GetMapping
    public List<Aircraft> getAllAircraft() {
        return aircraftRepository.findAll();
    }

    @GetMapping("/{id}")
    public Aircraft getAircraftById(@PathVariable Long id) {
        return aircraftRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}")
    public Aircraft updateAircraft(@PathVariable Long id, @RequestBody Aircraft updatedAircraft) {
        Aircraft aircraft = aircraftRepository.findById(id).orElse(null);
        if (aircraft == null) return null;

        aircraft.setModel(updatedAircraft.getModel());
        aircraft.setTotalSeats(updatedAircraft.getTotalSeats());
        aircraft.setEconomySeats(updatedAircraft.getEconomySeats());
        aircraft.setBusinessSeats(updatedAircraft.getBusinessSeats());
        aircraft.setFirstClassSeats(updatedAircraft.getFirstClassSeats());

        return aircraftRepository.save(aircraft);
    }

    @DeleteMapping("/{id}")
    public String deleteAircraft(@PathVariable Long id) {
        aircraftRepository.deleteById(id);
        return "Aircraft deleted successfully";
    }
}