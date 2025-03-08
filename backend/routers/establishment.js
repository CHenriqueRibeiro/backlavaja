const express = require('express');
const router = express.Router();
const establishmentController = require('../controllers/establishmentController');

router.post('/create', establishmentController.createEstablishment);

module.exports = router;
