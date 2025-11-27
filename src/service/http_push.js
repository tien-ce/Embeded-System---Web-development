// Service Layer: control_service.js

const fetch = require("node-fetch");
require("dotenv").config();
const THINGSBOARD_HOST = process.env.THINGSBOARD_HOST;
/**
 * Executes the actual MQTT PUSH to ThingsBoard.
 * @param {string} key - The attribute key (e.g., 'ledState').
 * @param {any} value - The attribute value (e.g., true, 50, 10).
 * @returns {Promise<boolean>} True if the publish was successful.
 */
const updateControlDevice = (userAccessToken, key, value) => {
  return new Promise(async (resolve) => {
    // ThingsBoard expects JSON payload: { "ledState": true }
    const payload = JSON.stringify({ [key]: value });
    const url = `https://${THINGSBOARD_HOST}/api/v1/${userAccessToken}/attributes`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      console.log(
        `[CONTROL SERVICE] Successfully PUBLISHED: ${key} = ${value}`
      );
      resolve(true);
    } catch (error) {
      console.error("Error when update device state", error);
      resolve(false);
    }
  });
};

const getLatestControlDevice = async (userAccessToken) => {
  const CLIENT_KEYS_TO_FETCH = "fanSpeed,ledState,timeInterval";

  console.log("[HTTP] Requesting initial attributes...");

  // Construct the URL using the defined Access Token and keys
  const url = `https://${THINGSBOARD_HOST}/api/v1/${userAccessToken}/attributes?clientKeys=${CLIENT_KEYS_TO_FETCH}`;

  try {
    // Execute the GET request using fetch
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    console.log("[HTTP] Initial attributes received.");

    // Process and save the initial state to stateStore
    const initialState = {};
    console.log(">>> Raw data received from HTTP:", data);
    // Merge client attributes
    if (data.client && typeof data.client === "object") {
      Object.entries(data.client).forEach(([key, value]) => {
        initialState[key] = value.toString();
      });
    }
    return initialState;
  } catch (error) {
    console.error("Error when update device state", error);
    throw error;
  }
};
module.exports = {
  updateControlDevice,
  getLatestControlDevice,
};
