// mqtt_client.js

const mqtt = require("mqtt");
const pool = require("../config/database");
require("dotenv").config();
// Import State Store (This path assumes state_store.js is in the same directory)
const stateStore = require("./state_store");
// 1. THINGSBOARD CONNECTION CONFIGURATION
const THINGSBOARD_HOST = process.env.THINGSBOARD_HOST;
// Topic used to receive Attribute Updates or Control Commands from the server/dashboard
const DEVICE_ACCESS_TOKENS_LIST = process.env.DEVICE_ACCESS_TOKENS_LIST || "";
const TOKENS_ARRAY = DEVICE_ACCESS_TOKENS_LIST.split(",");
const ATTRIBUTES_TOPIC = "v1/devices/me/attributes";
const clients = [];
/**
 * Sets up event handlers and subscriptions for a single MQTT client.
 * @param {object} clientInstance - The MQTT client instance.
 * @param {string} token - The access token used for this connection.
 */
function setupClientHandlers(clientInstance, token) {
  clientInstance.on("connect", function () {
    console.log(
      `[MQTT] Client for token ${token.substring(0, 5)}... connected.`
    );
    clientInstance.subscribe(ATTRIBUTES_TOPIC, function (err) {
      if (!err) {
        console.log(
          `[MQTT] Subscribed attributes for ${token.substring(0, 5)}...`
        );
      } else {
        console.error(
          `[MQTT] Subscription error for ${token.substring(0, 5)}...:`,
          err
        );
      }
    });
  });

  clientInstance.on("message", async function (topic, message) {
    const payload = await message.toString();
    console.log(
      `>>>> Test payload from core IoT (${token.substring(0, 5)}...):`,
      payload
    );
    try {
      const data = JSON.parse(payload);
      connection = await pool.getConnection();
      //Asynchronously query the database to find the userId associated with the token
      const [rows] = await connection.query(
        "SELECT id FROM users WHERE user_access_token = ?",
        [token]
      );

      if (rows.length === 0) {
        // If the token is present but invalid/expired (not found in DB)
        console.error(
          `[MQTT] ERROR: Invalid access token '${token.substring(
            0,
            5
          )}...' received.`
        );
        return;
      }

      // 4. Attach the found userId to the request object
      // This is the key step for internal server communication
      const userId = rows[0].id;
      stateStore.updateData(data, userId);
    } catch (e) {
      console.error(
        `[MQTT] Error parsing payload for ${token.substring(0, 5)}...:`,
        e
      );
    }
  });
  clientInstance.on("close", function () {
    console.log(`[MQTT] Close connection ${token.substring(0, 5)}...:`);
  });
  clientInstance.on("error", function (err) {
    console.error(
      `MQTT connection error for ${token.substring(0, 5)}...:`,
      err
    );
  });
}

if (TOKENS_ARRAY.length === 0 || TOKENS_ARRAY[0].length === 0) {
  console.warn(
    "[MQTT WARNING] No device access tokens found. Skipping MQTT connections."
  );
} else {
  console.log(">>> Token Array", TOKENS_ARRAY, "lenght", TOKENS_ARRAY.length);
  TOKENS_ARRAY.forEach((token) => {
    token = token.trim(); // Remove the redudant spacace
    if (token) {
      const options = {
        username: token,
      };
      console.log(
        `[MQTT] Connecting client for token: ${token.substring(0, 5)}...`
      );
      const newClient = mqtt.connect(`mqtt://${THINGSBOARD_HOST}`, options);
      setupClientHandlers(newClient, token);

      clients.push(newClient);
    }
  });
}
