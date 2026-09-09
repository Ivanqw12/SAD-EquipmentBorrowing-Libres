/* ============================================================
   js/supabase.js
   Supabase client initialization.
   PASTE YOUR REAL VALUES BELOW (Supabase Dashboard > Settings > API).
   ============================================================ */

const SUPABASE_URL = "YOUR_SUPABASE_URL";          // e.g. https://abcdefghijklm.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // e.g. eyJhbGciOi...

function isConfigReady() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("YOUR_") &&
    SUPABASE_ANON_KEY.length > 50 &&
    !SUPABASE_ANON_KEY.includes("YOUR_")
  );
}

let supabaseClient = null;

if (typeof supabase !== "undefined") {
  if (isConfigReady()) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized.");
  } else {
    console.warn(
      "Supabase placeholders detected. Open js/supabase.js and paste your real " +
      "SUPABASE_URL and SUPABASE_ANON_KEY (Supabase Dashboard > Settings > API). " +
      "See README.md for the full setup guide."
    );
  }
} else {
  console.error("The Supabase JS library was not loaded. Check the CDN script tag in your HTML files.");
}

window.supabaseClient = supabaseClient;

/* ============================================================
   Shared error formatter
   ============================================================ */
function getErrorMessage(error) {
  if (!error) return "Unknown error. Please try again.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return "Unknown error. Please try again.";
}

/* ============================================================
   Shared helpers used across modules
   ============================================================ */

// Lightweight toast-style alert in the page (falls back to alert() on login page)
window.showError = function (message) {
  const box = document.getElementById("auth-error");
  if (box) {
    box.textContent = message;
    box.hidden = false;
    return;
  }
  const box2 = document.getElementById("app-error");
  if (box2) {
    box2.textContent = message;
    box2.hidden = false;
    return;
  }
  alert(message);
};

window.clearAlerts = function () {
  const box = document.getElementById("auth-error");
  if (box) box.hidden = true;
  const box2 = document.getElementById("app-error");
  if (box2) box2.hidden = true;
};

// Format a date (YYYY-MM-DD or ISO) into a display string
window.formatDate = function (value) {
  if (!value) return "—";
  const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// Today as YYYY-MM-DD (local timezone)
window.todayStr = function () {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// ============================================================
// Reusable confirmation modal (used for delete actions, BR-10)
// ============================================================
window.askDeleteConfirmation = function (title, message, onConfirm) {
  const modal = document.getElementById("confirm-modal");
  if (!modal) {
    // Fallback if the modal is not present on this page
    if (window.confirm(title + "\n\n" + message)) onConfirm();
    return;
  }

  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;

  const okBtn = document.getElementById("confirm-ok-btn");
  const cancelBtn = document.getElementById("confirm-cancel-btn");

  modal.classList.add("show");

  function cleanup() {
    modal.classList.remove("show");
    okBtn.onclick = null;
    cancelBtn.onclick = null;
    modal.onclick = null;
  }

  okBtn.onclick = async function () {
    cleanup();
    await onConfirm();
  };

  cancelBtn.onclick = function () {
    cleanup();
  };

  modal.onclick = function (event) {
    if (event.target === modal) cleanup();
  };
};