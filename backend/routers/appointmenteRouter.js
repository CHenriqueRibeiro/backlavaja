const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmenteController");

router.post("/appointments", appointmentController.bookAppointment);
//router.get("/appointments", appointmentController.getAppointments);
router.get("/appointments/:id", appointmentController.getAppointmentsByEstablishment)
module.exports = router;
