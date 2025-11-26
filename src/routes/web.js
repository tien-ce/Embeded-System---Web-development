// Define a route for GET requests to the root URL
const express = require("express");
const {
  getHomepage,
  getAbc,
  getDatas,
  getTempDashboard,
  getSettings,
  getAirDashboard,
  getLogin,
} = require("../controllers/home_controller");
const router = express.Router();

// route.method("/route",hadnle)

router.get("/", getHomepage);
router.get("/abc", getAbc);
router.get("/data", getDatas);
router.get("/temp", getTempDashboard);
router.get("/air", getAirDashboard);
router.get("/settings", getSettings);
router.get("/login", getLogin);
module.exports = router; // Export default
