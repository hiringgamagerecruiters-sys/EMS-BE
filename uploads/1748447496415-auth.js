const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const authController = require("../controllers/authController");

router.post("/register", upload.single("profileImage"), authController.register);
router.post("/login", authController.login);

module.exports = router;
