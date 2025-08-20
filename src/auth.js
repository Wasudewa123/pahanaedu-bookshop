const API_BASE = "http://localhost:8080/api/customers";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData);
      const errorDiv = document.getElementById("registerError");
      errorDiv.textContent = "";
      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          alert("✅ Registration successful! Please log in.");
          registerForm.reset();
          window.location.href = "login.html";
        } else {
          const errorMsg = await res.text();
          errorDiv.textContent = "❌ Registration failed: " + errorMsg;
        }
      } catch (error) {
        errorDiv.textContent = "❌ Error: " + error.message;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData);
      const errorDiv = document.getElementById("loginError");
      errorDiv.textContent = "";
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem("token", token);
        window.location.href = "booklist.html";
      } else {
        errorDiv.textContent = "Login failed: Invalid username or password";
      }
    });
  }
});
