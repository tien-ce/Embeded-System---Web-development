// --- INTERACTING WITH FRONT-END ELEMENTS ---
// API BACKEND URL
const SIGN_UP_URL = "/api/signup";
const SIGN_IN_URL = "/api/signin";
// 1. Get the main form containers by their unique IDs
const loginBox = document.getElementById("login-box");
const signupBox = document.getElementById("signup-box");

// 2. Get the form submission elements by their unique IDs
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

// 3. Get the link elements used for switching between forms
const showSignupLink = document.getElementById("show-signup");
const showLoginLink = document.getElementById("show-login");

// --- FRONT-END INTERACTION FUNCTIONS ---

/**
 * Switches the display from the Login form to the Signup form.
 * Toggles the 'hidden' class defined in CSS.
 */
function showSignup() {
  // Front-end interaction: Add 'hidden' class to hide the login form
  loginBox.classList.add("hidden");
  // Front-end interaction: Remove 'hidden' class to show the signup form
  signupBox.classList.remove("hidden");
}

/**
 * Switches the display from the Signup form to the Login form.
 * Toggles the 'hidden' class defined in CSS.
 */
function showLogin() {
  // Front-end interaction: Add 'hidden' class to hide the signup form
  signupBox.classList.add("hidden");
  // Front-end interaction: Remove 'hidden' class to show the login form
  loginBox.classList.remove("hidden");
}

// --- FRONT-END EVENT LISTENERS  ---

// 1. Attach click event to the "Sign Up" link
showSignupLink.addEventListener("click", (e) => {
  e.preventDefault(); // Prevents the link from jumping/reloading the page
  showSignup();
});

// 2. Attach click event to the "Login" link
showLoginLink.addEventListener("click", (e) => {
  e.preventDefault(); // Prevents the link from jumping/reloading the page
  showLogin();
});

// 3. Attach submit event to the Login form
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Stop the default form submission action
  try {
    // Front-end interaction: Get input values using their IDs
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    // --- BACK-END Logic Placeholder ---
    console.log("LOGIN Attempt:");
    console.log("Email:", email);
    console.log("Password:", password);
    const payload = {
      email: email,
      password: password,
    };
    console.log(">>> Check payload before login", payload);
    const respone = await fetch(SIGN_IN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!respone.ok) {
      const errorData = await respone.json();
      const errorMessage = errorData.error;
      throw new Error(`Sign Up API failed with status: ${errorMessage}`);
    }
    const result = respone.json();
    console.log("[Sign in] Command acknowledge", result);
  } catch (error) {
    console.error(`[SIGN UP ERROR] Failed to send control command:`, error);
    displayError(error);
  }
  // --- End BACK-END Logic Placeholder ---
});

// 4. Attach submit event to the Signup form
signupForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Stop the default form submission action

  // Front-end interaction: Get input values using their IDs
  const username = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  // --- BACK-END Logic Placeholder ---
  console.log("SIGNUP Attempt:");
  console.log("Username:", username);
  console.log("Email:", email);
  console.log("Password:", password);

  // In a real application, you would send this data to a server here
  alert(`Signup attempted for ${username}. (Check console for details)`);
  // --- End BACK-END Logic Placeholder ---

  // Optional: Switch back to login form after successful signup (Giả lập chuyển về Login sau khi Đăng ký thành công)
  // showLogin();
});

// 5. Get the error message display element by its ID
const errorMessageDiv = document.getElementById("error-message");

// --- FRONT-END ERROR CONTROL FUNCTIONS ---

/**
 * Displays the error message on the UI.
 * @param {string} message - The error message content.
 */
function displayError(message) {
  // Front-end interaction: Update content and remove 'hidden' class to show it
  errorMessageDiv.textContent = message;
  errorMessageDiv.classList.remove("hidden");

  // Set a timeout to automatically hide the message after 5 seconds (5000ms)
  setTimeout(hideError, 3000);
}

/**
 * Hides the error message from the UI.
 */
function hideError() {
  // Front-end interaction: Add 'hidden' class to hide the div
  errorMessageDiv.textContent = "";
  errorMessageDiv.classList.add("hidden");
}
