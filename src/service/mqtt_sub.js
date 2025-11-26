// mqtt_client.js

const mqtt = require("mqtt");
const fetch = require("node-fetch");
require("dotenv").config();
// Import State Store (This path assumes state_store.js is in the same directory)
const stateStore = require("./state_store");
// 1. THINGSBOARD CONNECTION CONFIGURATION
const THINGSBOARD_HOST = process.env.THINGSBOARD_HOST;
const DEVICE_ACCESS_TOKEN = process.env.DEVICE_ACCES_TOKEN;
const CLIENT_KEYS_TO_FETCH = "fanSpeed,ledState,timeInterval";
const SHARED_KEYS_TO_FETCH = "temperature,humidity,no2,pm10,pm25";
// Topic used to receive Attribute Updates or Control Commands from the server/dashboard
const ATTRIBUTES_TOPIC = "v1/devices/me/attributes";

const options = {
  // ThingsBoard uses the Access Token as the username for authentication
  username: DEVICE_ACCESS_TOKEN,
  // Password is usually left empty for basic token authentication
};
/**
 * Executes an HTTP GET request to ThingsBoard to fetch initial shared/client attributes
 * before the MQTT subscription starts.
 */
async function fetchInitialAttributes() {
  console.log("[HTTP] Requesting initial attributes...");

  // Construct the URL using the defined Access Token and keys
  const url = `https://${THINGSBOARD_HOST}/api/v1/${DEVICE_ACCESS_TOKEN}/attributes?clientKeys=${CLIENT_KEYS_TO_FETCH}&sharedKeys=${SHARED_KEYS_TO_FETCH}`;

  try {
    // Execute the GET request using fetch
    const response = await fetch(url);

    if (!response.ok) {
      // Throw error for bad HTTP status (4xx, 5xx)
      const errorText = await response.text();
      throw new Error(`HTTP Status ${response.status}: ${errorText}`);
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

    // Merge shared attributes
    const initialData = {};

    if (data.shared && typeof data.shared === "object") {
      Object.entries(data.shared).forEach(([key, value]) => {
        initialData[key] = value.toString();
      });
    }

    // Set initial status and timestamp
    initialData.status = "ONLINE";
    initialData.lastUpdated = new Date().getTime();
    console.log(">>> Device state initialize ", initialState);
    stateStore.updateData(initialData);
    stateStore.updateDeviceState(initialState);
    console.log("[State] Initial state populated successfully.");
  } catch (error) {
    console.error(
      "[HTTP] Failed to fetch initial attributes (thuộc tính khởi tạo). Check Access Token and Host URL.",
      error.message
    );
  }
}
// 1. Fetch data for first time
fetchInitialAttributes();
// 2. CONNECT TO THE MQTT BROKER
console.log(`[MQTT] Connecting to broker: ${THINGSBOARD_HOST}`);
const client = mqtt.connect(`mqtt://${THINGSBOARD_HOST}`, options);

// Handler when the client successfully connects
client.on("connect", function () {
  console.log("[MQTT] Successfully connected.");
  // Subscribe to both the Telemetry (if listening for other devices) and Attributes topics
  client.subscribe(ATTRIBUTES_TOPIC, function (err) {
    if (!err) {
      console.log(`[MQTT] Subscribed to attributes topics.`);
      const REQUEST_PAYLOAD = JSON.stringify({
        First_connect: "temperature,humidity,Co2,PM10,PM20",
      });
      // For first time
      client.publish(ATTRIBUTES_TOPIC, REQUEST_PAYLOAD, function (err) {
        if (err) {
          console.error("[MQTT] Publish request error:", err);
        } else {
          console.log("[MQTT] Successfully requested current attributes.");
        }
      });
    } else {
      console.error("[MQTT] Subscription error:", err);
    }
  });
});

// Handler for incoming messages
client.on("message", function (topic, message) {
  const payload = message.toString();
  console.log(">>>> Test payload from core IoT", payload);
  try {
    const data = JSON.parse(payload);

    // --- CORE LOGIC: Update State ---
    if (topic === ATTRIBUTES_TOPIC) {
      // Received Attribute updates or control commandsN
      console.log(`[MQTT] Received Control Command (Attribute Update):`, data);
      // Udpate lasted receive time
      data.lastUpdated = new Date().getTime();
      data.status = "ONLINE";
      // Add logic here to publish response or control the ESP32
      stateStore.updateData(data);
    } else {
      console.log(`[MQTT] Unhandled topic ${topic}: ${payload}`);
    }
  } catch (e) {
    console.error("[MQTT] Error parsing MQTT payload:", e);
  }
});

// Handler for connection errors
client.on("error", function (err) {
  console.error("MQTT connection error:", err);
  client.end();
});

// Handler for connection closed
client.on("close", function () {
  console.log("MQTT connection closed.");
});

// Prevent script from exiting immediately (used for graceful shutdown)
process.on("SIGINT", () => {
  console.log("\nClosing MQTT connection...");
  client.end();
  process.exit();
});

// IMPORTANT: Export the client instance so server.js can run it
module.exports = client;
