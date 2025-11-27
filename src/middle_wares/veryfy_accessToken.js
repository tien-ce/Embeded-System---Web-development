const pool = require("../config/database");
// Example: authMiddleware.js

/**
 * Middleware function to convert the User Access Token into the userId.
 * This is an ASYNCHRONOUS operation because it involves a database query.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback function to move to the next middleware/controller.
 */
const tokenToId = async (req, res, next) => {
  // 1. Synchronously extract the Bearer Token from the 'Authorization' header
  const authHeader = req.headers["authorization"];
  // The token is the second part of "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // If the token is missing, reject the request (Unauthorized)
    return res
      .status(401)
      .json({ error: "Unauthorized: Access token is missing." });
  }

  let connection;
  try {
    // 2. Asynchronously get a database connection
    connection = await pool.getConnection();

    // 3. Asynchronously query the database to find the userId associated with the token
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE user_access_token = ?",
      [token]
    );

    if (rows.length === 0) {
      // If the token is present but invalid/expired (not found in DB)
      return res
        .status(403)
        .json({ error: "Forbidden: Invalid access token." });
    }

    // 4. Attach the found userId to the request object
    // This is the key step for internal server communication
    req.userId = rows[0].id;

    // 5. Proceed to the next handler (the Controller)
    next();
  } catch (error) {
    // Catch any database or connection errors
    console.error("Database Error during token lookup:", error);
    return res.status(500).json({ error: "Internal server error." });
  } finally {
    if (connection) {
      connection.release(); // Always release the connection
    }
  }
};

module.exports = tokenToId; // Export the function
