/* ============================================================
   js/auth.js
   Login, logout, session management, and page guards.
   Uses window.supabaseClient created in js/supabase.js.
   ============================================================ */

let authMode = "login"; // "login" | "signup"

/* ---------- Login / Sign Up page ---------- */
function initAuthPage() {
  if (!window.supabaseClient) {
    window.showError("Supabase is not configured. Open js/supabase.js and add your project URL and anon key, then run the setup SQL in README.md.");
    return;
  }

  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const btn = document.getElementById("auth-btn");
  const toggleLink = document.getElementById("auth-toggle-link");
  const toggleText = document.getElementById("auth-toggle-text");

  function setMode(mode) {
    authMode = mode;
    btn.textContent = mode === "login" ? "Login" : "Create Account";
    toggleText.textContent = mode === "login" ? "No account yet?" : "Already have an account?";
    toggleLink.textContent = mode === "login" ? "Sign Up" : "Login";
    window.clearAlerts();
    if (mode === "signup") {
      passwordInput.setAttribute("minlength", "6");
    } else {
      passwordInput.removeAttribute("minlength");
    }
  }

  toggleLink.addEventListener("click", function (event) {
    event.preventDefault();
    setMode(authMode === "login" ? "signup" : "login");
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    window.clearAlerts();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      window.showError("Email and password are required.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Please wait...";

    try {
      if (authMode === "login") {
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace("index.html");
      } else {
        const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          window.showAlert("success", "Account created. You are now logged in.");
          window.location.replace("index.html");
        } else {
          window.showAlert(
            "success",
            "Account created! Check your email for a confirmation link, then log in."
          );
          setMode("login");
        }
      }
    } catch (err) {
      let msg = getErrorMessage(err);
      // Friendlier messages for common Supabase errors
      if (msg.includes("Invalid login credentials")) msg = "Invalid email or password.";
      if (msg.includes("already registered")) msg = "That email is already registered. Try logging in.";
      if (msg.includes("Password should be")) msg = "Password must be at least 6 characters.";
      window.showError(msg);
    } finally {
      btn.disabled = false;
      btn.textContent = authMode === "login" ? "Login" : "Create Account";
    }
  });
}

// Success message on the auth page
window.showAlert = function (type, message) {
  const box = document.getElementById("auth-error");
  if (box) {
    box.className = type === "success" ? "alert alert-success" : "alert alert-danger";
    box.textContent = message;
    box.hidden = false;
  }
};

/* ---------- Protected pages ---------- */
async function requireAuth() {
  if (!window.supabaseClient) {
    window.showError("Supabase is not configured. Open js/supabase.js and add your project URL and anon key.");
    return null;
  }

  const {
    data: { session },
  } = await window.supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace("login.html");
    return null;
  }

  const display = session.user.email;
  const el = document.getElementById("user-display");
  if (el) el.textContent = "Signed in as " + display;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // React to session changes
  window.supabaseClient.auth.onAuthStateChange((event, currentSession) => {
    if (!currentSession) {
      window.location.replace("login.html");
    } else if (event === "SIGNED_IN") {
      if (window.location.pathname.endsWith("login.html")) {
        window.location.replace("index.html");
      }
    }
  });

  return session;
}

async function logout() {
  await window.supabaseClient.auth.signOut();
  window.location.replace("login.html");
}

window.logout = logout;
window.initAuthPage = initAuthPage;
window.requireAuth = requireAuth;