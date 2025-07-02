const express = require("express");
const router = express.Router();
const evolutionController = require("../controllers/evolutionController");

router.post("/webhook/receive", evolutionController.webhookReceiver);
router.post("/instance/create", evolutionController.createInstance);
router.post("/instance/consult", evolutionController.connectInstance);

module.exports = router;
