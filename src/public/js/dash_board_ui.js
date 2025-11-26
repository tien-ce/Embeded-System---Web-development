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

  try {
    console.log(`[CONTROL] Sending ${attributeKey}: ${value} to server...`);

    const response = await fetch(SET_CONTROL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
function updateIntervalSettings() {
  const intervalInput = document.getElementById("interval-time-input");

  if (intervalInput) {
    const newInterval = parseInt(intervalInput.value, 10);
    const oldIntervanewFanSpeedl = intervalInput.dataset.oldValue || 10;

    if (isNaN(newInterval) || newInterval < 1) {
      alert("Please enter a valid positive number for Interval Time.");
      return;
    }

    // Rollback function: Revert the input field value to the stored old value
    const rollback = (el) => {
      // Restore from the stored old value or default to 10
      el.value = oldInterval;
    };

    // Send the new interval time (attributeKey: 'timeInterval')
    sendControlCommand("timeInterval", newInterval, rollback, intervalInput);
  }
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
  try {
    const respone = await fetch(GET_CONTROL_API_RUL);
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

  // C. Attach listener ONLY for Interval Time (updateSettings function)
  const updateButton = document.getElementById("update-settings-btn");
  if (updateButton) {
    updateButton.addEventListener("click", updateIntervalSettings);
  }

  // D. Sidebar Toggle
  const toggleButton = document.getElementById("menu-toggle");
  const wrapper = document.getElementById("wrapper");
  if (toggleButton && wrapper) {
    toggleButton.onclick = function () {
      wrapper.classList.toggle("toggled");
    };
  }
}

// Start event listener setup when the DOM is ready
document.addEventListener("DOMContentLoaded", initializeControlEvents);
