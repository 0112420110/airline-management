// script.js

// API Configuration
const API_URL = {
    login: "/api/auth/login",
    users: "/api/users"
};

// ============ AUTH FUNCTIONS ============

// Login function
async function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const messageDiv = document.getElementById("message");

    if (!email || !password) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Please enter email and password.";
        return;
    }

    try {
        const response = await fetch(API_URL.login, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const resultText = await response.text();
        const looksLikeToken = resultText.split(".").length === 3 && resultText.startsWith("eyJ");

        if (looksLikeToken) {
            localStorage.setItem("token", resultText);
            localStorage.setItem("email", email);
            messageDiv.style.color = "#16a34a";
            messageDiv.innerText = "Login successful! Redirecting...";
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 700);
        } else {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = resultText;
        }
    } catch (error) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}

// Register function
async function registerUser() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    const messageDiv = document.getElementById("message");

    if (!name || !email || !password) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Please fill in all fields.";
        return;
    }

    try {
        const response = await fetch(API_URL.users, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role })
        });

        if (response.ok) {
            messageDiv.style.color = "#16a34a";
            messageDiv.innerText = "Account created! Redirecting to login...";
            setTimeout(() => { window.location.href = "login.html"; }, 900);
        } else {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = "Registration failed. Try a different email.";
        }
    } catch (error) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}

// Logout function
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "login.html";
}

// ============ DASHBOARD FUNCTIONS ============

// Load users for dashboard
async function loadUsers() {
    const token = localStorage.getItem("token");
    const statusDiv = document.getElementById("status");
     if (!statusDiv) return;

    try {
        const response = await fetch(API_URL.users, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.status === 401 || response.status === 403) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Session expired or invalid. Please log in again.";
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            setTimeout(() => window.location.href = "login.html", 1500);
            return;
        }

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load users (status " + response.status + ").";
            return;
        }

        const users = await response.json();
        statusDiv.innerText = "";

        const tableBody = document.getElementById("userTableBody");
        tableBody.innerHTML = "";
        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            `;
            tableBody.appendChild(row);
        });

        document.getElementById("userTable").style.display = "table";
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}

// Initialize dashboard
function initDashboard() {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");

    if (!token) {
        window.location.href = "login.html";
    } else {
        document.getElementById("welcomeEmail").innerText = email || "";
        loadUsers();
    }
}
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "login.html";
}

// ============ SEARCH FUNCTIONS ============

// Search flights (redirects to login if not logged in)
function searchFlights() {
    const token = localStorage.getItem("token");
    if (token) {
        // If logged in, redirect to dashboard or search results
        window.location.href = "dashboard.html";
    } else {
        window.location.href = "login.html";
    }
}
// Add these functions to your existing script.js file

// ============ FLIGHTS PAGE FUNCTIONS ============

// Decode JWT token to get user role
function decodeRole(jwt) {
    try {
        const payload = jwt.split(".")[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.role || null;
    } catch (e) {
        return null;
    }
}

// Toggle add flight form visibility
function toggleAddForm() {
    const panel = document.getElementById("addFlightPanel");
    if (panel) {
        panel.style.display = panel.style.display === "block" ? "none" : "block";
    }
}

// Load aircraft options for dropdown
async function loadAircraftOptions() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("/api/aircraft", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!response.ok) return;
        const aircraftList = await response.json();
        const select = document.getElementById("aircraftId");
        if (select) {
            select.innerHTML = aircraftList.map(a =>
                `<option value="${a.id}">${a.model} (ID ${a.id})</option>`
            ).join("");
        }
    } catch (e) {
        console.error("Error loading aircraft:", e);
    }
}

// Load all flights
async function loadFlights() {
    const token = localStorage.getItem("token");
    const statusDiv = document.getElementById("status");
    const listDiv = document.getElementById("flightList");

    if (!statusDiv || !listDiv) return;

    try {
        const response = await fetch("/api/flights", {
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
            statusDiv.innerText = "Failed to load flights (status " + response.status + ").";
            return;
        }

        const flights = await response.json();

        if (flights.length === 0) {
            statusDiv.innerText = "No flights available yet.";
            return;
        }

        statusDiv.innerText = "";
        listDiv.innerHTML = flights.map(f => `
            <div class="flight-row">
                <div>
                    <div class="route">${f.source} <span class="arrow">&#9992;</span> ${f.destination}</div>
                    <div class="flight-meta">${formatDate(f.departureTime)} &rarr; ${formatDate(f.arrivalTime)} &middot; ${f.aircraft ? f.aircraft.model : "Aircraft TBD"}</div>
                </div>
                <div class="price">$${f.basePrice}</div>
                <div><span class="status-badge status-${f.status}">${f.status}</span></div>
                <div></div>
            </div>
        `).join("");
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}

// Format date for display
function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Create a new flight
async function createFlight() {
    const token = localStorage.getItem("token");
    const messageDiv = document.getElementById("formMessage");
    const source = document.getElementById("source").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const departureTime = document.getElementById("departureTime").value;
    const arrivalTime = document.getElementById("arrivalTime").value;
    const basePrice = document.getElementById("basePrice").value;
    const aircraftId = document.getElementById("aircraftId").value;

    if (!source || !destination || !departureTime || !arrivalTime || !basePrice || !aircraftId) {
        if (messageDiv) {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = "Please fill in all fields.";
        }
        return;
    }

    try {
        const response = await fetch("/api/flights", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                source,
                destination,
                departureTime,
                arrivalTime,
                basePrice: parseFloat(basePrice),
                status: "SCHEDULED",
                aircraft: { id: parseInt(aircraftId) }
            })
        });

        if (response.ok) {
            if (messageDiv) {
                messageDiv.style.color = "#16a34a";
                messageDiv.innerText = "Flight added successfully!";
            }
            loadFlights();
            setTimeout(() => {
                toggleAddForm();
                if (messageDiv) messageDiv.innerText = "";
            }, 1000);
        } else if (response.status === 403) {
            if (messageDiv) {
                messageDiv.style.color = "#dc2626";
                messageDiv.innerText = "Only admins can add flights.";
            }
        } else {
            if (messageDiv) {
                messageDiv.style.color = "#dc2626";
                messageDiv.innerText = "Failed to add flight (status " + response.status + ").";
            }
        }
    } catch (error) {
        if (messageDiv) {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = "Could not connect to server.";
        }
        console.error(error);
    }
}

// Initialize flights page
function initFlightsPage() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const role = decodeRole(token);

    // Show add button only for admins
    const addBtn = document.getElementById("addToggleBtn");
    if (role === "ADMIN" && addBtn) {
        addBtn.style.display = "inline-block";
        loadAircraftOptions();
    }

    // Load flights
    loadFlights();
}