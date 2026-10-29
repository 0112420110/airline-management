package com.airline.airline_management.pricing;

import com.airline.airline_management.model.Flight;
import java.time.LocalDateTime;

public interface PricingStrategy {
    double getAdjustmentFactor(Flight flight, LocalDateTime bookingTime);
}