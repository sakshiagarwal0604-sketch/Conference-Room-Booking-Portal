// auth.js - central auth utilities (frontend-only)
// Hardcoded users (frontend demo)
// Replace or extend as needed.
const users = [
  { username: "staff1", password: "staff123", role: "staff" },
  { username: "admin1", password: "admin123", role: "admin" },
  { username: "owner", password: "owner123", role: "owner" }
];

// --- Login (used by login.html and nav modal)
function login() {
  const usernameEl = document.getElementById("username") || document.getElementById("loginUser");
  const passwordEl = document.getElementById("password") || document.getElementById("loginPass");
  const roleEl = document.getElementById("role") || document.getElementById("loginRole");

  if (!usernameEl || !passwordEl || !roleEl) {
    console.error("login(): missing form elements");
    return;
  }

  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();
  const role = roleEl.value;

  const user = users.find(u => u.username === username && u.password === password && u.role === role);

  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
    updateNavForUser();

    // Redirect based on role
    if (role === "staff") window.location.href = "booking.html";
    else if (role === "admin") window.location.href = "admin.html";
    else if (role === "owner") window.location.href = "admin.html"; // owner uses admin.html (owner view)
  } else {
    // show error UI if present
    const err = document.getElementById("login-error") || document.getElementById("loginError");
    if (err) err.style.display = "block";
    else alert("Invalid credentials");
  }
}

// --- Return current user object or null
function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {
    return null;
  }
}

// --- Check auth and optionally role. Returns true if OK, else redirects to login.html
// requiredRole may be "staff" | "admin" | "owner" or undefined (any logged user)
function checkAuth(requiredRole) {
  const user = getCurrentUser();
  if (!user) {
    // not logged in
    alert("Access denied. Please login.");
    window.location.href = "login.html";
    return false;
  }
  if (requiredRole && user.role !== requiredRole) {
    alert("You do not have permission to view this page.");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// --- Logout
function logout() {
  sessionStorage.removeItem("user");
  // keep user on same page, but show they are not logged in; many pages redirect to login
  // best UX: go to home or login
  window.location.href = "login.html";
}

// --- Update navbar (show role tag / logout button) if elements present
function updateNavForUser() {
  const roleTag = document.getElementById("roleTag");
  const logoutBtn = document.getElementById("logoutBtn");

  const user = getCurrentUser();
  if (user) {
    if (roleTag) roleTag.innerText = "Role: " + user.role.toUpperCase() + (user.username ? (" (" + user.username + ")") : "");
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (roleTag) roleTag.innerText = "";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// Called automatically on script load (when included in page)
document.addEventListener("DOMContentLoaded", updateNavForUser);
