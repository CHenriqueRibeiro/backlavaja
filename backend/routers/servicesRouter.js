const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const authenticateToken = require("../authMiddleware/auth");

router.get(
  "/establishment/:establishmentId/service",
  serviceController.getServicesByEstablishment
);
router.get(
  "/establishment/:establishmentId",
  serviceController.getServicesByEstablishment
);
router.post(
  "/establishment/:establishmentId/service",
  authenticateToken,
  serviceController.createService
);
router.put(
  "/establishment/:establishmentId/service/:serviceId",
  authenticateToken,
  serviceController.updateService
);
// routes/service.routes.js
router.delete(
  "/establishment/:establishmentId/service/:serviceId",
  authenticateToken,
  serviceController.deleteService
);

module.exports = router;
