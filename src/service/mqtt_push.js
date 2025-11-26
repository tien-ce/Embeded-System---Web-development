// Service Layer: control_service.js

const fetch = require("node-fetch");
const CONTROL_TOPIC = "v1/devices/me/attributes";
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

module.exports = {
  updateControlDevice,
};
