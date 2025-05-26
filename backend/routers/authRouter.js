const express = require("express");
const router = express.Router();
const { loginOwner, logoutOwner } = require("../controllers/loginController");

router.post("/login", loginOwner);
router.post("/logout", logoutOwner);
module.exports = router;
