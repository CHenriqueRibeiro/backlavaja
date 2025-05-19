const express = require("express");
const router = express.Router();
const costController = require("../controllers/costController");

router.post("/", costController.createCost);
router.put("/cost/:costId", costController.updateCost);
router.delete("/cost/:costId/:establishmentId", costController.deleteCost);

module.exports = router;
