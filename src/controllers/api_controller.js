// controllers/api_controller.js

// Import the State Store, which acts as the in-memory Model layer
// storing the latest sensor data received via MQTT.
const stateStore = require("../service/state_store");
const { updateControlDevice } = require("../service/mqtt_push");
/**
 * Controller function to handle HTTP requests from the client-side JavaScript
 * (Dashboard) for the latest sensor data.
 * This function serves as the interval API endpoint /api/latest (or similar).
 * * @param {object} req - The incoming HTTP request object.
 * @param {object} res - The outgoing HTTP response object.
 */
const getSensor1Data = async (req, res) => {
  // 1. Controller calls the State Store (Model) to retrieve the latest data.
  const data = stateStore.getLatestData();
  console.log(">>> Get data from client-side", data);
  // --- Data Validation and Formatting ---

  // Check if the temperature data exists and is not the initial "N/A" placeholder.
  const isTempValid =
    data && data.temperature !== "N/A" && data.temperature !== null;

  // Determine the temperature value to send back:
  let tempValue;
  if (isTempValid) {
    // If valid, parse it as a float and format to 1 decimal place.
    tempValue = parseFloat(data.temperature).toFixed(1);
  } else {
    // If data is missing or "N/A", return "NaN" as requested.
    // The client-side JS can then display "NaN" or a custom error message.
    tempValue = "NaN";
  }

  // Determine the humidity value to send back (similarly for other fields):
  const isHumValid = data && data.humidity !== "N/A" && data.humidity !== null;
  let humValue = isHumValid ? parseFloat(data.humidity).toFixed(1) : "NaN";

  // Determine the Co2 value to send back (similarly for other fields):
  const isCo2Valid = data && data.no2 !== "N/A" && data.no2 !== null;
  let Co2 = isCo2Valid ? parseFloat(data.no2).toFixed(1) : "NaN";

  // Determine the PM25 value to send back (similarly for other fields):
  const isPM25Valid = data && data.pm25 !== "N/A" && data.pm25 !== null;
  let PM25 = isPM25Valid ? parseFloat(data.pm25).toFixed(1) : "NaN";

  // Determine the PM10 value to send back (similarly for other fields):
  const isPM10Valid = data && data.pm10 !== "N/A" && data.pm10 !== null;
  let PM10 = isPM10Valid ? parseFloat(data.pm10).toFixed(1) : "NaN";

  // 2. Controller sends the formatted JSON data back to the client.
  res.json({
    // Temperature response (Value or "NaN")
    temperature: tempValue,

    // Humidity response (Value or "NaN")
    humidity: humValue,

    // Co2
    Co2: Co2,

    // PM25
    PM25: PM25,

    // PM10
    PM10: PM10,

    // Last updated timestamp
    lastUpdated: data.lastUpdated,

    // Interval time
    intervalTime: data.intervalTime,

    status: data.status,
  });
};

/**
 *  Controller function to handle client GET requests for device control.
 * (Dashboard) for the latest device state.
 * This function serves as the interval API endpoint /api/getControl (or similar).
 * * @param {object} req - The incoming HTTP request object.
 * * @param {object} res - The outgoing HTTP response object.
 */
const getControlDevice = async (req, res) => {
  const data = stateStore.getLatestDeviceState();
  console.log(">>> Get state from client-side", data);
  res.json(data);
};

/**
 * Controller function to handle client POST requests for device control.
 * * @param {object} req - The incoming HTTP request object.
 * @param {object} res - The outgoing HTTP response object.
 */
const setControlDevice = async (req, res) => {
  const data = req.body;
  console.log(">>> Body", data);

  // 1. Validiation
  const attributeKey = data.attributeKey;
  const value = data.value;

  console.log(
    ">>> Test fetch device control: AttributeKey",
    attributeKey,
    "Value",
    value
  );

  if (!attributeKey || value === undefined) {
    console.error("CONTROL ERROR: Missing key or value");
    return res.status(400).json({ error: "Missing attributeKey or value" });
  }

  try {
    // 2. Dispatch to Service
    const success = await updateControlDevice(attributeKey, value);

    if (success) {
      // 3. Success Response
      let updatedState = {};
      updatedState[attributeKey] = value;
      stateStore.updateDeviceState(updatedState);
      return res.status(200).json({
        message: "Control command successfully dispatched.",
        key: attributeKey,
        value: value,
      });
    } else {
      // 4. Internal Service Failure
      return res.status(503).json({
        error: "Control service failed to push command.",
        key: attributeKey,
      });
    }
  } catch (error) {
    // 5. Catch unexpected server errors
    console.error(`SERVER ERROR processing control command:`, error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Handle Sign Up request
 */
const signIn = async (req, res) => {
  const data = req.body;
  console.log(">>> Signin body", data);
  const signInRes = await stateStore.checkSignIn(data.email, data.password);
  if (signInRes.status === "OK") {
    console.log(">>> SignIn success, access token = ", signInRes.message);
    return res.json({ accessToken: signInRes.message });
  }
  console.log(">>> ERROR MESSAGE", signInRes.message);
  return res.status(500).json({ error: signInRes.message });
};

module.exports = {
  // We assume this function is mapped to an API route (e.g., /api/latest)
  getSensor1Data,
  getControlDevice,
  setControlDevice,
  signIn,
};
