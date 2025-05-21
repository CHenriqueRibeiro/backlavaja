const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productController");

router.post(
  "/establishments/:establishmentId/products",
  productsController.createProduct
);

router.get(
  "/establishments/:establishmentId/products",
  productsController.getProductsByEstablishment
);

module.exports = router;
module.exports = router;
