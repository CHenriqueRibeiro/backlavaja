const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const appointmentController = require("../controllers/appointmenteController");

router.post(
  "/appointments",
  upload.fields([{ name: "fotos" }]),
  appointmentController.bookAppointment
);

router.put(
  "/appointments/:id/photos",
  upload.fields([{ name: "fotos" }]),
  appointmentController.updateAppointmentPhotos
);

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
