document.addEventListener("DOMContentLoaded", loadOwnerDashboard);

async function loadOwnerDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return alert("Not logged in");

  try {
    const res = await fetch("http://localhost:5000/api/owner/my-dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    // inject values into dashboard-R.html
    document.getElementById("ownerName").innerText = data.user.name;
    document.getElementById("vehicleCount").innerText = data.stats.vehicleCount;
    document.getElementById("bookingCount").innerText = data.stats.bookingCount;
    document.getElementById("earningCount").innerText = data.stats.earningCount;

    // render vehicle list if exists
    const container = document.getElementById("myVehicles");
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
