const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmenteController");

router.post("/appointments", appointmentController.bookAppointment);
//router.get("/appointments", appointmentController.getAppointments);
router.get(
  "/appointments/:id",
  appointmentController.getAppointmentsByEstablishment
);
router.patch(
  "/appointments/:id",
  appointmentController.updateAppointmentStatus
);
router.put("/appointments/:id", appointmentController.updateAppointment);
module.exports = router;
