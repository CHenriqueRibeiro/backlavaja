const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/payment", paymentController.createPayment);
router.post("/webhook", paymentController.webhook);
router.get("/status/:paymentId", paymentController.checkPaymentStatus);

module.exports = router;
