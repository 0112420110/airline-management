# Airline Management System

A full-stack airline management web application built with **Java, Spring Boot and MySQL**. It lets customers search flights and book seats, and gives administrators tools to manage flights, aircraft, crew and reports.

## Features

**Customers**
- Register and log in (JWT-based authentication, passwords hashed with BCrypt)
- Browse flights and get a price quote before booking
- Book seats in Economy, Business or First Class
- View and cancel their own bookings, retry failed payments
- Loyalty tiers (Silver, Gold, Platinum) with discounts, based on miles
- AI assistant chat widget powered by the Gemini API

**Administrators**
- Create, update and delete flights and aircraft
- Manage crew and assign crew to flights
- View all bookings and payments
- Revenue and seat-occupancy reports

**Technical highlights**
- **Dynamic pricing with the Strategy pattern:** `DemandBasedPricingStrategy` and `EarlyBirdPricingStrategy` implement a common `PricingStrategy` interface. `PricingEngine` collects every strategy automatically, so a new pricing rule only needs a new class.
- **Role-based access control:** Spring Security restricts `/api/admin/**`, crew, and management endpoints to the `ADMIN` role.
- **TCP socket server** (`java.net.ServerSocket`, one thread per client) that broadcasts live flight-status updates on port `9090`.
- **REST API** with controllers, services, repositories, DTOs and JPA entities.
- Simple HTML/CSS/JavaScript frontend served from Spring Boot's `static` folder.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 4.1, Spring Web MVC, Spring Data JPA, Spring Security |
| Auth | JSON Web Tokens (jjwt 0.12.6), BCrypt |
| Database | MySQL |
| Frontend | HTML, CSS, JavaScript |
| Build | Maven (wrapper included) |
| Other | Lombok, Gemini API |

## Project Structure

```
src/main/java/com/airline/airline_management/
├── config/        # Security, JWT filter and utilities
├── controller/    # REST controllers
├── dto/           # Request objects
├── model/         # JPA entities (User, Flight, Aircraft, Booking, Payment, Crew, CrewAssignment)
├── pricing/       # Pricing strategies and PricingEngine
├── repository/    # Spring Data JPA repositories
└── service/       # Payment, notification, Gemini and socket services
src/main/resources/static/   # Frontend pages, CSS and JavaScript
```

## Getting Started

### Prerequisites
- Java 17 or later
- MySQL running on `localhost:3306`

### 1. Create the database
```sql
CREATE DATABASE airline_db;
```
Tables are created automatically on first run (`spring.jpa.hibernate.ddl-auto=update`).

### 2. Check the database settings
Open `src/main/resources/application.properties` and set your MySQL username and password if they differ from the defaults.

### 3. Set the Gemini API key (optional)
The AI assistant needs a free API key from Google AI Studio. Set it as an environment variable. Never write the key into the code.

Windows (Command Prompt):
```
set GEMINI_API_KEY=your_key_here
```
Linux / macOS:
```bash
export GEMINI_API_KEY=your_key_here
```
The rest of the app works without the key.

### 4. Run
```bash
./mvnw spring-boot:run
```
On Windows use `mvnw.cmd spring-boot:run`. Then open <http://localhost:8080>.

## API Overview

| Area | Endpoints | Access |
|------|-----------|--------|
| Auth | `POST /api/auth/login` | Public |
| Users | `POST /api/users` (register), `GET /api/users/me`, `GET /api/users` | Public / user / admin |
| Flights | `GET /api/flights`, `GET /api/flights/{id}/quote`, `POST/PUT/DELETE /api/flights` | User / admin for changes |
| Aircraft | `GET/POST/PUT/DELETE /api/aircraft` | Admin for changes |
| Bookings | `POST /api/bookings`, `GET /api/bookings/my`, `POST /api/bookings/{id}/retry-payment`, `DELETE /api/bookings/{id}` | User |
| Payments | `GET /api/payments/my`, `GET /api/payments` | User / admin |
| Crew | `/api/crew`, `/api/crew-assignments` | Admin |
| Reports | `GET /api/admin/reports/revenue`, `/occupancy` | Admin |
| Assistant | `POST /api/assistant/chat` | User |

## What I Learned

- Designing a layered Spring Boot application (controller, service, repository)
- Securing a REST API with JWT and role-based access
- Applying the Strategy design pattern to make business rules extendable
- Socket programming and multithreading in Java
- Keeping secrets out of source code using environment variables


## Contact

- **GitHub:** [0112420110](https://github.com/0112420110)
- **Email:** jnyemshourin@gmail.com
