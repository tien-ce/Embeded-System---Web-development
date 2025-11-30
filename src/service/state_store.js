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
 * Saves a new alert log entry to the AlertsLog table.
 * @param {number} userId - The ID of the user.
 * @param {string} type - The alert type (e.g., 'temp', 'pm25').
 * @param {string} message - The detailed alert message.
 */
/**
 * Saves a new alert log entry to the AlertsLog table.
 * If an UNREAD alert of the same type and user exists, it updates the old one (UPSERT logic).
 * * @param {number} userId - The ID of the user.
 * @param {string} type - The alert type (e.g., 'temp', 'pm25').
 * @param {string} message - The detailed alert message.
 */
const saveNewAlert = async (userId, type, message) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const currentTime = Math.floor(Date.now() / 1000);

    // --- BƯỚC 1: KIỂM TRA LOG CHƯA ĐỌC CÙNG LOẠI ---
    const selectQuery = `
      SELECT log_id 
      FROM AlertsLog 
      WHERE user_id = ? AND type = ? AND is_read = FALSE 
      LIMIT 1;
    `;
    const [existingAlerts] = await connection.execute(selectQuery, [
      userId,
      type,
    ]);

    if (existingAlerts.length > 0) {
      const existingLogId = existingAlerts[0].log_id;

      const updateQuery = `
        UPDATE AlertsLog 
        SET message = ?, time_stamp = ?, is_read = FALSE 
        WHERE log_id = ?;
      `;
      // We update the message, reset is_read to FALSE, and update the timestamp
      await connection.execute(updateQuery, [
        message,
        currentTime,
        existingLogId,
      ]);

      console.log(
        `[DB ALERT] Updated existing UNREAD alert ${existingLogId} for User ${userId}: ${type}`
      );
    } else {
      const insertQuery = `
        INSERT INTO AlertsLog (user_id, type, message, is_read, time_stamp)
        VALUES (?, ?, ?, FALSE, ?);
      `;

      await connection.execute(insertQuery, [
        userId,
        type,
        message,
        currentTime,
      ]);

      console.log(`[DB ALERT] Created NEW alert for User ${userId}: ${type}`);
    }
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to save/update alert for User ${userId}:`,
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
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
      newData.no2 || null,
      newData.pm10 || null,
      newData.pm25 || null,
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
const getThresholds = async (userId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    // NOTE: We select all control fields, assuming they include thresholds.
    const [rows] = await connection.query(
      "SELECT * FROM DeviceControl WHERE user_id = ?",
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to fetch thresholds for User ${userId}:`,
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Retrieves the count of unread alerts for a specific user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<number>} The count of unread alerts.
 */
const getUnreadAlertCount = async (userId) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Query: COUNT alerts where user_id matches and is_read is FALSE
    const countQuery = `
            SELECT COUNT(*) AS unreadCount 
            FROM AlertsLog 
            WHERE user_id = ? AND is_read = FALSE;
        `;

    const [rows] = await connection.execute(countQuery, [userId]);

    // Return the count, defaulting to 0 if the query fails/returns nothing
    return rows[0].unreadCount || 0;
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to get unread alert count for User ${userId}:`,
      error
    );
    // Throwing the error is safer for API controllers
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Retrieves all alerts (read and unread) for display on the log page.
 * NOTE: The frontend will handle filtering/styling based on the 'is_read' flag.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<object>>} A list of recent alerts.
 */
const getAllAlerts = async (userId) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Query: Select all alerts, ordered by timestamp (newest first).
    // NOTE: If the table gets very large, consider adding a LIMIT here.
    const selectQuery = `
            SELECT log_id, type, message, is_read, time_stamp 
            FROM AlertsLog 
            WHERE user_id = ?
            ORDER BY time_stamp DESC;
        `;

    const [rows] = await connection.execute(selectQuery, [userId]);

    return rows;
  } catch (error) {
    console.error(
      `[DB ERROR] Failed to fetch alerts log for User ${userId}:`,
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Marks all alerts for a user as read and prunes (deletes) old read alerts,
 * keeping only the 10 most recent read alerts plus any unread alerts.
 * @param {number} userId - The ID of the user.
 */
const markAllAsReadAndPrune = async (userId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Start a transaction for safety

    // 1. UPDATE: Mark ALL existing alerts for the user as READ (is_read = TRUE)
    const updateQuery = `
            UPDATE AlertsLog 
            SET is_read = TRUE 
            WHERE user_id = ? AND is_read = FALSE;
        `;
    await connection.execute(updateQuery, [userId]);

    // 2. DELETE (Pruning): Delete read alerts, keeping only the 10 newest ones.
    const pruneQuery = `
            DELETE FROM AlertsLog
            WHERE user_id = ? AND is_read = TRUE 
                AND log_id NOT IN (
                    SELECT log_id FROM (
                        SELECT log_id
                        FROM AlertsLog
                        WHERE user_id = ? AND is_read = TRUE
                        ORDER BY time_stamp DESC
                        LIMIT 10 
                    ) AS T_alias 
                );
        `;
    const [result] = await connection.execute(pruneQuery, [userId, userId]);

    console.log(
      `[DB PRUNE] User ${userId}: Marked all as read. Deleted ${result.affectedRows} old alerts.`
    );

    await connection.commit(); // Commit the transaction
  } catch (error) {
    await connection.rollback(); // Rollback if any part failed
    console.error(
      `[DB ERROR] Transaction failed during mark read/pruning for User ${userId}:`,
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  updateData,
  getLatestData,
  checkSignIn,
  getThresholds,
  getUnreadAlertCount,
  getAllAlerts,
  markAllAsReadAndPrune,
  saveNewAlert,
};
