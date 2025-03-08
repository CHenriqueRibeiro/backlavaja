const express = require('express');
const router = express.Router();
const { loginOwner } = require('../controllers/loginController');

router.post('/login', loginOwner);

module.exports = router;
