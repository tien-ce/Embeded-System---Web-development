// routes/api.js

const express = require("express");
const router = express.Router();
const {
  getSensor1Data,
  getControlDevice,
  setControlDevice,
  signIn,
} = require("../controllers/api_controller");

// Client will call this URL: /api/sensors/data
router.get("/sensors/data", getSensor1Data);
router.get("/device/getControl", getControlDevice);
router.post("/device/setControl", setControlDevice);
router.post("/signin", signIn);
module.exports = router;
