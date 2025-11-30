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
  const userId = req.userId;

  if (!attributeKey || value === undefined || attributeKey === undefined) {
    console.error("CONTROL ERROR: Missing key or value");
    return res.status(400).json({ error: "Missing attributeKey or value" });
  }

  try {
    // 2. Dispatch to Service
    const success = await updateControlDevice(
      userAccessToken,
      userId,
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

/**
 * Handles GET request to retrieve the count of unread alerts for the authenticated user.
 * (MAPPED TO: /api/alerts/count)
 */
const unReadAlertCount = async (req, res) => {
  // Middleware (tokenToId) must run before this function to set req.userId
  const userId = req.userId;

  try {
    // Call the stateStore function to get the count
    const unreadCount = await stateStore.getUnreadAlertCount(userId);

    // Return the count in JSON format for the frontend badge update
    return res.json({ unreadCount: unreadCount });
  } catch (error) {
    console.error(
      `[API] Error fetching unread count for User ${userId}:`,
      error
    );
    return res.status(500).json({ error: "Failed to retrieve alert count." });
  }
};

/**
 * Handles GET request to retrieve the recent alerts log for the authenticated user.
 * (MAPPED TO: /api/alerts/logs)
 */
const getAlertsLog = async (req, res) => {
  // Middleware (tokenToId) must run before this function
  const userId = req.userId;

  try {
    // Call the stateStore function to get the list of alerts
    const alertsLog = await stateStore.getAllAlerts(userId);

    // Return the log array
    return res.json({ logs: alertsLog });
  } catch (error) {
    console.error(`[API] Error fetching alerts log for User ${userId}:`, error);
    return res.status(500).json({ error: "Failed to retrieve alert logs." });
  }
};

/**
 * Handles POST request to mark all alerts as read and prune old logs.
 * (MAPPED TO: /api/alerts/mark-read)
 */
const markAlertsAsRead = async (req, res) => {
  // Middleware (tokenToId) must run before this function
  const userId = req.userId;

  try {
    // Call the stateStore function to update DB status and prune logs
    await stateStore.markAllAsReadAndPrune(userId);

    // Return success response
    return res.json({
      success: true,
      message: "Alerts marked as read and pruned.",
    });
  } catch (error) {
    console.error(
      `[API] Error marking alerts as read for User ${userId}:`,
      error
    );
    return res.status(500).json({ error: "Failed to mark alerts as read." });
  }
};

module.exports = {
  // We assume this function is mapped to an API route (e.g., /api/latest)
  getSensor1Data,
  getControlDevice,
  setControlDevice,
  signIn,
  unReadAlertCount,
  getAlertsLog,
  markAlertsAsRead,
};
