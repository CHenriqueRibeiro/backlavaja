const router = require('express').Router();
const ownerController = require('../controllers/ownerController');
const establishmentController = require('../controllers/establishmentController');
const authMiddleware = require('../authMiddleware/auth');

// Rota para registro do dono
router.post('/register', ownerController.registerOwner);

// Rota para criação do estabelecimento
router.post('/create-establishment', authMiddleware, establishmentController.createEstablishment);

module.exports = router;
