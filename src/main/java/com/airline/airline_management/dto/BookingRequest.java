package com.airline.airline_management.dto;

import lombok.Data;

@Data
public class BookingRequest {
    private Long flightId;
    private String seatClass;
    private int numberOfSeats;
    private String paymentMethod;
    private String paymentRef;

}