const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const upload = require("../config/upload");

router.post("/budget", upload.single("file"), budgetController.createBudget);
router.delete(
  "/budget/:establishmentId/:budgetId",
  budgetController.deleteBudget
);
router.get("/budget/public/:budgetId", budgetController.getPublicBudget);
router.patch(
  "/budget/sign/:budgetId",
  upload.single("file"),
  budgetController.signBudget
);
module.exports = router;
