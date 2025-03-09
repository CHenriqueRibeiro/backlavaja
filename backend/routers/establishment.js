const express = require('express');
const router = express.Router();
const establishmentController = require('../controllers/establishmentController');
const verifyToken = require('../authMiddleware/auth');

router.post('/create', establishmentController.createEstablishment);

module.exports = router;
