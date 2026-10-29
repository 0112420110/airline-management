package com.airline.airline_management.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "flight_id")
    private Flight flight;

    private String seatClass;       // "ECONOMY", "BUSINESS", "FIRST_CLASS"
    private int numberOfSeats;
    private double totalPrice;
    private String status;          // "CONFIRMED", "CANCELLED"
    private LocalDateTime bookingDate;
}