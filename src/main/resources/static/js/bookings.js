// Requires auth.js loaded first (provides `token`, `formatDate`, `decodeRole`)

const role = decodeRole(token);
const isAdmin = role === "ADMIN";

if (isAdmin) {
    document.getElementById("pageHeading").innerText = "All Bookings (Admin View)";
}

loadBookings();

async function loadBookings() {
    const statusDiv = document.getElementById("status");
    const listDiv = document.getElementById("bookingList");

    const endpoint = isAdmin ? "/api/bookings" : "/api/bookings/my";

    try {
        const response = await fetch(endpoint, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.status === 401 || response.status === 403) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Session expired. Redirecting to login...";
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            setTimeout(() => window.location.href = "login.html", 1500);
            return;
        }

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load bookings (status " + response.status + ").";
            return;
        }

        const bookings = await response.json();

        if (bookings.length === 0) {
            statusDiv.innerText = isAdmin ? "No bookings have been made yet." : "You haven't booked any flights yet.";
            listDiv.innerHTML = "";
            return;
        }

        statusDiv.innerText = "";
        window._bookingsCache = bookings;
        listDiv.innerHTML = bookings.map(b => `
            <div class="booking-card">
                <div>
                    <div class="booking-route">${b.flight.source} <span class="arrow">&#9992;</span> ${b.flight.destination}</div>
                    <div class="booking-meta">
                        ${formatDate(b.flight.departureTime)} &middot; ${b.seatClass.replace("_"," ")} &middot; ${b.numberOfSeats} seat(s)
                        ${isAdmin ? ` &middot; ${b.user.name} (${b.user.email})` : ""}
                    </div>
                    <div style="margin-top:6px;"><span class="status-pill status-${b.status}">${b.status.replace("_"," ")}</span></div>
                </div>
                <div class="booking-price">$${b.totalPrice.toFixed(2)}</div>
                <div>
                    ${b.status === "CONFIRMED"
                        ? `<button class="cancel-btn" onclick="cancelBooking(${b.id})">Cancel</button>`
                        : ""}
                    ${(b.status === "PENDING" || b.status === "PAYMENT_FAILED") && !isAdmin
                        ? `<button class="cancel-btn" style="border-color:#F0A500; color:#a25c00;" onclick="openRetryModal(${b.id})">Retry Payment</button>`
                        : ""}
                </div>
            </div>
        `).join("");
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}

async function cancelBooking(bookingId) {
    const confirmMsg = isAdmin
        ? "Cancel this passenger's booking? Seats will be released back to the flight."
        : "Cancel this booking? Refund amount depends on how close to departure this is.";
    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch("/api/bookings/" + bookingId, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });

        const text = await response.text();
        if (response.ok) {
            alert(text);
            loadBookings();
        } else {
            alert(text || "Could not cancel booking (status " + response.status + ").");
        }
    } catch (error) {
        alert("Could not connect to server.");
        console.error(error);
    }
}

let currentRetryBookingId = null;

function openRetryModal(bookingId) {
    currentRetryBookingId = bookingId;
    const method = prompt("Retry payment — choose method: CREDIT_CARD, WALLET, or NET_BANKING", "CREDIT_CARD");
    if (!method) return;
    const ref = prompt("Enter a payment reference (any value works — this is simulated). Use \"0000\" to force a failure.", "4111");
    if (!ref) return;

    retryPayment(bookingId, method.toUpperCase(), ref);
}

async function retryPayment(bookingId, method, ref) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}/retry-payment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ paymentMethod: method, paymentRef: ref })
        });

        const resultText = await response.text();
        const isJson = resultText.trim().startsWith("{");

        alert(isJson ? "Payment successful! Booking confirmed." : resultText);
        loadBookings();
    } catch (error) {
        alert("Could not connect to server.");
        console.error(error);
    }
}