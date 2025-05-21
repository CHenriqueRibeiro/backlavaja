const express = require("express");
const router = express.Router();
const iaController = require("../controllers/iaController");
//const authMiddleware = require("../middleware/auth");

router.get("/prever-consumo", iaController.preverConsumo);

module.exports = router;
