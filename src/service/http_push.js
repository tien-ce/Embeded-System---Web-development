// Service Layer: control_service.js

const fetch = require("node-fetch");
require("dotenv").config();
const pool = require("../config/database");
const THINGSBOARD_HOST = process.env.THINGSBOARD_HOST;
/**
 * Executes the actual MQTT PUSH to ThingsBoard.
 * @param {string} key - The attribute key (e.g., 'ledState').
 * @param {any} value - The attribute value (e.g., true, 50, 10).
 * @returns {Promise<boolean>} True if the publish was successful.
 */
const updateControlDevice = (userAccessToken, userId, key, value) => {
  return new Promise(async (resolve) => {
    // ThingsBoard expects JSON payload: { "ledState": true }
    const payload = JSON.stringify({ [key]: value });
    const url = `https://${THINGSBOARD_HOST}/api/v1/${userAccessToken}/attributes`;
    let connection;
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
      connection = await pool.getConnection();

      // INSERT ON DUPLICATE KEY UPDATE (UPSERT)
      // This ensures only one row exists per user_id.
      const query = `
        INSERT INTO DeviceControl (user_id, ${key})
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE ${key} = VALUES(${key});
      `;

      // Values will be [userId, value]
      await connection.execute(query, [userId, value]);

      console.log(
        `[DB] Control setting updated for User ${userId}: ${key} = ${value}`
      );

      resolve(true); // Return true if both IoT push and DB save were successful
    } catch (error) {
      console.error("Error when update device state", error);
      // Resolve false if either IoT push or DB save failed
      resolve(false);
    } finally {
      if (connection) connection.release();
    }
  });
};

/**
 * Fetches the latest control and threshold settings for a user directly from the DeviceControl table.
 * * @param {number} userId - The ID of the user whose settings are being requested.
 * @returns {Promise<object>} A Promise that resolves to an object containing all settings (e.g., {fanSpeed: '50', tempThreshold: '35.0', ...})
 */
const getLatestControlDevice = async (userId) => {
  // We no longer need CLIENT_KEYS_TO_FETCH, as we SELECT all columns.

  console.log(`[DB] Requesting latest control attributes for User: ${userId}`);

  let connection;
  try {
    // 1. Get a connection from the pool
    connection = await pool.getConnection();

    // 2. Define the SELECT query to get the single row for the user
    // NOTE: If you are using 'snake_case' (e.g., 'fan_speed') in DB, you may need to convert back to 'camelCase' here.
    const selectQuery = `
      SELECT 
          fanSpeed, ledState, timeInterval, 
          tempThreshold, humiThreshold, so2Threshold, pm25Threshold, pm10Threshold
      FROM 
          DeviceControl 
      WHERE 
          user_id = ?;
    `;

    // Execute the query
    const [rows] = await connection.execute(selectQuery, [userId]);

    if (rows.length === 0) {
      // If no settings are found, return a structure with default/N/A values
      console.log(
        `[DB] No control settings found for User ${userId}. Returning defaults.`
      );
      return {
        fanSpeed: "0",
        ledState: "false",
        timeInterval: "10",
        tempThreshold: "35",
        humiThreshold: "80",
        so2Threshold: "20",
        pm25Threshold: "25",
        pm10Threshold: "50",
      };
    }

    const settings = rows[0];
    const initialState = {};

    // 3. Process data into the desired string format (similar to the old ThingsBoard output)
    Object.entries(settings).forEach(([key, value]) => {
      // Ensure the value is converted to a string format for frontend compatibility
      initialState[key] =
        value !== null && value !== undefined ? String(value) : "N/A";
    });

    console.log("[DB] Latest control attributes received.");
    return initialState;
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to fetch device control for User ${userId}:`,
      error
    );
    // Throw the error so the controller can handle the failure (e.g., return 500)
    throw error;
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
};

module.exports = {
  updateControlDevice,
  getLatestControlDevice,
};
