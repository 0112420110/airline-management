package com.airline.airline_management.controller;

import com.airline.airline_management.dto.CrewAssignmentRequest;
import com.airline.airline_management.model.*;
import com.airline.airline_management.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crew-assignments")
public class CrewAssignmentController {

    @Autowired private CrewAssignmentRepository assignmentRepository;
    @Autowired private CrewRepository crewRepository;
    @Autowired private FlightRepository flightRepository;

    @PostMapping
    public Object assignCrew(@RequestBody CrewAssignmentRequest request) {
        Crew crew = crewRepository.findById(request.getCrewId()).orElse(null);
        Flight flight = flightRepository.findById(request.getFlightId()).orElse(null);
        if (crew == null) return "Crew member not found";
        if (flight == null) return "Flight not found";

        // Conflict check: is this crew member already booked on an overlapping flight?
        List<CrewAssignment> existing = assignmentRepository.findByCrew(crew);
        for (CrewAssignment a : existing) {
            Flight other = a.getFlight();
            boolean overlap = flight.getDepartureTime().isBefore(other.getArrivalTime())
                    && other.getDepartureTime().isBefore(flight.getArrivalTime());
            if (overlap) {
                return "Conflict: " + crew.getName() + " is already assigned to "
                        + other.getSource() + " → " + other.getDestination()
                        + " (" + other.getDepartureTime() + " to " + other.getArrivalTime()
                        + "), which overlaps with this flight.";
            }
        }

        CrewAssignment assignment = new CrewAssignment();
        assignment.setCrew(crew);
        assignment.setFlight(flight);
        return assignmentRepository.save(assignment);
    }

    @GetMapping("/flight/{flightId}")
    public List<CrewAssignment> getCrewForFlight(@PathVariable Long flightId) {
        Flight flight = flightRepository.findById(flightId).orElse(null);
        if (flight == null) return List.of();
        return assignmentRepository.findByFlight(flight);
    }

    @DeleteMapping("/{id}")
    public String removeAssignment(@PathVariable Long id) {
        assignmentRepository.deleteById(id);
        return "Crew unassigned";
    }
}