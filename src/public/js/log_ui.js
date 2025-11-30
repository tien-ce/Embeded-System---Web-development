// public/js/log_ui.js

const ALERTS_API = "/api/alerts/getAllAlert"; // API get the log list
const MARK_READ_API = "/api/alerts/markAlertsAsRead"; // API marks it read
const POLLING_INTERVAL = 2000; // Polling every 2 second

/**
 * Renders the alerts data into the HTML table.
 * @param {Array<object>} alerts - Array of alert objects from the API.
 */
function renderAlerts(alerts) {
  const tbody = document.getElementById("alerts-log-body");
  if (!tbody) return;

  if (alerts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted">No recent alerts found.</td></tr>';
    return;
  }

  tbody.innerHTML = alerts
    .map((alert, index) => {
      const rowClass = alert.is_read
        ? "table-secondary"
        : "table-danger fw-bold";
      const statusText = alert.is_read ? "Read" : "NEW";

      return `
            <tr class="${rowClass}">
                <td>${index + 1}</td>
                <td>${new Date(alert.time_stamp * 1000).toLocaleString()}</td>
                <td>${alert.type.toUpperCase()}</td>
                <td>${alert.message}</td>
                <td>${statusText}</td>
            </tr>
        `;
    })
    .join("");
}
/**
 * Test function that returns mock alert data instantly without calling the backend.
 */
async function fetchTestAlertsLog() {
  const mockAlerts = [
    {
      time_stamp: Date.now() / 1000 - 3600, // 1 hour ago
      type: "temp",
      message: "Temperature exceeded critical threshold (38.5°C).",
      is_read: true,
    },
    {
      time_stamp: Date.now() / 1000 - 300, // 5 minutes ago
      type: "pm25",
      message: "PM2.5 dangerously high (75 µg/m³).",
      is_read: false, // New alert
    },
    {
      time_stamp: Date.now() / 1000 - 60, // 1 minute ago
      type: "so2",
      message: "SO2 spike detected (30 µg/m³).",
      is_read: false, // New alert
    },
  ];

  console.warn(
    "[TEST MODE] Rendering mock data. Backend API calls are skipped."
  );
  renderAlerts(mockAlerts);
}
/**
 * Fetches the list of alerts from the backend (Polling function).
 */
async function fetchAlertsLog() {
  const token = localStorage.getItem("userAccessToken");
  if (!token) return;

  try {
    const response = await fetch(ALERTS_API, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch alerts log.");

    const data = await response.json(); // Data should be an array of alert objects
    console.log(">>> Alert ", data);
    renderAlerts(data.logs);

    // if (typeof updateAlertBadge === "function") {
    //   updateAlertBadge();
    // }
  } catch (error) {
    console.error("Error during alerts polling:", error);
  }
}

/**
 * Sends a request to the backend to mark all alerts for the user as read.
 */
async function markAllAsRead() {
  const token = localStorage.getItem("userAccessToken");
  if (!token) return;

  try {
    const response = await fetch(MARK_READ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to mark alerts as read.");
    await fetchAlertsLog();
    alert("All alerts marked as read.");
  } catch (error) {
    console.error("Error marking alerts as read:", error);
    alert("ERROR: Could not mark alerts as read.");
  }
}

function initializeAlertsPage() {
  if (window.location.pathname === "/alerts") {
    window.globalSensorPollingTimerId = setInterval(
      fetchAlertsLog,
      POLLING_INTERVAL
    );
    console.log(
      `[POLLING] Sensor Polling started with ID: ${window.globalSensorPollingTimerId}`
    );

    fetchAlertsLog();

    const readBtn = document.getElementById("mark-as-read-btn");
    if (readBtn) {
      readBtn.addEventListener("click", markAllAsRead);
    }
  }
}

document.addEventListener("DOMContentLoaded", initializeAlertsPage);
