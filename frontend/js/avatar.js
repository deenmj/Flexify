// frontend/js/avatar.js
const BACKEND_URL = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : "http://localhost:5000";

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}

function resolveProfilePicUrl(pic) {
  if (!pic) return "assets/Default.png";
  if (typeof pic === "string" && pic.startsWith("/")) return BACKEND_URL + pic;
  return pic;
}

function refreshAvatars() {
  const user = getStoredUser();
  const src = resolveProfilePicUrl(user?.profilePic || user?.avatar || null);

  // IMG avatars
  document.querySelectorAll("img.user-avatar").forEach(img => {
    try { img.src = src; } catch(e) {}
  });

  // Background avatars (divs)
  document.querySelectorAll(".user-avatar-bg").forEach(el => {
    try { el.style.backgroundImage = `url("${src}")`; el.dataset.src = src; } catch(e) {}
  });
}

async function uploadAvatarFile(file) {
  const fd = new FormData();
  fd.append("avatar", file);
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BACKEND_URL}/api/auth/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.profilePic;
}

function setupAvatarUpload(selector, options = {}) {
  const input = document.querySelector(selector);
  if (!input) return console.warn("setupAvatarUpload: selector not found", selector);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("File too large (max 5MB).");

    try {
      const profilePic = await uploadAvatarFile(file);
      let user = getStoredUser() || {};
      user.profilePic = profilePic;
      user.avatar = profilePic;
      localStorage.setItem("user", JSON.stringify(user));
      refreshAvatars();
      if (options.onSuccess) options.onSuccess(resolveProfilePicUrl(profilePic));
      alert("Profile updated!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert(err.message || "Upload error");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // make functions available globally
  window.refreshAvatars = refreshAvatars;
  window.setupAvatarUpload = setupAvatarUpload;
  refreshAvatars();
});
