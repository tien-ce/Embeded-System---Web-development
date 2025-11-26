// state_store.js

/**
 * Global State Management for the latest sensor data received via MQTT.
 * This acts as the in-memory Model layer.
 */

const pool = require("../config/database");
const { json } = require("express");

// Initial state and default values
let latestSensorData = {
  temperature: "N/A",
  humidity: "N/A",
  Co2: "N/A",
  PM25: "N/A",
  PM10: "N/A",
  lastUpdated: new Date().getTime().toString(),
  status: "OFFLINE",
};

// Initial state and default values for device state
let lastDeviceState = {
  ledState: "false",
  fanSpeed: "0",
  intervalTime: "10",
};

/**
 * Update the global state with new device state value
 * @param {object} newState - The data receive from the frist time connect to Thingsboard server and successed post request from user.
 */

const updateDeviceState = (newData) => {
  Object.assign(lastDeviceState, newData, {});
  console.log("[HTTP] Stated Update");
};

const getLatestDeviceState = () => {
  return lastDeviceState;
};

/**
 * Updates the global state with new sensor values received from the MQTT client.
 * @param {object} newData - The data received from the MQTT client (e.g., {temperature: 30.5}).
 */
const updateData = (newData) => {
  // Merge new data into the current state
  Object.assign(latestSensorData, newData, {});
  console.log(`[MQTT] Data Updated`);
};

/**
 * Returns the latest state for HTTP controllers (API endpoints).
 * @returns {object} The current latest sensor data.
 */
const getLatestData = () => {
  return latestSensorData;
};

/**
 * Internal check status
 */
function check_status() {
  if (latestSensorData.status == "ONLINE") {
    const current = new Date().getTime();
    if (
      current - parseInt(latestSensorData.lastUpdated) >
      lastDeviceState.intervalTime * 1000 * 1.2
    ) {
      // Over 5 second with the the setted interval
      console.log("Over time : Set status to OFFLINE");
      latestSensorData.status = "OFFLINE";
    }
  }
}
setInterval(check_status, parseInt(lastDeviceState.intervalTime) * 1000);

const checkSignIn = async (email, password) => {
  let connection, user;
  try {
    connection = await pool.getConnection(); // Get a connection from the pool
    [user, fields] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      email
    );
    console.log(">>> USER", user);
    console.log(">>> USER[0]", user["0"]);
    let status, message;
    if (user.length < 1) {
      status = "ERROR";
      message = "Email is not registed, please sign up";
    } else if (user["0"].password_hash === password) {
      status = "OK";
      message = user["0"].user_access_token;
    } else {
      status = "ERROR";
      message = "Password is incorrect";
    }
    console.log(">>> Result of checking signIn", status, message);
    return {
      status: status,
      message: message,
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
};

module.exports = {
  updateData,
  updateDeviceState,
  getLatestData,
  getLatestDeviceState,
  checkSignIn,
};
