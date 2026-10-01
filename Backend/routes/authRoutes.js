const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Public Auth Endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/login-key", authController.loginWithKey);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Authenticated Circle Endpoints
router.post("/join-circle", authenticateToken, authController.joinCircle);
router.post("/create-circle", authenticateToken, authController.createCircle);
router.post("/switch-circle", authenticateToken, authController.switchCircle);
router.get("/my-circles", authenticateToken, authController.getMyCircles);

module.exports = router;