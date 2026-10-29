package com.airline.airline_management.controller;

import com.airline.airline_management.model.*;
import com.airline.airline_management.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/reports")
public class ReportController {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private FlightRepository flightRepository;

    @GetMapping("/revenue")
    public Map<String, Object> getRevenueSummary() {
        List<Payment> payments = paymentRepository.findAll();

        double totalRevenue = payments.stream()
                .filter(p -> "SUCCESS".equals(p.getStatus()) && !"REFUND".equals(p.getMethod()))
                .mapToDouble(Payment::getAmount)
                .sum();

        double totalRefunded = payments.stream()
                .filter(p -> "REFUND".equals(p.getMethod()))
                .mapToDouble(Payment::getAmount)
                .sum();

        long successCount = payments.stream()
                .filter(p -> "SUCCESS".equals(p.getStatus()) && !"REFUND".equals(p.getMethod()))
                .count();
        long failedCount = payments.stream().filter(p -> "FAILED".equals(p.getStatus())).count();

        Map<String, Double> byMethod = payments.stream()
                .filter(p -> "SUCCESS".equals(p.getStatus()) && !"REFUND".equals(p.getMethod()))
                .collect(Collectors.groupingBy(Payment::getMethod, Collectors.summingDouble(Payment::getAmount)));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRevenue", totalRevenue);
        summary.put("totalRefunded", totalRefunded);
        summary.put("netRevenue", totalRevenue - totalRefunded);
        summary.put("successfulPayments", successCount);
        summary.put("failedPayments", failedCount);
        summary.put("revenueByMethod", byMethod);

        return summary;
    }

    @GetMapping("/occupancy")
    public List<Map<String, Object>> getSeatOccupancy() {
        List<Flight> flights = flightRepository.findAll();

        return flights.stream().map(f -> {
            Aircraft aircraft = f.getAircraft();
            int totalSeats = aircraft != null ? aircraft.getTotalSeats() : 0;
            int availableSeats = f.getAvailableEconomySeats() + f.getAvailableBusinessSeats() + f.getAvailableFirstClassSeats();
            int bookedSeats = totalSeats - availableSeats;
            double occupancyPercent = totalSeats > 0 ? (bookedSeats * 100.0 / totalSeats) : 0;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("flightId", f.getId());
            row.put("source", f.getSource());
            row.put("destination", f.getDestination());
            row.put("departureTime", f.getDepartureTime());
            row.put("status", f.getStatus());
            row.put("totalSeats", totalSeats);
            row.put("bookedSeats", bookedSeats);
            row.put("occupancyPercent", Math.round(occupancyPercent * 10.0) / 10.0);
            return row;
        }).collect(Collectors.toList());
    }
}