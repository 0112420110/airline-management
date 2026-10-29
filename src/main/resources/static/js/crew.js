// Requires auth.js loaded first (provides `token`, `decodeRole`, `formatDate`)

const myRole = decodeRole(token);
if (myRole !== "ADMIN") {
    alert("Only admins can access Crew Scheduling.");
    window.location.href = "dashboard.html";
}

let crewCache = [];
let flightsCache = [];

loadCrew();
loadFlightsDropdown();

// ---------- Crew list ----------

async function loadCrew() {
    const statusDiv = document.getElementById("crewStatus");
    const listDiv = document.getElementById("crewList");

    try {
        const response = await fetch("/api/crew", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load crew (status " + response.status + ").";
            return;
        }

        crewCache = await response.json();

        if (crewCache.length === 0) {
            statusDiv.innerText = "No crew members added yet.";
            listDiv.innerHTML = "";
        } else {
            statusDiv.innerText = "";
            listDiv.innerHTML = crewCache.map(c => `
                <div class="flight-row" style="grid-template-columns: 1fr 140px 90px;">
                    <div>
                        <div class="route" style="font-size:14px;">${c.name}</div>
                    </div>
                    <div><span class="status-badge status-SCHEDULED">${c.role.replace("_", " ")}</span></div>
                    <div><button class="cancel-btn" onclick="deleteCrew(${c.id})">Remove</button></div>
                </div>
            `).join("");
        }

        populateCrewDropdown();
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

async function addCrew() {
    const messageDiv = document.getElementById("crewFormMessage");
    const name = document.getElementById("crewName").value.trim();
    const role = document.getElementById("crewRole").value;

    if (!name) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Enter a name.";
        return;
    }

    try {
        const response = await fetch("/api/crew", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ name, role })
        });

        if (response.ok) {
            messageDiv.style.color = "#16a34a";
            messageDiv.innerText = "Crew member added!";
            document.getElementById("crewName").value = "";
            loadCrew();
            setTimeout(() => messageDiv.innerText = "", 1500);
        } else {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = "Failed to add crew member.";
        }
    } catch (error) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

async function deleteCrew(id) {
    if (!confirm("Remove this crew member? Existing assignments may become invalid.")) return;

    try {
        const response = await fetch("/api/crew/" + id, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });
        if (response.ok) {
            loadCrew();
        } else {
            alert("Could not remove crew member (status " + response.status + ").");
        }
    } catch (error) {
        alert("Could not connect to server.");
        console.error(error);
    }
}

// ---------- Flight dropdown + assignments ----------

async function loadFlightsDropdown() {
    try {
        const response = await fetch("/api/flights", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!response.ok) return;
        flightsCache = await response.json();

        const select = document.getElementById("flightSelect");
        select.innerHTML = flightsCache.map(f =>
            `<option value="${f.id}">${f.source} → ${f.destination} (${formatDate(f.departureTime)})</option>`
        ).join("");

        if (flightsCache.length > 0) {
            loadAssignmentsForFlight();
        }
    } catch (error) {
        console.error(error);
    }
}

function populateCrewDropdown() {
    const select = document.getElementById("assignCrewSelect");
    select.innerHTML = crewCache.map(c =>
        `<option value="${c.id}">${c.name} (${c.role.replace("_", " ")})</option>`
    ).join("");
}

async function loadAssignmentsForFlight() {
    const flightId = document.getElementById("flightSelect").value;
    const statusDiv = document.getElementById("assignmentStatus");
    const listDiv = document.getElementById("assignmentList");
    if (!flightId) return;

    try {
        const response = await fetch(`/api/crew-assignments/flight/${flightId}`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load assignments.";
            return;
        }

        const assignments = await response.json();

        if (assignments.length === 0) {
            statusDiv.innerText = "No crew assigned to this flight yet.";
            listDiv.innerHTML = "";
        } else {
            statusDiv.innerText = "";
            listDiv.innerHTML = assignments.map(a => `
                <div class="flight-row" style="grid-template-columns: 1fr 140px 90px;">
                    <div>
                        <div class="route" style="font-size:14px;">${a.crew.name}</div>
                    </div>
                    <div><span class="status-badge status-SCHEDULED">${a.crew.role.replace("_", " ")}</span></div>
                    <div><button class="cancel-btn" onclick="removeAssignment(${a.id})">Unassign</button></div>
                </div>
            `).join("");
        }
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

async function assignCrew() {
    const messageDiv = document.getElementById("assignMessage");
    const flightId = document.getElementById("flightSelect").value;
    const crewId = document.getElementById("assignCrewSelect").value;

    if (!flightId || !crewId) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Select both a flight and a crew member.";
        return;
    }

    try {
        const response = await fetch("/api/crew-assignments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ crewId: parseInt(crewId), flightId: parseInt(flightId) })
        });

        const resultText = await response.text();
        const isJson = resultText.trim().startsWith("{");

        if (response.ok && isJson) {
            messageDiv.style.color = "#16a34a";
            messageDiv.innerText = "Crew assigned successfully!";
            loadAssignmentsForFlight();
        } else {
            // This is where a scheduling CONFLICT message shows up
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = resultText;
        }
    } catch (error) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

async function removeAssignment(id) {
    if (!confirm("Unassign this crew member from the flight?")) return;

    try {
        const response = await fetch("/api/crew-assignments/" + id, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });
        if (response.ok) {
            loadAssignmentsForFlight();
        } else {
            alert("Could not unassign (status " + response.status + ").");
        }
    } catch (error) {
        alert("Could not connect to server.");
        console.error(error);
    }
}