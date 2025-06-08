const express = require("express");
const router = express.Router();
const leadController = require("../controllers/leadController");

router.post("/lead", leadController.createLead);

module.exports = router;
