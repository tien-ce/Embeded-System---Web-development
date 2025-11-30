// public/js/dash_board_ui.js

const GET_CONTROL_API_RUL = "/api/device/getControl";
const SET_CONTROL_API_URL = "/api/device/setControl";
/**
 * Executes a POST request to the internal Node.js API to push a control command to ThingsBoard.
 * @param {string} attributeKey - The name of the attribute to update.
 * @param {any} value - The new value for the attribute.
 * @param {function} rollbackFunction - Function to revert the UI state if the API call fails.
 * @param {object} element - The HTML input element being controlled.
 */
async function sendControlCommand(
  attributeKey,
  value,
  rollbackFunction,
  element
) {
  const payload = {
    attributeKey: attributeKey,
    value: value,
  };
  console.log(`[CONTROL] Sending ${attributeKey}: ${value} to server...`);
  const userAccessToken = localStorage.getItem("userAccessToken");

  if (!userAccessToken || userAccessToken === "undefined") {
    alert("The session has expired. Please log in again");
    window.location.href = "/login";
    return;
  }
  console.log(">>> User token", userAccessToken);
  console.log(">>> Compare undefine", userAccessToken === undefined);
  try {
    const response = await fetch(SET_CONTROL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Control API failed with status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[CONTROL] Command acknowledged:`, result);

    // Success: Update the stored 'old value' for future rollbacks
    if (element && element.dataset.oldValue !== undefined) {
      element.dataset.oldValue = value;
    }
  } catch (error) {
    console.error(
      `[CONTROL ERROR] Failed to send control command:`,
      error.message
    );

    // CORE FIX: Rollback the UI state immediately if the HTTP request failed
    if (rollbackFunction) {
      rollbackFunction(element);
      alert(`ERROR: Failed to update ${attributeKey}. UI state reverted.`);
    }
  }
}

// --- FAN CONTROL LOGIC (Instant Send on Slider Change) ---

/**
 * Sends the Fan Speed command immediately when the slider input stops changing (on 'change' event).
 */
function updateFanSpeed() {
  const fanSpeedInput = document.getElementById("fan-speed-input");
  const displaySpan = document.getElementById("fan-speed-value");

  if (fanSpeedInput) {
    // 1. MISTAKE FIX: req.headers is already an object. DO NOT PARSE.
    const newFanSpeed = parseInt(fanSpeedInput.value, 10);
    const oldFanSpeed = fanSpeedInput.dataset.oldValue || 0;

    // Rollback function: Revert the slider value to the stored old value
    const rollback = (el) => {
      el.value = oldFanSpeed;
      if (displaySpan) {
        displaySpan.innerText = `${oldFanSpeed}%`;
      }
    };

    // Send the fan speed attribute (attributeKey: 'fanSpeed')
    sendControlCommand("fanSpeed", newFanSpeed, rollback, fanSpeedInput);
  }
}

// --- INTERVAL TIME LOGIC (Send on Button Click Only) ---

/**
 * Function called when the Save Configuration button is clicked.
 * Handles the Interval Time input only.
 */
function update_verification() {
  const intervalInput = document.getElementById("interval-time-input");
  const tempInput = document.getElementById("temp-threshold-input");
  const humiInput = document.getElementById("humi-threshold-input");
  const so2Input = document.getElementById("so2-threshold-input");
  const pm10Input = document.getElementById("pm10-threshold-input");
  const pm25Input = document.getElementById("pm25-threshold-input");
  if (!intervalInput || !tempInput || !so2Input || !pm10Input || !pm25Input) {
    console.error("One or more required input elements are missing.");
    alert("Configuration fields could not be loaded.");
    return;
  }
  const newInterval = parseInt(intervalInput.value, 10);

  // Thresholds
  const newTempThreshold = parseFloat(tempInput.value);
  const newHumiThreshold = parseFloat(humiInput.value);
  const newSO2Threshold = parseFloat(so2Input.value);
  const newPM10Threshold = parseFloat(pm10Input.value);
  const newPM25Threshold = parseFloat(pm25Input.value);

  const oldSettings = {
    // Old value or defualt
    timeInterval: intervalInput.dataset.oldValue || 10,
    tempThreshold: tempInput.dataset.oldValue || 35,
    humiThreshold: humiInput.dataset.oldValue || 10,
    so2Threshold: so2Input.dataset.oldValue || 20,
    pm10Threshold: pm10Input.dataset.oldValue || 50,
    pm25Threshold: pm25Input.dataset.oldValue || 25,
  };

  // Rollback
  const rollbackAll = () => {
    intervalInput.value = oldSettings.timeInterval;
    tempInput.value = oldSettings.tempThreshold;
    humiInput.value = oldSettings.humiThreshold;
    so2Input.value = oldSettings.so2Threshold;
    pm10Input.value = oldSettings.pm10Threshold;
    pm25Input.value = oldSettings.pm25Threshold;
  };
  sendControlCommand("timeInterval", newInterval, rollbackAll, intervalInput);
  sendControlCommand("tempThreshold", newTempThreshold, rollbackAll, tempInput);
  sendControlCommand("humiThreshold", newHumiThreshold, rollbackAll, humiInput);
  sendControlCommand("so2Threshold", newSO2Threshold, rollbackAll, so2Input);
  sendControlCommand("pm10Threshold", newPM10Threshold, rollbackAll, pm10Input);
  sendControlCommand("pm25Threshold", newPM25Threshold, rollbackAll, pm25Input);
}

// --- LED TOGGLE LOGIC (Instant Send on Change) ---

function updateLedState() {
  const ledToggle = document.getElementById("led-toggle");
  const label = ledToggle ? ledToggle.nextElementSibling : null;

  if (ledToggle) {
    const newState = ledToggle.checked;
    const oldState = !newState;

    const rollback = (el) => {
      el.checked = oldState;
      if (label) {
        label.innerText = oldState ? "ON" : "OFF";
      }
    };

    if (label) {
      label.innerText = newState ? "ON" : "OFF";
    }

    sendControlCommand("ledState", newState, rollback, ledToggle);
  }
}

// Fetches the latest Device State form Node.js proxy API
async function fetchLatestDeviceState() {
  console.log("Fetching device state from cline-side");
  const userAccessToken = localStorage.getItem("userAccessToken");
  if (!userAccessToken) {
    alert("The session has expired. Please log in again");
    window.location.href = "/login";
    return;
  }
  try {
    const respone = await fetch(GET_CONTROL_API_RUL, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    if (!respone.ok) {
      throw new Error(`Proxy Request failed: ${respone.status}`);
    }
    const data = await respone.json();
    console.log("Receiving state from clinet-side", data);
    // Update state to html
    const intervalInput = document.getElementById("interval-time-input");
    if (intervalInput) {
      intervalInput.value = data.timeInterval;
    }
    const ledToggle = document.getElementById("led-toggle");
    if (ledToggle) {
      ledToggle.checked = data.ledState == "true" ? 1 : 0;
      // Get the label/span element next to the toggle
      const label = ledToggle.nextElementSibling;
      if (label) {
        // Set the label text based on the new boolean state
        label.innerText = data.ledState == "true" ? "ON" : "OFF";
        console.log(label.innerText);
      }
    }

    const fanSpeed = document.getElementById("fan-speed-value");
    const fanSpeedDisplay = document.getElementById("fan-speed-input");
    if (fanSpeed) {
      fanSpeed.innerText = data.fanSpeed;
      fanSpeedDisplay.value = data.fanSpeed;
    }
  } catch (error) {
    console.error(`Error during API fetch deivce state: ${error.message}`);
  }
}

// --- INITIALIZATION ---

function initializeControlEvents() {
  // Get lasted Device state
  fetchLatestDeviceState();
  // A. Store initial values for rollback (used for input fields)
  const intervalInput = document.getElementById("interval-time-input");
  if (intervalInput) {
    // Store the initial value for rollback
    intervalInput.dataset.oldValue = intervalInput.value;
  }

  const fanSpeedInput = document.getElementById("fan-speed-input");
  if (fanSpeedInput) {
    // Store the initial value for rollback
    fanSpeedInput.dataset.oldValue = fanSpeedInput.value;

    // C1. Attach INSTANT SEND listener on 'change' (when slider is released)
    fanSpeedInput.addEventListener("change", updateFanSpeed);

    // C2. Attach 'input' listener to update the % value display in real-time
    fanSpeedInput.addEventListener("input", function () {
      document.getElementById("fan-speed-value").innerText = `${this.value}%`;
    });
  }

  // B. Attach Listeners for button/toggle controls
  const ledToggle = document.getElementById("led-toggle");
  if (ledToggle) {
    ledToggle.addEventListener("change", updateLedState);
  }

  // C. Attach listener for Interval Time (updateSettings function) and Threshold
  const updateButton = document.getElementById("update-settings-btn");
  const tempInput = document.getElementById("temp-threshold-input");
  const humiInput = document.getElementById("humi-threshold-input");
  const so2Input = document.getElementById("so2-threshold-input");
  const pm10Input = document.getElementById("pm10-threshold-input");
  const pm25Input = document.getElementById("pm25-threshold-input");
  if (
    updateButton ||
    tempInput ||
    humiInput ||
    so2Input ||
    pm10Input ||
    pm25Input
  ) {
    updateButton.addEventListener("click", update_verification);
  }
}

// Start event listener setup when the DOM is ready
document.addEventListener("DOMContentLoaded", initializeControlEvents);
