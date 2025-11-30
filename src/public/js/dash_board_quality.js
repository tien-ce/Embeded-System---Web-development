// public/js/dash_board_air_quality.js
// Handles polling and updating the Air Quality Dashboard for CO2, PM10, PM2.5.

// --- CONFIGURATION ---
let POLLING_INTERVAL = 5000; // Poll every 5 seconds (5000ms)
const API_AIR_URL = "/api/sensors/data"; // New API endpoint for air quality data

let pm10ChartInstance;
let pm25ChartInstance;

// --- CHART MANAGEMENT ---
import { createSingleChart, updateSingleChart } from "./js_module/chart.js";

/**
 * Initializes both PM10 and PM2.5 Chart.js instances.
 */
function initializeAirChart() {
  // 1. PM10 Chart
  pm10ChartInstance = createSingleChart(
    "pm10Chart",
    "PM10",
    "µg/m³",
    "rgb(255, 159, 64)", // Orange color
    "rgb(255, 159, 64)"
  );

  // 2. PM2.5 Chart
  pm25ChartInstance = createSingleChart(
    "pm25Chart",
    "PM2.5",
    "µg/m³",
    "rgb(75, 192, 192)", // Teal color
    "rgb(75, 192, 192)"
  );
}

/**
 * Updates the charts dynamically with new air quality data received from the API.
 * CO2 is only updated to the display card, not the chart.
 */
function updateAirChartData(data) {
  let pm10Value = parseFloat(data.PM10);
  let pm25Value = parseFloat(data.PM25);

  if (data.status != "ONLINE") {
    pm10Value = NaN;
    pm25Value = NaN;
  }
  // Update PM10 Chart
  updateSingleChart(pm10ChartInstance, pm10Value);

  // Update PM2.5 Chart
  updateSingleChart(pm25ChartInstance, pm25Value);
}

/**
 * Updates a specific DOM element with a new value.
 */
function updateDisplay(elementId, value, unit) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (isNaN(parseFloat(value))) {
    element.innerText = `NaN`;
    element.style.color = "#dc3545";
  } else {
    element.innerText = `${value}${unit}`;
    element.style.color = "#e4e6eb";
  }
}

// --- POLLING EXECUTION ---

/**
 * Fetches the latest air quality sensor data from Node.js Proxy API.
 */
async function fetchLatestAirData() {
  console.log("Fetching air data from client-side");
  const controller = new AbortController();
  window.activeFetchController = controller;
  const signal = controller.signal;
  try {
    const userAccessToken = localStorage.getItem("userAccessToken");
    if (!userAccessToken) {
      alert("The session has expired. Please log in again");
      window.location.href = "/login";
      return;
    }
    const response = await fetch(API_AIR_URL, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
      signal: signal,
    });

    if (!response.ok) {
      throw new Error(`Proxy Request Failed: ${response.status}`);
    }
    const data = await response.json();
    console.log(">>> Receiving air data from client-side", data);
    if (data.status != "ONLINE") {
      console.log("Device is not online");
    }
    // --- 1. Update Display Cards ---
    updateDisplay("so2-display", data.Co2, " ppm");
    updateDisplay("pm10-display", data.PM10, " µg/m³");
    updateDisplay("pm25-display", data.PM25, " µg/m³");
    // Status remains 'Online' or updates via separate logic/API
    const statusElement = document.getElementById("status-air-display");
    if (statusElement) {
      statusElement.innerText = data.status;
    }
    // --- 2. Update Charts ---
    updateAirChartData(data);
    // --- 3. Update time polling
    POLLING_INTERVAL = data.intervalTime;
  } catch (error) {
    console.error(`Error during Air API fetch: ${error.message}`);
    updateDisplay("co2-display", "NaN", "");
    updateDisplay("pm10-display", "NaN", "");
    updateDisplay("pm25-display", "NaN", "");
    // Update PM10 Chart
    updateSingleChart(pm10ChartInstance, NaN);

    // Update PM2.5 Chart
    updateSingleChart(pm25ChartInstance, NaN);
    const statusElement = document.getElementById("status-air-display");
    if (statusElement) {
      statusElement.innerText = "COMM ERROR";
      statusElement.style.color = "#dc3545";
    }
  } finally {
    window.activeFetchController = null;
  }
}
/**
 * Initializes the polling mechanism to continuously update the dashboard.
 */
function startAirPolling() {
  initializeAirChart(); // Initialize both charts
  window.globalSensorPollingTimerId = setInterval(
    fetchLatestAirData,
    POLLING_INTERVAL
  );
  console.log(
    `[POLLING] Sensor Polling started with ID: ${window.globalSensorPollingTimerId}`
  );
  fetchLatestAirData();
}

// Ensure the script execution starts only after the entire HTML document is loaded
document.addEventListener("DOMContentLoaded", startAirPolling);
