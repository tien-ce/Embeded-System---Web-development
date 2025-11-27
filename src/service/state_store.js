// state_store.js

/**
 * Global State Management for the latest sensor data received via MQTT.
 * This acts as the in-memory Model layer.
 */

const pool = require("../config/database");
const { json } = require("express");

/**
 * Enforces a maximum limit (e.g., 10 records) on the Telemetry table
 * for a specific user by deleting the oldest records.
 * @param {number} userId - The ID of the user whose data should be pruned.
 */
const pruneOldTelemetry = async (userId) => {
  let connection;
  try {
    // NOTE: We don't need to get a new connection if called immediately after insert,
    // but we assume a new connection for safety here.
    connection = await pool.getConnection();

    // SQL to delete records older than the 10 newest ones
    const deleteQuery = `
            DELETE FROM Telemetry
            WHERE user_id = ? 
                AND id NOT IN (
                    SELECT id
                    FROM (
                        SELECT id 
                        FROM Telemetry
                        WHERE user_id = ?
                        ORDER BY time_stamp DESC
                        LIMIT 10 
                    ) AS T_alias 
                );
        `;

    const [result] = await connection.execute(deleteQuery, [userId, userId]);

    if (result.affectedRows > 0) {
      console.log(
        `[DB Pruning] Deleted ${result.affectedRows} old records for User ${userId}.`
      );
    }
  } catch (error) {
    console.error(`[DB ERROR] Failed to prune data for User ${userId}:`, error);
    // Do not re-throw error, as pruning failure should not stop the main INSERT operation.
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Updates the global state with new sensor values received from the MQTT client.
 * @param {object} newData - The data received from the MQTT client (e.g., {temperature: 30.5}).
 */
const updateData = async (newData, userId) => {
  let connection;
  try {
    // 1. Get a connection from the pool
    connection = await pool.getConnection();

    // 2. Generate current Unix Timestamp (in seconds)
    const currentTime = Math.floor(Date.now() / 1000);

    // 3. Define the INSERT SQL statement
    const insertQuery = `
      INSERT INTO Telemetry 
      (user_id, time_stamp, temperature, humidity, SO2, PM10, PM25) 
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    // 4. Prepare values for the query (using null for missing data)
    const values = [
      userId,
      currentTime,
      newData.temperature || null,
      newData.humidity || null,
      newData.SO2 || null,
      newData.PM10 || null,
      newData.PM25 || null,
    ];

    // 5. Execute the query
    const [result] = await connection.execute(insertQuery, values);

    console.log(
      `[DB] Telemetry inserted for User ${userId}. ID: ${result.insertId}`
    );

    await pruneOldTelemetry(userId, connection);
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to insert telemetry for User ${userId}:`,
      error
    );
    // Re-throw the error so the calling function can handle the database failure.
    throw error;
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
};

/**
 * Returns the latest state for HTTP controllers (API endpoints) from the database,
 * calculated status (ONLINE/OFFLINE), and the latest sensor data.
 * @param {number} userId - The ID of the user whose data is being requested.
 * @returns {object} An object containing the latest sensor data and calculated status.
 */
const getLatestData = async (userId) => {
  let connection;
  // Initialize return object with default OFFLINE status and N/A values
  let latestData = {
    temperature: "N/A",
    humidity: "N/A",
    SO2: "N/A",
    PM25: "N/A",
    PM10: "N/A",
    lastUpdated: "N/A",
    status: "OFFLINE", // Default to OFFLINE
    intervalTime: 10, // Assuming default interval time for status calculation
  };

  try {
    // 1. Get a connection from the pool
    connection = await pool.getConnection();

    // 2. Define the SELECT SQL query to get the single latest record for the user
    const selectQuery = `
      SELECT 
          time_stamp, temperature, humidity, SO2, PM25, PM10 
      FROM 
          Telemetry 
      WHERE 
          user_id = ? 
      ORDER BY 
          time_stamp DESC 
      LIMIT 1;
    `;

    // 3. Execute the query
    const [rows] = await connection.execute(selectQuery, [userId]);

    if (rows.length > 0) {
      const dbData = rows[0];
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

      // Assume default interval is 10s or fetch actual interval from a config table
      const intervalTimeSeconds = latestData.intervalTime;

      const lastUpdatedTimestamp = parseInt(dbData.time_stamp);

      // 4. Calculate Status Logic (similar to your check_status function logic)
      if (currentTime - lastUpdatedTimestamp <= intervalTimeSeconds * 1.2) {
        // If the current time is within 120% of the expected interval, set status to ONLINE
        latestData.status = "ONLINE";
      } else {
        latestData.status = "OFFLINE";
      }

      // 5. Assign fetched data to the return object
      latestData.temperature = dbData.temperature;
      latestData.humidity = dbData.humidity;
      latestData.SO2 = dbData.SO2;
      latestData.PM25 = dbData.PM25;
      latestData.PM10 = dbData.PM10;
      latestData.lastUpdated = dbData.time_stamp; // Use the raw timestamp
    }

    // 6. Return the combined object (Sensor Data + Calculated Status)
    return latestData;
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to fetch latest data for User ${userId}:`,
      error
    );
    // On failure, return the default OFFLINE state and N/A values
    return latestData;
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
};

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
  getLatestData,
  checkSignIn,
};
