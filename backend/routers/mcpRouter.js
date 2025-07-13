const express = require("express");
const router = express.Router();
const mcpController = require("../controllers/mcpController");

router.post("/step", mcpController.mcpStepHandler);
router.get("/session/:phone", mcpController.getSessionStep); // <-- nova rota GET

module.exports = router;
