package com.airline.airline_management.pricing;

import com.airline.airline_management.model.Flight;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class EarlyBirdPricingStrategy implements PricingStrategy {
    @Override
    public double getAdjustmentFactor(Flight flight, LocalDateTime bookingTime) {
        long daysUntilDeparture = Duration.between(bookingTime, flight.getDepartureTime()).toDays();

        if (daysUntilDeparture >= 30) return 0.85; // 15% early-bird discount
        if (daysUntilDeparture >= 15) return 0.95; // 5% discount
        if (daysUntilDeparture <= 2) return 1.20;  // 20% last-minute premium
        if (daysUntilDeparture <= 7) return 1.10;  // 10% premium
        return 1.0;
    }
}