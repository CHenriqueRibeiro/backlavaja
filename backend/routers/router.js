const express = require('express');
const router = express.Router();

const establishmentRouter = require('./establishment');
const ownerRouter = require('./owner');
const loginOwner = require('./authRouter');
const serviceRouter = require('./servicesRouter');

router.use('/services', serviceRouter); 
router.use('/auth', loginOwner);
router.use('/establishment', establishmentRouter);
router.use("/owner", ownerRouter);

module.exports = router;
