// This file runs in the browser. It handles Polling (fetching data) and updating the UI.

// --- CONFIGURATION ---
let POLLING_INTERVAL = 5000; // Poll every 5 seconds (5000ms)
const API_URL = "/api/sensors/data"; // The endpoint provided by the Node.js Controller

// Global variables for Chart.js instances (One for each sensor)
let tempChartInstance; 
let humiChartInstance;

// --- CHART MANAGEMENT ---
import { createSingleChart, updateSingleChart } from "./js_module/chart.js";
 
/**
 * Initializes both Temperature and Humidity Chart.js instances.
 * Each chart is created independently with its own canvas.
 */
function initializeChart() {
    // 1. Temperature Chart (Uses "mainChart" ID)
    tempChartInstance = createSingleChart(
        "mainChart", 
        "Temperature", 
        "°C", 
        "rgb(255, 99, 132)", 
        "rgb(255, 99, 132)"
    );

    // 2. Humidity Chart (Requires a canvas element with ID "humiChart")
    humiChartInstance = createSingleChart(
        "humiChart", 
        "Humidity", 
        "%", 
        "rgb(54, 162, 235)", 
        "rgb(54, 162, 235)"
    );
}


/**
 * Updates both charts dynamically with new real-time data received from the API.
 * @param {object} data - The full JSON object received from the API endpoint.
 */
function updateChartData(data) {
    let tempValue = parseFloat(data.temperature);
    let humiValue = parseFloat(data.humidity);
    if (data.status != "ONLINE"){
        tempValue = NaN;
        humiValue = NaN;
    }
    // Update Temperature Chart independently
    updateSingleChart(tempChartInstance, tempValue);

    // Update Humidity Chart independently
    updateSingleChart(humiChartInstance, humiValue);
}


/**
 * Updates a specific DOM element with a new value.
 * Corrected NaN handling.
 */
function updateDisplay(elementId, value, unit) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Check if the parsed value is NaN, then display "NaN"
    if (isNaN(parseFloat(value))) { // FIX: Use parseFloat to check if value is a valid number
        element.innerText = `NaN`;
        element.style.color = "#dc3545"; // Red color for error
    } else {
        element.innerText = `${value}${unit}`;
        element.style.color = "#e4e6eb"; // Default color
    }
}


// --- POLLING EXECUTION ---

/**
 * Fetches the latest sensor data from Node.js Proxy API.
 */
async function fetchLatestSensorData() {
    console.log ("Fetching data from client-side");
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Proxy Request Failed: ${response.status}`);
        }        
        const data = await response.json();
        console.log (">>> Receiving from client-side", data);
        if (data.status != "ONLINE"){
            console.log ("Device is not online");
        }        
        // --- 1. Update Display Cards ---
        updateDisplay("temp-display", data.temperature, " °C");
        updateDisplay("hum-display", data.humidity, " %");
        const statusElement = document.getElementById("status-display");
        if (statusElement) {
            statusElement.innerText = data.status;
        }        

        // --- 2. Update Charts ---
        updateChartData(data); 
        
        // ---3. Update Polling Time ---
        POLLING_INTERVAL = data.itervalTime;

    } catch (error) {
        console.error(`Error during API fetch data: ${error.message}`);
        updateDisplay("temp-display", "NaN", "");
        updateDisplay("hum-display", "NaN", "");    
        const statusElement = document.getElementById("status-display");
        statusElement.innerText = "COMM ERROR";
        statusElement.style.color = "#dc3545"; // Red color for communication error
    }
}

/**
 * Initializes the polling mechanism to continuously update the dashboard.
 */
function startPolling() {
    initializeChart(); // Initialize both charts
    fetchLatestSensorData(); 
    setInterval(fetchLatestSensorData, POLLING_INTERVAL); 
}

// Ensure the script execution starts only after the entire HTML document is loaded
document.addEventListener("DOMContentLoaded", startPolling);