// =======================================
// GLOBAL CONFIG
// =======================================

// =======================================
// HELPER FUNCTIONS
// =======================================

// frontend/js/app.js
const API_BASE_URL = "http://localhost:5000/api";

function saveUser(user, token) {
  if (!user) return;

  const normalized = {
    id: user.id || user._id || null,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "user",
    verified: user.verified || false,
    profilePic: user.profilePic || user.avatar || "assets/Default.png",
    avatar: user.profilePic || user.avatar || "assets/Default.png"
  };

  localStorage.setItem("user", JSON.stringify(normalized));
  if (token) localStorage.setItem("token", token);

  try { if (typeof window.refreshAvatars === "function") window.refreshAvatars(); } catch (e) {}
}

function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch (e) { return null; }
}
function getToken() { return localStorage.getItem("token"); }
function logoutUser() { localStorage.removeItem("user"); localStorage.removeItem("token"); window.location.href = "auth.html"; }

async function checkAuthOnLoad() {
  const token = getToken();
  if (!token) return; // not logged in

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { logoutUser(); return; }
    const user = await res.json();
    saveUser(user, token);
  } catch (err) {
    console.error("Auth check failed", err);
    logoutUser();
  }
}

document.addEventListener("DOMContentLoaded", checkAuthOnLoad);


// =======================================
// UPDATE HEADER (Profile + Dashboard Links)
// =======================================

function updateUserHeader() {
  const user = getUser();
  const profileImg = document.getElementById("userProfileImg");
  const dropdown = document.getElementById("userDropdown");

  if (!profileImg || !dropdown) return; // navbar not on this page

  if (user) {
    profileImg.src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

    let dashboardLinkHTML = "";

    if (user.role === "admin") {
      dashboardLinkHTML = `<a href="admin.html" class="block px-4 py-2 hover:bg-gray-100">Admin Dashboard</a>`;
    }
    else if (user.role === "verifiedOwner") {
      dashboardLinkHTML = `<a href="dashboard-R-V.html" class="block px-4 py-2 hover:bg-gray-100">Verified Owner Dashboard</a>`;
    }
    else if (user.role === "owner") {
      dashboardLinkHTML = `<a href="dashboard-R.html" class="block px-4 py-2 hover:bg-gray-100">Owner Dashboard</a>`;
    }

    dropdown.innerHTML = `
      <a href="userprofile.html" class="block px-4 py-2 hover:bg-gray-100">My Profile</a>

      ${dashboardLinkHTML}

      <a href="listing.html" class="block px-4 py-2 hover:bg-gray-100">List Vehicle</a>

      <button onclick="logoutUser()" 
              class="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100">
        Logout
      </button>
    `;
  } else {
    // user not logged in
    dropdown.innerHTML = `
      <a href="auth.html" class="block px-4 py-2 hover:bg-gray-100">Login</a>
      <a href="auth.html" class="block px-4 py-2 hover:bg-gray-100">Signup</a>
    `;
  }
}

// =======================================
// CHECK AUTH ON PAGE LOAD
// =======================================

async function checkAuthOnLoad() {
  const token = getToken();
  if (!token) {
    updateUserHeader();
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      logoutUser();
      return;
    }

    const user = await res.json();

    saveUser(user, token);

    updateUserHeader(); // refresh navbar UI

  } catch (err) {
    console.error("Auth check failed:", err);
    logoutUser();
  }
}

document.addEventListener("DOMContentLoaded", checkAuthOnLoad);
