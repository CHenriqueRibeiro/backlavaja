// backend/routers/webhookRouter.js
const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
router.post("/webhook/evolution", webhookController.handleConnectionStatus);

module.exports = router;
