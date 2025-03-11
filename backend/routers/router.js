const express = require('express');
const router = express.Router();

const establishmentRouter = require('./establishment');
const ownerRouter = require('./owner');
const loginOwner = require('./authRouter');
const serviceRouter = require('./servicesRouter');
const appointmentsRouter = require('./appointmenteRouter');
const authMiddleware = require('../authMiddleware/auth');

router.use("/services", authMiddleware, serviceRouter);
router.use("/auth", loginOwner); 
router.use("/establishment", authMiddleware, establishmentRouter);
router.use("/owner", ownerRouter);
router.use("/appointments",appointmentsRouter)

module.exports = router;
