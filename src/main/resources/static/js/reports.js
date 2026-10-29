// Requires auth.js loaded first (provides `token`, `decodeRole`, `formatDate`)

const myRole = decodeRole(token);
if (myRole !== "ADMIN") {
    alert("Only admins can access Reports.");
    window.location.href = "dashboard.html";
}

loadRevenueSummary();
loadOccupancy();

async function loadRevenueSummary() {
    const statusDiv = document.getElementById("revenueStatus");
    const statGrid = document.getElementById("statGrid");
    const methodPanel = document.getElementById("methodPanel");
    const methodDiv = document.getElementById("methodBreakdown");

    try {
        const response = await fetch("/api/admin/reports/revenue", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load revenue summary (status " + response.status + ").";
            return;
        }

        const data = await response.json();
        statusDiv.innerText = "";

        statGrid.innerHTML = `
            <div class="stat-card">
                <div class="label">Total Revenue</div>
                <div class="value">$${data.totalRevenue.toFixed(2)}</div>
            </div>
            <div class="stat-card negative">
                <div class="label">Total Refunded</div>
                <div class="value">$${data.totalRefunded.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Net Revenue</div>
                <div class="value">$${data.netRevenue.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Successful / Failed Payments</div>
                <div class="value" style="font-size:18px;">${data.successfulPayments} / ${data.failedPayments}</div>
            </div>
        `;
        statGrid.style.display = "grid";

        const methods = Object.keys(data.revenueByMethod || {});
        if (methods.length > 0) {
            methodDiv.innerHTML = methods.map(m => `
                <div class="method-row">
                    <span>${m.replace("_", " ")}</span>
                    <strong>$${data.revenueByMethod[m].toFixed(2)}</strong>
                </div>
            `).join("");
            methodPanel.style.display = "block";
        }
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

async function loadOccupancy() {
    const statusDiv = document.getElementById("occupancyStatus");
    const listDiv = document.getElementById("occupancyList");

    try {
        const response = await fetch("/api/admin/reports/occupancy", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load occupancy data (status " + response.status + ").";
            return;
        }

        const flights = await response.json();

        if (flights.length === 0) {
            statusDiv.innerText = "No flights to report on yet.";
            return;
        }

        statusDiv.innerText = "";
        listDiv.innerHTML = flights.map(f => {
            const pct = f.occupancyPercent;
            const barClass = pct >= 85 ? "high" : pct >= 50 ? "mid" : "";
            return `
                <div style="padding:14px 0; border-bottom:1px solid #eef1f5;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div class="route" style="font-size:14px;">${f.source} <span class="arrow">&#9992;</span> ${f.destination}</div>
                            <div class="flight-meta">${formatDate(f.departureTime)} &middot; ${f.status}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-family:'Space Grotesk',sans-serif; font-weight:700;">${f.bookedSeats} / ${f.totalSeats}</div>
                            <div style="font-size:12px; color:var(--slate);">${pct}% full</div>
                        </div>
                    </div>
                    <div class="occupancy-bar-track">
                        <div class="occupancy-bar-fill ${barClass}" style="width:${Math.min(100, pct)}%;"></div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}