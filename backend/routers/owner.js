const router = require("express").Router();
const ownerController = require("../controllers/ownerController");

router.post("/register", ownerController.registerOwner);

router.post("/reset-password/:ownerId", ownerController.resetPassword);

router.post("/forgot-password", ownerController.forgotPassword);

router.post("/reset-password/token/:token", ownerController.resetPasswordToken);

module.exports = router;
