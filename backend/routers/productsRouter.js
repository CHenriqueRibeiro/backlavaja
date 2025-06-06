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
router.put("/:productId", productsController.updateProduct);

router.delete("/:productId", productsController.deleteProduct);
router.patch("/products/:productId/repor", productsController.reporEstoque);

module.exports = router;
