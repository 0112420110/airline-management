package com.airline.airline_management.pricing;

import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.model.Flight;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class DemandBasedPricingStrategy implements PricingStrategy {
    @Override
    public double getAdjustmentFactor(Flight flight, LocalDateTime bookingTime) {
        Aircraft aircraft = flight.getAircraft();
        if (aircraft == null || aircraft.getTotalSeats() == 0) return 1.0;

        int availableSeats = flight.getAvailableEconomySeats() + flight.getAvailableBusinessSeats() + flight.getAvailableFirstClassSeats();
        double occupancyPercent = 100.0 * (aircraft.getTotalSeats() - availableSeats) / aircraft.getTotalSeats();

        if (occupancyPercent >= 90) return 1.30;
        if (occupancyPercent >= 75) return 1.15;
        if (occupancyPercent >= 50) return 1.05;
        return 1.0;
    }
}