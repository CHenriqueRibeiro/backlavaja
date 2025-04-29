const express = require("express");
const router = express.Router();
const establishmentController = require("../controllers/establishmentController");

router.post("/create", establishmentController.createEstablishment);
router.get("/owner/:ownerId", establishmentController.getEstablishmentsByOwner);
router.put(
  "/establishment/:establishmentId",
  establishmentController.updateEstablishment
);
router.delete(
  "/establishment/:establishmentId",
  establishmentController.deleteEstablishment
);
module.exports = router;
