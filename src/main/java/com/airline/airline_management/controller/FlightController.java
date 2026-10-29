package com.airline.airline_management.controller;

import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.model.User;
import com.airline.airline_management.pricing.PricingEngine;
import com.airline.airline_management.repository.AircraftRepository;
import com.airline.airline_management.repository.FlightRepository;
import com.airline.airline_management.repository.UserRepository;
import com.airline.airline_management.service.FlightStatusSocketServer;
import com.airline.airline_management.service.NotificationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/flights")
public class FlightController {

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private AircraftRepository aircraftRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private FlightStatusSocketServer socketServer;

    @Autowired private PricingEngine pricingEngine;
    @Autowired private UserRepository userRepository;

    @GetMapping("/{id}/quote")
    public Object getQuote(@PathVariable Long id,
                           @RequestParam String seatClass,
                           @RequestParam int numberOfSeats,
                           Authentication authentication) {
        Flight flight = flightRepository.findById(id).orElse(null);
        if (flight == null) return "Flight not found";

        User user = userRepository.findByEmail(authentication.getName());
        double finalPrice = pricingEngine.calculateFinalPrice(
                flight, seatClass, numberOfSeats, user.getLoyaltyTier(), java.time.LocalDateTime.now()
        );

        Map<String, Object> quote = new LinkedHashMap<>();
        quote.put("totalPrice", Math.round(finalPrice * 100.0) / 100.0);
        quote.put("pricePerSeat", Math.round((finalPrice / numberOfSeats) * 100.0) / 100.0);
        return quote;
    }



    @PostMapping
    public Object createFlight(@RequestBody Flight flight) {
        if (flight.getAircraft() != null) {
            Aircraft aircraft = aircraftRepository.findById(flight.getAircraft().getId()).orElse(null);
            if (aircraft != null) {
                List<Flight> existingFlights = flightRepository.findAll().stream()
                        .filter(f -> f.getAircraft() != null && f.getAircraft().getId().equals(aircraft.getId()))
                        .toList();

                for (Flight other : existingFlights) {
                    boolean overlap = flight.getDepartureTime().isBefore(other.getArrivalTime())
                            && other.getDepartureTime().isBefore(flight.getArrivalTime());
                    if (overlap) {
                        return "Conflict: Aircraft " + aircraft.getModel() + " is already scheduled for "
                                + other.getSource() + " → " + other.getDestination()
                                + " (" + other.getDepartureTime() + " to " + other.getArrivalTime() + ").";
                    }
                }

                flight.setAvailableEconomySeats(aircraft.getEconomySeats());
                flight.setAvailableBusinessSeats(aircraft.getBusinessSeats());
                flight.setAvailableFirstClassSeats(aircraft.getFirstClassSeats());
            }
        }
        return flightRepository.save(flight);
    }


    @GetMapping
    public List<Flight> getAllFlights() {
        return flightRepository.findAll();
    }


    @GetMapping("/{id}")
    public Flight getFlightById(@PathVariable Long id) {
        return flightRepository.findById(id).orElse(null);
    }


    @PutMapping("/{id}")
    public Flight updateFlightStatus(
            @PathVariable Long id,
            @RequestBody Flight updatedFlight) {

        Flight flight = flightRepository
                .findById(id)
                .orElse(null);

        if (flight == null) {
            return null;
        }

        flight.setStatus(updatedFlight.getStatus());
        flight.setDepartureTime(updatedFlight.getDepartureTime());
        flight.setArrivalTime(updatedFlight.getArrivalTime());
        flight.setBasePrice(updatedFlight.getBasePrice());

        Flight saved = flightRepository.save(flight);


        // Notify passengers when flight is delayed or cancelled
        if ("DELAYED".equals(saved.getStatus()) ||
                "CANCELLED".equals(saved.getStatus())) {

            notificationService.notifyAffectedPassengers(
                    saved.getId(),
                    saved.getStatus()
            );
            socketServer.broadcast("FLIGHT UPDATE: " + saved.getSource() + " → " + saved.getDestination()
                    + " is now " + saved.getStatus() + ".");

        }

        return saved;
    }


    @DeleteMapping("/{id}")
    public String deleteFlight(@PathVariable Long id) {

        flightRepository.deleteById(id);

        return "Flight deleted successfully";
    }
}