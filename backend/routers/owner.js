const router = require('express').Router();
const ownerController = require('../controllers/ownerController');
const establishmentController = require('../controllers/establishmentController');
const authMiddleware = require('../authMiddleware/auth');

router.post('/register', ownerController.registerOwner);

router.post('/create-establishment', authMiddleware, establishmentController.createEstablishment);

module.exports = router;
