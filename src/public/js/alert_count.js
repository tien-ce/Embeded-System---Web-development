// public/js/global_badge_handler.js

const ALERT_COUNT_API = "/api/alerts/getUnReadAlertCount";
const GLOBAL_POLLING_INTERVAL = 2000;

/**
 * Fetches the count of unread alerts and updates the sidebar badge globally.
 */
async function updateAlertBadge() {
  const token = localStorage.getItem("userAccessToken");
  if (!token) {
    const badge = document.getElementById("alert-count-badge");
    if (badge) {
      badge.style.display = "none";
    }
    return;
  }
  const controller = new AbortController();
  window.activeFetchController = controller;
  const signal = controller.signal;
  try {
    const response = await fetch(ALERT_COUNT_API, {
      headers: { Authorization: `Bearer ${token}` },
      signal: signal,
    });

    if (!response.ok) throw new Error("Failed to fetch alert count.");

    const data = await response.json();

    const count = data.unreadCount;

    const badge = document.getElementById("alert-count-badge");

    if (badge) {
      badge.innerText = count;
      badge.style.display = count > 0 ? "inline-block" : "none";
    }
  } catch (error) {
    console.error("Error updating alert badge:", error);
  } finally {
    window.activeFetchController = null;
  }
}
/**
 * Starts the global polling process when the script is loaded.
 */
function initializeGlobalBadgePolling() {
  updateAlertBadge();

  setInterval(updateAlertBadge, GLOBAL_POLLING_INTERVAL);
}
// public/js/global_navigation_cleanup.js

/**
 * Attaches click event listeners to all navigation links requiring cleanup.
 * Clears global polling timers before redirecting the browser.
 */
function attachGlobalNavigationCleanup() {
  // Sidebar Toggle
  const toggleButton = document.getElementById("menu-toggle");
  const wrapper = document.getElementById("wrapper");
  if (toggleButton && wrapper) {
    toggleButton.onclick = function () {
      wrapper.classList.toggle("toggled");
    };
  }
  // Select all links that have the specific cleanup class
  const links = document.querySelectorAll(".nav-link-cleanup");

  links.forEach((link) => {
    link.addEventListener("click", function (event) {
      const targetUrl = this.getAttribute("data-target");

      if (targetUrl) {
        // 1. Prevent the default browser navigation (href follow)
        event.preventDefault();

        // 2. CLEANUP LOGIC: Clear all known global timers
        if (window.activeFetchController != null)
          window.activeFetchController.abort();
        // Clear Sensor Data Polling Timer
        if (window.globalSensorPollingTimerId) {
          clearInterval(window.globalSensorPollingTimerId);
          window.globalSensorPollingTimerId = null;
          console.log("Cleanup: Sensor Polling Timer cleared.");
        }

        // Clear Alert Badge Polling Timer (if applicable)
        if (window.globalBadgePollingTimerId) {
          clearInterval(window.globalBadgePollingTimerId);
          window.globalBadgePollingTimerId = null;
          console.log("Cleanup: Badge Polling Timer cleared.");
        }

        // 3. Perform the actual navigation
        window.location.href = targetUrl;
      }
    });
  });
}

// Ensure this cleanup logic is initialized when the DOM is ready on any page.
document.addEventListener("DOMContentLoaded", initializeGlobalBadgePolling);
document.addEventListener("DOMContentLoaded", attachGlobalNavigationCleanup);
