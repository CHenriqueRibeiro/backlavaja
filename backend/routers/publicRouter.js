const express = require('express');
const router = express.Router();
const PublicAppointmentController = require('../controllers/publicAppointmentController');

router.get('/establishment/:establishmentId', PublicAppointmentController.getPublicEstablishment);

router.get('/establishment/:establishmentId/service/:serviceId/slots', PublicAppointmentController.getPublicServiceSlots);

router.post('/establishment/:establishmentId/service/:serviceId/appointments', PublicAppointmentController.bookPublicAppointment);

module.exports = router;
