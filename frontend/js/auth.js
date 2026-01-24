// frontend/js/auth.js
// FINAL WORKING VERSION – Fixes saveUserData(), login, signup, avatar loading
// Uses API_BASE_URL global if available

if (typeof API_BASE_URL === "undefined") {
  var API_BASE_URL = "http://localhost:5000/api";
}

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

// ------------------------------
// 🔥 UNIVERSAL FIXED saveUserData()
// ------------------------------
function saveUserData(data) {
  const token = data.token;
  const user = data.user || data;

  if (!token || !user) {
    console.error("Invalid user data:", data);
    return;
  }

  // Normalize user object
  const normalizedUser = {
    id: user.id || user._id || null,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "user",
    verified: user.verified || false,

    // THE FIX:
    // Primary image key = profilePic  
    profilePic: user.profilePic || "assets/Default.png",

    // Secondary/fallback
    avatar: user.profilePic || "assets/Default.png"
  };

  // save
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(normalizedUser));
}


// ------------------------------
// SIGNUP
// ------------------------------
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message || "Signup failed");

      saveUserData(data);
      window.location.href = "index.html";

    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}


// ------------------------------
// LOGIN
// ------------------------------
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message || "Login failed");

      saveUserData(data);

      const user = data.user;

      // role redirect
      if (user.role === "admin") return window.location.href = "admin.html";
      if (user.role === "owner") return window.location.href = "dashboard-R.html";
      if (user.role === "verifiedOwner") return window.location.href = "dashboard-R-V.html";

      return window.location.href = "index.html";

    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}
