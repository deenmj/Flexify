document.addEventListener("DOMContentLoaded", loadVerifiedDashboard);

async function loadVerifiedDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return alert("Not logged in");

  try {
    const res = await fetch("http://localhost:5000/api/owner/my-dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    // inject values into dashboard-R-V.html
    document.getElementById("vOwnerName").innerText = data.user.name;
    document.getElementById("vVehicleCount").innerText = data.stats.vehicleCount;
    document.getElementById("vBookingCount").innerText = data.stats.bookingCount;
    document.getElementById("vEarningCount").innerText = data.stats.earningCount;

    // vehicle list
    const container = document.getElementById("vMyVehicles");
    if (container) {
      container.innerHTML = data.vehicles
        .map(
          (v) => `
        <div class="p-4 rounded-lg shadow bg-white">
          <h3 class="font-semibold">${v.title}</h3>
          <p>${v.brand} - ${v.model}</p>
        </div>`
        )
        .join("");
    }
  } catch (err) {
    console.error(err);
  }
}
