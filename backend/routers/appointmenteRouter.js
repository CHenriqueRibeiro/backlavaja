const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmenteController");

router.post("/appointments", appointmentController.bookAppointment);
router.get(
  "/appointments/:id",
  appointmentController.getAppointmentsByEstablishment
);
router.get(
  "/appointments/report/dashboard",
  appointmentController.getDashboardReport
);
router.patch(
  "/appointments/:id",
  appointmentController.updateAppointmentStatus
);
router.put("/appointments/:id", appointmentController.updateAppointment);
router.delete("/appointments/:id", appointmentController.deleteAppointment);
module.exports = router;
