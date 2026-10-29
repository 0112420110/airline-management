package com.airline.airline_management.controller;

import com.airline.airline_management.dto.BookingRequest;
import com.airline.airline_management.model.*;
import com.airline.airline_management.repository.*;
import com.airline.airline_management.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.airline.airline_management.pricing.PricingEngine;


import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private FlightRepository flightRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private PaymentService paymentService;
    @Autowired private PricingEngine pricingEngine;

    @PostMapping
    public synchronized Object createBooking(@RequestBody BookingRequest request, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email);

        Flight flight = flightRepository.findById(request.getFlightId()).orElse(null);
        if (flight == null) return "Flight not found";

        int seatsLeft;
        switch (request.getSeatClass()) {
            case "ECONOMY" -> seatsLeft = flight.getAvailableEconomySeats();
            case "BUSINESS" -> seatsLeft = flight.getAvailableBusinessSeats();
            case "FIRST_CLASS" -> seatsLeft = flight.getAvailableFirstClassSeats();
            default -> { return "Invalid seat class"; }
        }

        if (seatsLeft < request.getNumberOfSeats()) {
            return "Not enough seats available in " + request.getSeatClass();
        }

        double finalPrice = pricingEngine.calculateFinalPrice(
                flight,
                request.getSeatClass(),
                request.getNumberOfSeats(),
                user.getLoyaltyTier(),
                LocalDateTime.now()
        );



        // Step 1: create the booking as PENDING — seats are NOT deducted yet
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFlight(flight);
        booking.setSeatClass(request.getSeatClass());
        booking.setNumberOfSeats(request.getNumberOfSeats());
        booking.setTotalPrice(finalPrice);
        booking.setStatus("PENDING");
        booking.setBookingDate(LocalDateTime.now());
        booking = bookingRepository.save(booking);

        // Step 2: attempt payment
        return attemptPayment(booking,
                request.getPaymentMethod(),
                request.getPaymentRef());
    }

    @PostMapping("/{id}/retry-payment")
    public synchronized Object retryPayment(@PathVariable Long id, @RequestBody BookingRequest request, Authentication authentication) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return "Booking not found";

        String email = authentication.getName();
        if (!booking.getUser().getEmail().equals(email)) {
            return "You can only retry your own bookings";
        }
        if (!"PENDING".equals(booking.getStatus()) && !"PAYMENT_FAILED".equals(booking.getStatus())) {
            return "This booking is not awaiting payment";
        }

        // Re-check seat availability at retry time, since it wasn't reserved earlier
        Flight flight = booking.getFlight();
        int seatsLeft = switch (booking.getSeatClass()) {
            case "ECONOMY" -> flight.getAvailableEconomySeats();
            case "BUSINESS" -> flight.getAvailableBusinessSeats();
            case "FIRST_CLASS" -> flight.getAvailableFirstClassSeats();
            default -> 0;
        };
        if (seatsLeft < booking.getNumberOfSeats()) {
            return "Seats are no longer available for this booking";
        }

        return attemptPayment(booking, request.getPaymentMethod(), request.getPaymentRef());
    }

    private Object attemptPayment(Booking booking, String method, String paymentRef) {
        boolean success = paymentService.simulatePayment(method, paymentRef);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setMethod(method);
        payment.setAmount(booking.getTotalPrice());
        payment.setStatus(success ? "SUCCESS" : "FAILED");
        payment.setTransactionDate(LocalDateTime.now());
        paymentRepository.save(payment);

        if (!success) {
            booking.setStatus("PAYMENT_FAILED");
            bookingRepository.save(booking);
            return "Payment failed. You can retry payment for booking #" + booking.getId();
        }

        // Payment succeeded — now actually deduct seats and confirm
        Flight flight = booking.getFlight();
        switch (booking.getSeatClass()) {
            case "ECONOMY" -> flight.setAvailableEconomySeats(flight.getAvailableEconomySeats() - booking.getNumberOfSeats());
            case "BUSINESS" -> flight.setAvailableBusinessSeats(flight.getAvailableBusinessSeats() - booking.getNumberOfSeats());
            case "FIRST_CLASS" -> flight.setAvailableFirstClassSeats(flight.getAvailableFirstClassSeats() - booking.getNumberOfSeats());
        }
        flightRepository.save(flight);

        booking.setStatus("CONFIRMED");
        Booking savedBooking = bookingRepository.save(booking);

        User user = booking.getUser();
        user.setTotalMiles(user.getTotalMiles() + (int) Math.round(booking.getTotalPrice()));
        if (user.getTotalMiles() >= 15000) {
            user.setLoyaltyTier("PLATINUM");
        } else if (user.getTotalMiles() >= 5000) {
            user.setLoyaltyTier("GOLD");
        } else {
            user.setLoyaltyTier("SILVER");
        }
        userRepository.save(user);

        return savedBooking;
    }

    @GetMapping("/my")
    public List<Booking> getMyBookings(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email);
        return bookingRepository.findByUser(user);
    }

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll(); // admin-only, restricted in SecurityConfig
    }

    @DeleteMapping("/{id}")
    public String cancelBooking(@PathVariable Long id, Authentication authentication) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return "Booking not found";

        String email = authentication.getName();
        boolean isOwner = booking.getUser().getEmail().equals(email);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isOwner && !isAdmin) {
            return "You can only cancel your own bookings";
        }
        if (!"CONFIRMED".equals(booking.getStatus())) {
            return "Only confirmed bookings can be cancelled";
        }

        // Release seats back to the flight
        Flight flight = booking.getFlight();
        switch (booking.getSeatClass()) {
            case "ECONOMY" -> flight.setAvailableEconomySeats(flight.getAvailableEconomySeats() + booking.getNumberOfSeats());
            case "BUSINESS" -> flight.setAvailableBusinessSeats(flight.getAvailableBusinessSeats() + booking.getNumberOfSeats());
            case "FIRST_CLASS" -> flight.setAvailableFirstClassSeats(flight.getAvailableFirstClassSeats() + booking.getNumberOfSeats());
        }
        flightRepository.save(flight);

        // Refund policy based on how close to departure the cancellation happens
        long hoursUntilDeparture = java.time.Duration.between(LocalDateTime.now(), flight.getDepartureTime()).toHours();
        double refundPercent;
        if (hoursUntilDeparture >= 168) {        // 7+ days
            refundPercent = 1.0;
        } else if (hoursUntilDeparture >= 48) {  // 2-7 days
            refundPercent = 0.5;
        } else {
            refundPercent = 0.0;
        }
        double refundAmount = booking.getTotalPrice() * refundPercent;

        Payment refund = new Payment();
        refund.setBooking(booking);
        refund.setMethod("REFUND");
        refund.setAmount(refundAmount);
        refund.setStatus("SUCCESS");
        refund.setTransactionDate(LocalDateTime.now());
        paymentRepository.save(refund);

        booking.setStatus("CANCELLED");
        bookingRepository.save(booking);

        return String.format("Booking cancelled. Refund: $%.2f (%.0f%% based on cancellation policy)",
                refundAmount, refundPercent * 100);
    }
}