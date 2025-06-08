const express = require("express");
const router = express.Router();

const establishmentRouter = require("./establishment");
const ownerRouter = require("./owner");
const costRouter = require("./costRouter");
const budgetRouter = require("./budgetRouter");
const productsRouter = require("./productsRouter");
const leadRouter = require("./LeadsRouter");
const aiRouter = require("./aiRouter");
const loginOwner = require("./authRouter");
const serviceRouter = require("./servicesRouter");
const appointmentsRouter = require("./appointmenteRouter");
const availabilityRouter = require("./availabilityRouter");
const authMiddleware = require("../authMiddleware/auth");

router.use("/services", authMiddleware, serviceRouter);
router.use("/auth", loginOwner);
router.use("/establishment", authMiddleware, establishmentRouter);
router.use("/owner", ownerRouter);
router.use("/cost", costRouter);
router.use("/ia", aiRouter);
router.use("/lead", leadRouter);
router.use("/products", productsRouter);
router.use("/budget", budgetRouter);
router.use("/appointments", appointmentsRouter);
router.use("/availability", availabilityRouter);
module.exports = router;
