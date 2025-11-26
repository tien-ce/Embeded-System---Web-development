// Service Layer: control_service.js

const mqttClient = require('./mqtt_sub'); 
const CONTROL_TOPIC = 'v1/devices/me/attributes';

/**
 * Executes the actual MQTT PUSH to ThingsBoard.
 * @param {string} key - The attribute key (e.g., 'ledState').
 * @param {any} value - The attribute value (e.g., true, 50, 10).
 * @returns {Promise<boolean>} True if the publish was successful.
 */
const updateControlDevice = (key, value) => {
    return new Promise((resolve) => {
        // ThingsBoard expects JSON payload: { "ledState": true }
        const payload = JSON.stringify({ [key]: value });

        if (!mqttClient.connected) {
            console.error("[CONTROL SERVICE] MQTT client is not connected. Cannot send.");
            return resolve(false);
        }

        mqttClient.publish(CONTROL_TOPIC, payload, (err) => {
            if (err) {
                console.error(`[CONTROL SERVICE] Failed to PUBLISH ${key}:`, err);
                return resolve(false);
            }
            console.log(`[CONTROL SERVICE] Successfully PUBLISHED: ${key} = ${value}`);
            resolve(true); // Sucess
        });
    });
};

module.exports = {
    updateControlDevice
};