const router = require('express').Router();
const ownerController = require('../controllers/ownerController');

router.post('/register', ownerController.registerOwner);

module.exports = router;
