// controllers/api_controller.js

// Import the State Store, which acts as the in-memory Model layer
// storing the latest sensor data received via MQTT.
const stateStore = require("../service/state_store");
const {
  updateControlDevice,
  getLatestControlDevice,
} = require("../service/http_push");
/**
 * Controller function to handle HTTP requests from the client-side JavaScript
 * (Dashboard) for the latest sensor data.
 * This function serves as the interval API endpoint /api/latest (or similar).
 * * @param {object} req - The incoming HTTP request object.
 * @param {object} res - The outgoing HTTP response object.
 */
const getSensor1Data = async (req, res) => {
  const userId = req.userId;
  // 1. Controller calls the State Store (Model) to retrieve the latest data.
  const data = await stateStore.getLatestData(userId);
  console.log(">>> Get data from client-side", data);
  // --- Data Validation and Formatting ---
  // 2. Controller sends the formatted JSON data back to the client.
  res.json(data);
};

/**
 *  Controller function to handle client GET requests for device control.
 * (Dashboard) for the latest device state.
 * This function serves as the interval API endpoint /api/getControl (or similar).
 * * @param {object} req - The incoming HTTP request object.
 * * @param {object} res - The outgoing HTTP response object.
 */
const getControlDevice = async (req, res) => {
  const data = req.body;
  const header = req.headers;
  console.log(">>> Header", header);
  const authHeader = header["authorization"];

  console.log(">>> Body", data);
  let userAccessToken;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    userAccessToken = authHeader.split(" ")[1]; // Get token
  }
  try {
    const latestDeviceState = await getLatestControlDevice(userAccessToken);
    console.log(">>> Get state from client-side", latestDeviceState);
    console.log(">>> Get state from client-side", latestDeviceState);
    res.json(latestDeviceState);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch device state from external API.",
      details: error.message,
    });
  }
};

/**
 * Controller function to handle client POST requests for device control.
 * * @param {object} req - The incoming HTTP request object.
 * @param {object} res - The outgoing HTTP response object.
 */
const setControlDevice = async (req, res) => {
  const data = req.body;
  const header = req.headers;
  console.log(">>> Header", header);
  const authHeader = header["authorization"];

  console.log(">>> Body", data);
  let userAccessToken;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    userAccessToken = authHeader.split(" ")[1]; // Get token
  }
  // 1. Validiation
  const attributeKey = data.attributeKey;
  const value = data.value;

  console.log(
    ">>> Test fetch device control: AttributeKey",
    attributeKey,
    "Value",
    value,
    "AccessToken",
    userAccessToken
  );

  if (!attributeKey || value === undefined || attributeKey === undefined) {
    console.error("CONTROL ERROR: Missing key or value");
    return res.status(400).json({ error: "Missing attributeKey or value" });
  }

  try {
    // 2. Dispatch to Service
    const success = await updateControlDevice(
      userAccessToken,
      attributeKey,
      value
    );

    if (success) {
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
