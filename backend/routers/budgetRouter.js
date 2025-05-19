const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const upload = require("../config/upload");

router.post("/budget", upload.single("file"), budgetController.createBudget);
// Excluir orçamento
router.delete(
  "/budget/:establishmentId/:budgetId",
  budgetController.deleteBudget
);

module.exports = router;
