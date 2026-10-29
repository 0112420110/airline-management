package com.airline.airline_management.pricing;

import com.airline.airline_management.model.Flight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PricingEngine {

    // Spring automatically collects EVERY bean implementing PricingStrategy into this list.
    // Add a new @Component implementing PricingStrategy anywhere, and it's included
    // automatically — no changes needed here. This is the actual Strategy pattern payoff.
    @Autowired
    private List<PricingStrategy> strategies;

    public double getSeatClassMultiplier(String seatClass) {
        return switch (seatClass) {
            case "ECONOMY" -> 1.0;
            case "BUSINESS" -> 2.2;
            case "FIRST_CLASS" -> 3.5;
            default -> 1.0;
        };
    }

    public double getLoyaltyDiscount(String tier) {
        return switch (tier != null ? tier : "SILVER") {
            case "GOLD" -> 0.05;
            case "PLATINUM" -> 0.10;
            default -> 0.0;
        };
    }

    public double calculateFinalPrice(Flight flight, String seatClass, int numberOfSeats, String loyaltyTier, LocalDateTime bookingTime) {
        double rawPrice = flight.getBasePrice() * getSeatClassMultiplier(seatClass) * numberOfSeats;

        double dynamicPrice = rawPrice;
        for (PricingStrategy strategy : strategies) {
            dynamicPrice *= strategy.getAdjustmentFactor(flight, bookingTime);
        }

        return dynamicPrice * (1 - getLoyaltyDiscount(loyaltyTier));
    }
}