const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authenticateToken = require('../authMiddleware/auth');


router.get('/establishment/:establishmentId', serviceController.getServicesByEstablishment);
router.post('/establishment/:establishmentId/service', authenticateToken, serviceController.createService);
router.put('/service/:serviceId', serviceController.updateService);
router.delete('/service/:serviceId', serviceController.deleteService);

module.exports = router;
