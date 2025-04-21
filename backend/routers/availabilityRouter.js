const express = require("express");
const router = express.Router();
const {
  getAvailabilityByDate,
} = require("../controllers/availabilityController");

router.get("/:id", getAvailabilityByDate);

module.exports = router;
