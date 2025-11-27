// routes/api.js

const express = require("express");
const router = express.Router();
const tokenToId = require("../middle_wares/veryfy_accessToken");
const {
  getSensor1Data,
  getControlDevice,
  setControlDevice,
  signIn,
} = require("../controllers/api_controller");

// Client will call this URL: /api/sensors/data
router.get("/sensors/data", tokenToId, getSensor1Data);
router.get("/device/getControl", tokenToId, getControlDevice);
router.post("/device/setControl", tokenToId, setControlDevice);
router.post("/signin", signIn);
module.exports = router;
